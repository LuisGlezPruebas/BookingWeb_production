import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getAvailableYears } from "@/lib/utils/date-utils";
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { getDateStatus } from "@/lib/utils/reservation-utils";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { CalendarIcon, Pencil, Trash2 } from "lucide-react";
import { formatDate, toISODateString, calculateNights } from "@/lib/utils/date-utils";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { SortableTableHeader, SortableColumn, SortDirection } from '@/components/ui/sortable-table-header';

// Schema para validar el formulario de edición
const reservationSchema = z.object({
  startDate: z.date({
    required_error: "Por favor selecciona la fecha de entrada",
  }),
  endDate: z.date({
    required_error: "Por favor selecciona la fecha de salida",
  }),
  numberOfGuests: z.number({
    required_error: "Por favor ingresa el número de personas",
  }).int().min(1, "Mínimo 1 persona").max(10, "Máximo 10 personas"),
  notes: z.string().optional(),
}).refine(data => {
  return data.startDate < data.endDate;
}, {
  message: "La fecha de salida debe ser posterior a la fecha de entrada",
  path: ["endDate"],
});

type ReservationFormValues = z.infer<typeof reservationSchema>;

export default function MyReservations() {
  const [year, setYear] = useState<string>("2025");
  const [userId, setUserId] = useState<number | null>(null);
  const [username, setUsername] = useState<string>("");
  
  // Estados para los diálogos
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<any>(null);
  
  // Estado para el ordenamiento de la tabla
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Obtener el userId y el username del localStorage al cargar el componente
  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    const storedUsername = localStorage.getItem("username");
    if (storedUserId) {
      setUserId(parseInt(storedUserId));
    }
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);
  
  // Formulario para editar reservas
  const form = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      startDate: new Date(),
      endDate: new Date(),
      numberOfGuests: 2,
      notes: ""
    }
  });
  
  // Query para obtener las reservas del usuario
  const { data: userReservations, isLoading } = useQuery({
    queryKey: [`/api/user/reservations/${year}`, userId],
    // Solo activar la consulta cuando tengamos un userId válido
    enabled: userId !== null,
    // Asegurarse de que se pasa el parámetro userId en la URL
    queryFn: async () => {
      const response = await fetch(`/api/user/reservations/${year}?userId=${userId}`);
      if (!response.ok) {
        throw new Error("Error al obtener las reservas");
      }
      return response.json();
    }
  });
  
  // Query para obtener los datos del calendario (fechas disponibles/ocupadas)
  const { data: calendarData } = useQuery({
    queryKey: [`/api/user/calendar/${year}`],
    enabled: true,
  });
  
  // Mutación para actualizar una reserva
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return fetch(`/api/user/reservations/${selectedReservation?.id}?userId=${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      }).then(async (res) => {
        if (!res.ok) {
          const error = await res.text();
          throw new Error(error || "Error al modificar la reserva");
        }
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/reservations/${year}`, userId] });
      toast({
        title: "Reserva modificada",
        description: "Tu solicitud de modificación ha sido enviada y está pendiente de aprobación."
      });
      setEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error al modificar la reserva",
        description: error.message || "No se pudo modificar la reserva. Inténtalo de nuevo.",
        variant: "destructive"
      });
    }
  });
  
  // Mutación para cancelar una reserva
  const cancelMutation = useMutation({
    mutationFn: async () => {
      return fetch(`/api/user/reservations/${selectedReservation?.id}?userId=${userId}`, {
        method: "DELETE",
        credentials: "include"
      }).then(async (res) => {
        if (!res.ok) {
          const error = await res.text();
          throw new Error(error || "Error al cancelar la reserva");
        }
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/reservations/${year}`, userId] });
      toast({
        title: "Reserva cancelada",
        description: "Tu reserva ha sido cancelada correctamente."
      });
      setCancelDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error al cancelar la reserva",
        description: error.message || "No se pudo cancelar la reserva. Inténtalo de nuevo.",
        variant: "destructive"
      });
      setCancelDialogOpen(false);
    }
  });
  
  // Función para abrir el diálogo de edición
  const handleEdit = (reservation: any) => {
    setSelectedReservation(reservation);
    
    // Configurar valores iniciales del formulario
    form.reset({
      startDate: new Date(reservation.startDate),
      endDate: new Date(reservation.endDate),
      numberOfGuests: reservation.numberOfGuests,
      notes: reservation.notes || ""
    });
    
    setEditDialogOpen(true);
  };
  
  // Función para abrir el diálogo de cancelación
  const handleCancelRequest = (reservation: any) => {
    setSelectedReservation(reservation);
    setCancelDialogOpen(true);
  };
  
  // Función para enviar el formulario de edición
  const onSubmitEdit = (data: ReservationFormValues) => {
    // Transformar los datos para la API
    const updateData = {
      startDate: toISODateString(data.startDate),
      endDate: toISODateString(data.endDate),
      numberOfGuests: data.numberOfGuests,
      notes: data.notes
    };
    
    updateMutation.mutate(updateData);
  };
  
  // Función para confirmar la cancelación
  const confirmCancel = () => {
    cancelMutation.mutate();
  };
  
  // Función para calcular noches entre fechas
  const getNights = (startDate: string, endDate: string) => {
    return Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / 
      (1000 * 60 * 60 * 24)
    );
  };
  
  // Verificar si una reserva puede ser editada o cancelada (no permite cambios si la fecha de entrada ha pasado)
  const canEditReservation = (startDate: string) => {
    const today = new Date();
    const reservationStartDate = new Date(startDate);
    return reservationStartDate > today;
  };
  
  // Manejador para la ordenación
  const handleSort = (key: string) => {
    const isAsc = sortKey === key && sortDirection === 'asc';
    setSortKey(key);
    setSortDirection(isAsc ? 'desc' : 'asc');
  };

  // Definición de columnas para la tabla
  const columns: SortableColumn[] = [
    { key: 'startDate', label: 'Fecha Entrada' },
    { key: 'endDate', label: 'Fecha Salida' },
    { key: 'nights', label: 'Noches' },
    { key: 'numberOfGuests', label: 'Personas' },
    { key: 'notes', label: 'Notas' },
    { key: 'status', label: 'Estado' },
  ];

  // Ordenar las reservas según los criterios seleccionados
  const sortedReservations = useMemo(() => {
    // Asegurarnos de que userReservations es un array
    const safeReservations = Array.isArray(userReservations) ? userReservations : [];
    
    if (!sortKey || !sortDirection) return safeReservations;
    
    return [...safeReservations].sort((a, b) => {
      // Ordenar por noches
      if (sortKey === 'nights') {
        const aNights = getNights(a.startDate, a.endDate);
        const bNights = getNights(b.startDate, b.endDate);
        return sortDirection === 'asc' ? aNights - bNights : bNights - aNights;
      }
      
      // Ordenar por fechas
      if (sortKey === 'startDate' || sortKey === 'endDate') {
        const aDate = new Date(a[sortKey]).getTime();
        const bDate = new Date(b[sortKey]).getTime();
        return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
      }
      
      // Ordenar strings y números
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      return sortDirection === 'asc' 
        ? (aValue - bValue) 
        : (bValue - aValue);
    });
  }, [userReservations, sortKey, sortDirection, getNights]);

  // No necesitamos la variable 'reservations' porque ahora usamos sortedReservations directamente

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 flex-grow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-medium text-foreground">Mis Reservas</h2>
        <div className="flex items-center">
          <label htmlFor="my-reservations-year" className="mr-2 text-muted-foreground">
            Año:
          </label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {getAvailableYears().map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="bg-card shadow-sm">
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHeader
                    column={columns[0]}
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHeader
                    column={columns[1]}
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHeader
                    column={columns[2]}
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHeader
                    column={columns[3]}
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHeader
                    column={columns[4]}
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHeader
                    column={columns[5]}
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <TableHead className="text-muted-foreground">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedReservations.map((reservation: any) => (
                  <TableRow key={reservation.id}>
                    <TableCell>{formatDate(reservation.startDate)}</TableCell>
                    <TableCell>{formatDate(reservation.endDate)}</TableCell>
                    <TableCell>{getNights(reservation.startDate, reservation.endDate)}</TableCell>
                    <TableCell>{reservation.numberOfGuests}</TableCell>
                    <TableCell>{reservation.notes || '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded-full reservation-status-${
                        reservation.status === 'approved' 
                          ? 'available' 
                          : reservation.status === 'pending' || reservation.status === 'modified'
                            ? 'pending' 
                            : reservation.status === 'cancelled'
                              ? 'rejected'
                              : 'rejected'
                      }`}>
                        {reservation.status === 'approved' 
                          ? 'Aceptada' 
                          : reservation.status === 'pending' 
                            ? 'En revisión'
                            : reservation.status === 'modified'
                              ? 'Modificada (pendiente)'
                              : reservation.status === 'cancelled'
                                ? 'Cancelada'
                                : 'Rechazada'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(reservation)}
                          disabled={!canEditReservation(reservation.startDate) || 
                                  reservation.status === 'cancelled' ||
                                  reservation.status === 'rejected'}
                          title={!canEditReservation(reservation.startDate) 
                                ? "No se puede modificar una reserva que ya ha pasado" 
                                : "Modificar reserva"}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelRequest(reservation)}
                          disabled={!canEditReservation(reservation.startDate) || 
                                  reservation.status === 'cancelled' ||
                                  reservation.status === 'rejected'}
                          title={!canEditReservation(reservation.startDate) 
                                ? "No se puede cancelar una reserva que ya ha pasado" 
                                : "Cancelar reserva"}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {sortedReservations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      {isLoading 
                        ? "Cargando reservas..." 
                        : "No tienes reservas para este año"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {/* Diálogo para editar reserva */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modificar reserva</DialogTitle>
            <DialogDescription>
              Las modificaciones requieren aprobación del administrador.
              No se permiten fechas que ya están ocupadas.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitEdit)} className="space-y-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de entrada</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={
                              "w-full pl-3 text-left font-normal"
                            }
                          >
                            {field.value ? (
                              formatDate(field.value.toISOString())
                            ) : (
                              <span>Seleccionar fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => {
                            // No permitir fechas pasadas
                            if (date < new Date()) return true;
                            
                            // No permitir fechas ocupadas
                            if (calendarData && Array.isArray(calendarData)) {
                              const dateStr = toISODateString(date);
                              const dateInfo = calendarData.find(d => d.date === dateStr);
                              return dateInfo?.status === "occupied";
                            }
                            return false;
                          }}
                          initialFocus
                          className="reservation-calendar"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de salida</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={"w-full pl-3 text-left font-normal"}
                          >
                            {field.value ? (
                              formatDate(field.value.toISOString())
                            ) : (
                              <span>Seleccionar fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => {
                            // No permitir fechas anteriores o iguales a la fecha de entrada
                            const startDate = form.getValues().startDate;
                            if (date <= startDate) return true;
                            
                            // Verificar fechas ocupadas empezando desde startDate + 1
                            if (calendarData && Array.isArray(calendarData)) {
                              // Verificar si hay fechas ocupadas entre startDate y esta fecha
                              // Si hay alguna fecha ocupada entre medio, no permitir seleccionar
                              const checkDate = new Date(startDate);
                              checkDate.setDate(checkDate.getDate() + 1); // Comenzar desde el día siguiente
                              
                              while (checkDate < date) {
                                const dateStr = toISODateString(checkDate);
                                const dateInfo = calendarData.find(d => d.date === dateStr);
                                if (dateInfo?.status === "occupied") {
                                  return true; // No permitir seleccionar si hay días ocupados entre medio
                                }
                                checkDate.setDate(checkDate.getDate() + 1);
                              }
                            }
                            return false;
                          }}
                          initialFocus
                          className="reservation-calendar"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="numberOfGuests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de personas</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas adicionales</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notas o información adicional"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para confirmar cancelación */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar reserva</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres cancelar esta reserva? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmCancel} 
              className="bg-destructive hover:bg-destructive/90"
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Cancelando..." : "Confirmar cancelación"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
