import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { User, CalendarIcon, BarChart3, Users } from "lucide-react";
import { ReservationStats } from '@shared/schema';
import AnnualCalendar from './annual-calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { SortableTableHeader, SortableColumn, SortDirection } from '@/components/ui/sortable-table-header';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { getAvailableYears } from '@/lib/utils/date-utils';

// Componente para tarjetas de estadísticas
interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  suffix?: string;
}

function StatsCard({ title, value, icon, suffix }: StatsCardProps) {
  return (
    <Card className="bg-card shadow-sm">
      <CardContent className="p-6 flex items-center">
        <div className="mr-4 p-2 bg-primary/10 rounded-full">
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <h4 className="text-2xl font-bold mt-1">
            {value}{suffix && <span className="text-sm font-normal ml-1">{suffix}</span>}
          </h4>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<ReservationStats | null>(null);
  const [currentYear, setCurrentYear] = useState<string>(new Date().getFullYear().toString());
  const [calendarData, setCalendarData] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
  useEffect(() => {
    // Cargar estadísticas para el año actual
    fetch(`/api/admin/stats/${currentYear}`)
      .then(res => res.json())
      .then(data => {
        console.log("Datos de estadísticas recibidos:", data);
        setStats(data);
      })
      .catch(error => {
        console.error("Error al cargar estadísticas:", error);
      });

    // Cargar datos de calendario
    fetch(`/api/user/calendar/${currentYear}`)
      .then(res => res.json())
      .then(data => {
        setCalendarData(data);
      })
      .catch(error => {
        console.error("Error al cargar datos del calendario:", error);
      });

    // Cargar reservas aprobadas
    fetch(`/api/admin/reservations/${currentYear}`)
      .then(res => res.json())
      .then(data => {
        console.log("Todas las reservaciones:", data);
        const approvedReservations = data.filter((r: any) => r.status === 'approved');
        console.log("Reservas aprobadas:", approvedReservations);
        setReservations(approvedReservations);
      })
      .catch(error => {
        console.error("Error al cargar reservas:", error);
      });
  }, [currentYear]);

  // Stats placeholder
  const statsData: ReservationStats = stats || {
    totalReservations: 0,
    occupiedDays: 0,
    frequentUser: "-",
    occupancyRate: 0,
    reservationsByMonth: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, count: 0 })),
    reservationsByUser: []
  };

  // Calcular las noches para cada reserva
  const calculateNights = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  
  // Formatear fecha para mostrar en español
  const formatDateLocale = (dateString: string): string => {
    const date = new Date(dateString);
    return format(date, 'dd MMM yyyy', { locale: es });
  };
  
  // Función para manejar el ordenamiento de columnas
  const handleSort = (key: string) => {
    const isAsc = sortKey === key && sortDirection === 'asc';
    
    setSortKey(key);
    setSortDirection(isAsc ? 'desc' : 'asc');
  };
  
  // Definición de columnas ordenables
  const columns: SortableColumn[] = [
    { key: 'username', label: 'Usuario' },
    { key: 'startDate', label: 'Fecha Entrada' },
    { key: 'endDate', label: 'Fecha Salida' },
    { key: 'nights', label: 'Noches' },
    { key: 'numberOfGuests', label: 'Personas' }
  ];
  
  // Obtener y ordenar las reservas
  const sortedReservations = React.useMemo(() => {
    if (!sortKey) return reservations;
    
    return [...reservations].sort((a, b) => {
      // Calcular noches para ordenar por esta columna
      if (sortKey === 'nights') {
        const aNights = calculateNights(a.startDate, a.endDate);
        const bNights = calculateNights(b.startDate, b.endDate);
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
      
      // Para valores numéricos
      return sortDirection === 'asc' 
        ? (aValue - bValue) 
        : (bValue - aValue);
    });
  }, [reservations, sortKey, sortDirection]);

  return (
    <div className="px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="flex items-center">
          <label htmlFor="dashboard-year" className="mr-2 text-muted-foreground">
            Año:
          </label>
          <Select value={currentYear} onValueChange={setCurrentYear}>
            <SelectTrigger className="w-[100px]" id="dashboard-year">
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
      
      {/* 1. Calendario Anual */}
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4">Calendario Anual {currentYear}</h3>
        <div className="bg-white rounded-lg shadow-sm">
          <AnnualCalendar year={currentYear} calendarData={calendarData} reservations={reservations} />
        </div>
      </div>
      
      {/* 2. Tabla de Reservas Aprobadas */}
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4">Reservas Aprobadas</h3>
        <div className="bg-white rounded-lg shadow-sm">
          <div className="overflow-x-auto p-6">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  {columns.map((column) => (
                    <SortableTableHeader
                      key={column.key}
                      column={column}
                      sortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedReservations.length > 0 ? (
                  sortedReservations.map((reservation: any) => (
                    <tr key={reservation.id} className="border-b">
                      <td className="py-4 px-4">{reservation.username}</td>
                      <td className="py-4 px-4">{formatDateLocale(reservation.startDate)}</td>
                      <td className="py-4 px-4">{formatDateLocale(reservation.endDate)}</td>
                      <td className="py-4 px-4">{calculateNights(reservation.startDate, reservation.endDate)}</td>
                      <td className="py-4 px-4">{reservation.numberOfGuests}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 px-4 text-center text-muted-foreground">
                      No hay reservas aprobadas para mostrar
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* 3. Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6 flex items-center">
          <div className="mr-4 p-2 bg-primary/10 rounded-full">
            <CalendarIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Reservas Totales</p>
            <h4 className="text-2xl font-bold mt-1">
              {statsData.totalReservations}
            </h4>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 flex items-center">
          <div className="mr-4 p-2 bg-primary/10 rounded-full">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Noches Ocupadas</p>
            <h4 className="text-2xl font-bold mt-1">
              {statsData.occupiedDays}
            </h4>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 flex items-center">
          <div className="mr-4 p-2 bg-primary/10 rounded-full">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Usuario Frecuente</p>
            <h4 className="text-2xl font-bold mt-1">
              {statsData.frequentUser}
            </h4>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 flex items-center">
          <div className="mr-4 p-2 bg-primary/10 rounded-full">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tasa de Ocupación</p>
            <h4 className="text-2xl font-bold mt-1">
              {statsData.occupancyRate}<span className="text-sm font-normal ml-1">%</span>
            </h4>
          </div>
        </div>
      </div>
      
      {/* 4. Gráficos de Estadísticas */}
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4">Noches Reservadas por Usuario</h3>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="h-64 flex items-center justify-center">
            <div className="w-full max-w-md">
              {statsData.reservationsByUser.length > 0 ? (
                statsData.reservationsByUser.map((user: any, index: number) => {
                  const maxCount = Math.max(...statsData.reservationsByUser.map((u: any) => u.count), 1);
                  const width = `${(user.count / maxCount) * 100}%`;
                  
                  return (
                    <div key={index} className="mb-6">
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">{user.username}</span>
                        <span className="text-foreground font-medium">{user.count} noches</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3">
                        <div className="bg-primary h-3 rounded-full" style={{ width }}></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-muted-foreground">
                  No hay datos de reservas para mostrar
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}