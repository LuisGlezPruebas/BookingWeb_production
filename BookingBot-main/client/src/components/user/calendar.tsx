import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { getAvailableYears } from "@/lib/utils/date-utils";
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Additional validation schema for reservation form
const reservationSchema = z.object({
  startDate: z.string().min(1, "Fecha de entrada es requerida"),
  endDate: z.string().min(1, "Fecha de salida es requerida"),
  numberOfGuests: z.number().min(1, "Mínimo 1 persona").max(10, "Máximo 10 personas"),
  notes: z.string().optional(),
}).refine(data => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end > start;
}, {
  message: "La fecha de salida debe ser posterior a la fecha de entrada",
  path: ["endDate"]
});

type ReservationFormValues = z.infer<typeof reservationSchema>;

export default function Calendar() {
  const [year, setYear] = useState<string>("2025");
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [selectedStartDate, setSelectedStartDate] = useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
  const [selectionStep, setSelectionStep] = useState<"entrada" | "salida" | "completo">("entrada");
  const { toast } = useToast();
  
  // Obtener el ID del usuario del localStorage
  const [userId, setUserId] = useState<number>(2); // Default a Luis Glez (ID: 2)
  const [username, setUsername] = useState<string>("Usuario");
  
  // Cargar el ID y nombre del usuario del localStorage al iniciar
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    const storedUsername = localStorage.getItem('username');
    
    if (storedUserId) {
      setUserId(parseInt(storedUserId));
    }
    
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);
  
  const { data: calendarData = [], isLoading } = useQuery({
    queryKey: [`/api/user/calendar/${year}`, userId],
    enabled: userId !== null,
  });
  
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      startDate: '',
      endDate: '',
      numberOfGuests: 2,
      notes: ''
    }
  });
  
  const watchStartDate = watch("startDate");
  const watchEndDate = watch("endDate");
  
  // Current date for blocking past dates
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day
  
  // Format date to ISO string (YYYY-MM-DD)
  const formatDateToISO = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };
  
  // Convert date string to proper date object with UTC time at noon to avoid timezone issues
  const parseDate = (dateStr: string): Date => {
    // Create a date using the YYYY-MM-DD string directly to keep in UTC
    const date = new Date(dateStr + "T12:00:00Z");
    return date;
  };
  
  // Mutation for creating a reservation
  const createReservation = useMutation({
    mutationFn: async (data: any) => {
      // Ensure all fields are correctly formatted
      const formattedData = {
        userId: userId, // Usar el ID del usuario obtenido del localStorage
        startDate: data.startDate,
        endDate: data.endDate,
        numberOfGuests: parseInt(data.numberOfGuests || "2"), // Ensure numberOfGuests is a number
        notes: data.notes || ""
      };
      
      console.log("Sending reservation data:", formattedData);
      
      return await apiRequest("POST", "/api/user/reservations", formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/calendar/${year}`, userId] });
      queryClient.invalidateQueries({ queryKey: [`/api/user/reservations/${year}`, userId] });
      toast({
        title: "Solicitud enviada",
        description: "Tu solicitud de reserva ha sido enviada con éxito y está pendiente de aprobación.",
        variant: "default",
      });
      reset();
      setSelectedStartDate(null);
      setSelectedEndDate(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo enviar la reserva: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  const onSubmit = (data: ReservationFormValues) => {
    // Debug - log the data to troubleshoot format issues
    console.log("Form submission data:", {
      startDateString: selectedStartDate,
      endDateString: selectedEndDate
    });
    
    // Convert date strings to proper date objects to avoid format errors
    if (selectedStartDate && selectedEndDate) {
      try {
        const startDate = parseDate(selectedStartDate);
        const endDate = parseDate(selectedEndDate);
        
        console.log("Parsed dates:", {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });
        
        createReservation.mutate({
          ...data,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });
      } catch (error) {
        console.error("Error parsing dates:", error);
        toast({
          title: "Error de formato de fecha",
          description: "Hubo un problema con el formato de las fechas. Por favor intenta de nuevo.",
          variant: "destructive",
        });
      }
    }
  };
  
  // Calendar month navigation
  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setYear(String(parseInt(year) - 1));
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };
  
  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setYear(String(parseInt(year) + 1));
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };
  
  // Calendar date selection
  const handleDateClick = (dateStr: string, status: string, isPastDate: boolean) => {
    // Don't allow selection of unavailable or past dates
    if (status !== 'available' || isPastDate) return;
    
    if (selectionStep === "entrada" || (selectedStartDate && selectedEndDate)) {
      // Starting new selection, or resetting after complete selection
      setSelectedStartDate(dateStr);
      setSelectedEndDate(null);
      setValue("startDate", parseDate(dateStr).toISOString());
      setValue("endDate", "");
      setSelectionStep("salida");
    } else if (selectionStep === "salida") {
      // Adding end date (must be after start date)
      if (parseDate(dateStr) > parseDate(selectedStartDate!)) {
        // Verificar que no hay días ocupados o pendientes en el rango seleccionado
        const start = new Date(selectedStartDate!);
        const end = new Date(dateStr);
        
        // Verificar cada día en el rango
        let rangeHasUnavailableDays = false;
        const dateChecks: Date[] = [];
        
        // Crear un array con todas las fechas del rango
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dateChecks.push(new Date(d));
        }
        
        // Verificar status de cada fecha en el calendario
        for (const date of dateChecks) {
          const checkDateStr = date.toISOString().split('T')[0];
          const dateEntry = Array.isArray(calendarData) ? 
            calendarData.find((d: any) => d.date === checkDateStr) : null;
          
          if (dateEntry && (dateEntry.status === 'occupied' || dateEntry.status === 'pending')) {
            rangeHasUnavailableDays = true;
            break;
          }
        }
        
        if (rangeHasUnavailableDays) {
          toast({
            title: "Fechas no disponibles",
            description: "El rango seleccionado incluye fechas que ya están ocupadas o pendientes.",
            variant: "destructive",
          });
          return;
        }
        
        // Si todas las fechas están disponibles, actualizar la selección
        setSelectedEndDate(dateStr);
        setValue("endDate", parseDate(dateStr).toISOString());
        setSelectionStep("completo");
      } else {
        // If clicked date is before start date, start over with this as new start date
        setSelectedStartDate(dateStr);
        setSelectedEndDate(null);
        setValue("startDate", parseDate(dateStr).toISOString());
        setValue("endDate", "");
        setSelectionStep("salida");
      }
    }
  };
  
  // Helpers for building the calendar
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };
  
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
  
  // Helper for formatting dates to DD/MM/YYYY
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };
  
  // Helper to calculate nights between two dates
  const calculateNights = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  
  // Build calendar data
  const buildCalendar = () => {
    const yearNum = parseInt(year);
    const daysInMonth = getDaysInMonth(yearNum, currentMonth);
    const firstDayOfMonth = getFirstDayOfMonth(yearNum, currentMonth);
    // Para que la semana empiece en lunes (1) en lugar de domingo (0)
    // Si firstDayOfMonth es 0 (domingo), necesitamos 6 días de relleno
    // Para cualquier otro día, restamos 1 para obtener los días de relleno necesarios
    const prevMonthDays = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    
    // Calendar array with prev month days for padding
    const days = [];
    
    // Get days from previous month for padding
    if (prevMonthDays > 0) {
      const prevMonthDaysCount = getDaysInMonth(yearNum, currentMonth - 1);
      for (let i = prevMonthDays - 1; i >= 0; i--) {
        days.push({
          day: prevMonthDaysCount - i,
          month: currentMonth - 1,
          year: yearNum,
          isPadding: true,
          status: 'unavailable'
        });
      }
    }
    
    // Current month days with status
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${yearNum}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const currentDate = new Date(dateStr);
      
      // Determine if date is in the past
      const isPastDate = currentDate < today;
      
      let status = isPastDate ? 'past' : 'available';
      
      // Check in calendarData for status, but only override if not a past date
      if (!isPastDate && Array.isArray(calendarData)) {
        const dateEntry = calendarData.find((d: any) => d.date === dateStr);
        if (dateEntry && dateEntry.status) {
          status = dateEntry.status;
        }
      }
      
      // Check if date is selected
      let isSelected = false;
      let isInRange = false;
      
      if (selectedStartDate && selectedEndDate) {
        isSelected = dateStr === selectedStartDate || dateStr === selectedEndDate;
        // Include the end date in the range by using >= instead of >
        isInRange = dateStr > selectedStartDate && dateStr <= selectedEndDate;
      } else if (selectedStartDate) {
        isSelected = dateStr === selectedStartDate;
      }
      
      days.push({
        day: i,
        month: currentMonth,
        year: yearNum,
        isPadding: false,
        status,
        dateStr,
        isSelected,
        isInRange,
        isPastDate
      });
    }
    
    // Next month days for padding to complete grid
    const totalDaysShown = Math.ceil(days.length / 7) * 7;
    const nextMonthDays = totalDaysShown - days.length;
    
    for (let i = 1; i <= nextMonthDays; i++) {
      days.push({
        day: i,
        month: currentMonth + 1,
        year: yearNum,
        isPadding: true,
        status: 'unavailable'
      });
    }
    
    return days;
  };
  
  const calendarDays = buildCalendar();

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 flex-grow">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Reserva tu estancia</h2>
            <p className="text-muted-foreground mt-1">Consulta disponibilidad y reserva tu escapada a Tamariu en la Costa Brava.</p>
          </div>
          <div className="flex items-center">
            <label htmlFor="calendar-year" className="mr-2 text-muted-foreground">
              Año:
            </label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableYears().map(yearOption => (
                  <SelectItem key={yearOption} value={yearOption}>{yearOption}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2 bg-card shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <Button variant="ghost" size="icon" className="text-gray-500" onClick={goToPrevMonth}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h3 className="text-xl font-medium text-center">
                {monthNames[currentMonth]} {year}
              </h3>
              <Button variant="ghost" size="icon" className="text-gray-500" onClick={goToNextMonth}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="mb-2">
              <div className="grid grid-cols-7 gap-px">
                {dayNames.map((day, index) => (
                  <div key={index} className="text-center py-2 text-gray-500 font-medium">
                    {day}
                  </div>
                ))}
              </div>
            
              <div className="grid grid-cols-7 gap-px">
                {calendarDays.map((day, index) => {
                  let cellClass = "calendar-cell ";
                  
                  if (day.isPadding) {
                    cellClass += "text-gray-400";
                  } else if (day.isPastDate) {
                    cellClass += "calendar-day-past";
                  } else if (day.isSelected) {
                    cellClass += "calendar-day-selected";
                  } else if (day.isInRange) {
                    cellClass += "calendar-day-in-range";
                  } else if (day.status === 'available') {
                    cellClass += "calendar-day-available";
                  } else if (day.status === 'pending') {
                    cellClass += "calendar-day-pending";
                  } else if (day.status === 'occupied') {
                    cellClass += "calendar-day-occupied";
                  }
                  
                  return (
                    <div
                      key={index}
                      className={cellClass}
                      onClick={() => !day.isPadding && handleDateClick(day.dateStr || '', day.status || '', Boolean(day.isPastDate))}
                    >
                      {day.day}
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-3">
                {selectionStep === "entrada" 
                  ? "Selecciona las fechas de entrada y salida en el calendario." 
                  : selectionStep === "salida" 
                    ? `Fecha de entrada: ${formatDate(selectedStartDate!)}. Ahora selecciona la fecha de salida.`
                    : `Selecciona las fechas de entrada y salida en el calendario.`
                }
              </p>
              
              {/* Leyenda del calendario */}
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <span className="text-xs font-semibold text-muted-foreground">Leyenda:</span>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-green-100"></div>
                  <span className="text-xs">Disponible</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-orange-100"></div>
                  <span className="text-xs">Pendiente</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-red-100"></div>
                  <span className="text-xs">Ocupado</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm calendar-day-selected"></div>
                  <span className="text-xs">Seleccionado/En rango</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reservation Form */}
        <Card className="bg-card shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">Detalles de la reserva</h3>
            <form id="reservation-form" onSubmit={handleSubmit(onSubmit)}>
              <div className="mb-4">
                <Label htmlFor="user-name">Miembro familiar</Label>
                <div className="text-sm font-medium text-primary mt-2 p-2 border rounded-md">
                  {username}
                </div>
              </div>
              
              <div className="space-y-1 mb-4">
                <p className="text-sm text-muted-foreground mb-2">Entrada: {selectedStartDate ? formatDate(selectedStartDate) : 'Seleccionar'}</p>
                <p className="text-sm text-muted-foreground mb-2">Salida: {selectedEndDate ? formatDate(selectedEndDate) : 'Seleccionar'}</p>
                <p className="text-sm text-muted-foreground">Estancia: {(selectedStartDate && selectedEndDate) ? `${calculateNights(selectedStartDate, selectedEndDate)} noches` : 'Pendiente'}</p>
                
                <input type="hidden" {...register("startDate")} />
                <input type="hidden" {...register("endDate")} />
                
                {errors.startDate && (
                  <p className="text-destructive text-sm mt-1">{errors.startDate.message}</p>
                )}
                {errors.endDate && (
                  <p className="text-destructive text-sm mt-1">{errors.endDate.message}</p>
                )}
              </div>
              
              <div className="mb-4">
                <Label htmlFor="guests">Número de huéspedes</Label>
                <Select defaultValue="2" 
                  onValueChange={(val) => setValue("numberOfGuests", parseInt(val))}
                >
                  <SelectTrigger className="w-full mt-2">
                    <SelectValue placeholder="Seleccionar número" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({length: 10}, (_, i) => i + 1).map(num => (
                      <SelectItem key={num} value={num.toString()}>{num} {num === 1 ? 'persona' : 'personas'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" {...register("numberOfGuests", { valueAsNumber: true })} />
                {errors.numberOfGuests && (
                  <p className="text-destructive text-sm mt-1">{errors.numberOfGuests.message}</p>
                )}
              </div>
              
              <div className="mb-6">
                <Label htmlFor="notes">Notas adicionales</Label>
                <Textarea 
                  id="notes" 
                  rows={3} 
                  placeholder="Incluye cualquier información adicional para tu estancia"
                  className="mt-2" 
                  {...register("notes")}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-primary text-primary-foreground"
                disabled={createReservation.isPending || !selectedStartDate || !selectedEndDate}
              >
                {createReservation.isPending ? "Enviando..." : "Reservar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
