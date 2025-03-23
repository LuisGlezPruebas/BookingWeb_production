import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { getDaysInMonth, isPastDate } from "@/lib/utils/date-utils";

// Colores para usuarios (en formato tailwind) - Colores llamativos y distintivos
const userColorMap: Record<number, string> = {
  2: "bg-red-500 text-white", // Luis Glez
  3: "bg-blue-600 text-white", // David Glez
  4: "bg-emerald-500 text-white", // Luis Glez Llobet
  5: "bg-pink-500 text-white", // Martina
  6: "bg-purple-600 text-white", // Juan
  7: "bg-amber-500 text-white" // Mº Teresa
};

interface CalendarDayProps {
  date: string; // YYYY-MM-DD
  status: string;
  userId?: number;
  reservationIds?: number[];
  userColors: Record<number, string>;
  usernames: Record<number, string>;
}

interface MonthViewProps {
  month: number; // 1-12
  year: number;
  calendarData: CalendarDayProps[];
  userColors: Record<number, string>;
  usernames: Record<number, string>;
}

// Componente para un mes individual
function MonthView({ month, year, calendarData, userColors, usernames }: MonthViewProps) {
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNamesShort = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  
  // Obtiene el número de días del mes
  const daysInMonth = getDaysInMonth(year, month - 1);
  
  // Obtiene el primer día del mes (0-6, donde 0 es domingo)
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  
  // Ajusta para que la semana comience en lunes (0 = lunes, 6 = domingo)
  const firstDayAdjusted = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  
  // Construye los días para la vista de mes
  const days = [];
  
  // Días del mes anterior (padding)
  for (let i = 0; i < firstDayAdjusted; i++) {
    days.push(null);
  }
  
  // Días del mes actual
  for (let day = 1; day <= daysInMonth; day++) {
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Encuentra los datos para esta fecha en calendarData
    const dayData = calendarData.find(d => d.date === dateString);
    
    days.push({
      day,
      date: dateString,
      status: dayData?.status || "available",
      userId: dayData?.userId,
      reservationIds: dayData?.reservationIds,
      isPast: isPastDate(dateString)
    });
  }
  
  return (
    <div className="month-view">
      <h4 className="text-sm font-medium mb-2">{monthNames[month - 1]}</h4>
      <div className="grid grid-cols-7 gap-1">
        {/* Nombres de días */}
        {dayNamesShort.map((day, index) => (
          <div key={`header-${index}`} className="text-center text-xs text-muted-foreground h-6 flex items-center justify-center">
            {day}
          </div>
        ))}
        
        {/* Días del mes */}
        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="h-6 w-6 rounded-full"></div>;
          }
          
          let bgClass = "bg-gray-200 text-gray-400"; // Días pasados
          
          if (!day.isPast) {
            if (day.status === "occupied" && day.userId) {
              // Usar color asignado a cada usuario específico
              bgClass = userColorMap[day.userId] || "bg-red-500 text-white";
              // Añadir log para verificar que se está detectando correctamente
              console.log(`Día ocupado: ${day.date} por usuario ${day.userId} (${usernames[day.userId] || 'Desconocido'})`);
            } else {
              bgClass = "bg-green-100"; // Disponible
            }
          }
          
          return (
            <div 
              key={`day-${day.date}`}
              className={`${bgClass} h-6 w-6 rounded-full flex items-center justify-center text-xs cursor-default transition-colors`}
              title={day.userId ? `${usernames[day.userId] || 'Usuario'} - ${day.date}` : day.date}
            >
              {day.day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface AnnualCalendarProps {
  year: string;
  calendarData: any[];
  reservations: any[];
}

export default function AnnualCalendar({ year, calendarData, reservations }: AnnualCalendarProps) {
  const [processedData, setProcessedData] = useState<CalendarDayProps[]>([]);
  const [userColors, setUserColors] = useState<Record<number, string>>({});
  const [usernames, setUsernames] = useState<Record<number, string>>({});
  
  useEffect(() => {
    // Verificar qué reservas están aprobadas
    console.log("Todas las reservaciones:", reservations);
    const approvedReservations = reservations.filter((r: any) => r.status === 'approved');
    console.log("Reservas aprobadas:", approvedReservations);
    
    // Predefinir todos los usuarios conocidos (excepto Admin)
    const defaultUsernames: Record<number, string> = {
      2: "Luis Glez",
      3: "David Glez",
      4: "Luis Glez Llobet",
      5: "Martina",
      6: "Juan",
      7: "Mº Teresa"
    };
    
    // Asignar colores preestablecidos a todos los usuarios
    setUserColors(userColorMap);
    
    // Combinar nombres predefinidos con los de las reservas
    const names: Record<number, string> = {...defaultUsernames};
    
    // Añadir nombres de las reservas (por si hubiera usuarios nuevos)
    reservations.forEach((r: any) => {
      if (r.username && r.userId) {
        names[r.userId] = r.username;
      }
    });
    
    setUsernames(names);
    
    // Procesar datos de calendario para incluir información de reservas y usuarios
    const processed: CalendarDayProps[] = [];
    
    if (Array.isArray(calendarData)) {
      calendarData.forEach((day: any) => {
        if (!day || !day.date) return;
        
        // Encontrar SOLO reservas APROBADAS que incluyen esta fecha
        const dayReservations = reservations.filter((r: any) => {
          if (!r.startDate || !r.endDate || !day.date || r.status !== 'approved') return false;
          
          // Convertir fechas al formato YYYY-MM-DD para comparar correctamente
          const startDateStr = new Date(r.startDate).toISOString().split('T')[0];
          const endDateStr = new Date(r.endDate).toISOString().split('T')[0];
          const currentDateStr = day.date;
          
          // Comprobar si la fecha actual está entre la fecha de inicio y fin de la reserva
          return currentDateStr >= startDateStr && currentDateStr <= endDateStr;
        });
        
        // Si hay reservas para esta fecha, usa el ID del usuario y reserva
        if (dayReservations.length > 0) {
          processed.push({
            date: day.date,
            status: "occupied",
            userId: dayReservations[0].userId,
            reservationIds: dayReservations.map((r: any) => r.id),
            userColors,
            usernames
          });
        } else {
          processed.push({
            date: day.date,
            status: day.status,
            userColors,
            usernames
          });
        }
      });
    }
    
    setProcessedData(processed);
  }, [calendarData, reservations]);
  
  // Generar todos los meses del año
  const months = [];
  for (let month = 1; month <= 12; month++) {
    months.push(
      <MonthView 
        key={`month-${month}`}
        month={month} 
        year={parseInt(year)} 
        calendarData={processedData}
        userColors={userColors}
        usernames={usernames}
      />
    );
  }
  
  return (
    <Card className="bg-card shadow-sm mb-8">
      <CardContent className="p-6">
        <h3 className="text-lg font-medium text-foreground mb-4">
          Calendario Anual {year}
        </h3>
        
        {/* Leyenda de usuarios */}
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(usernames).map(([userId, name]) => (
            <div key={`legend-${userId}`} className="flex items-center">
              <div 
                className={`${userColorMap[Number(userId)] || "bg-gray-400"} w-3 h-3 rounded-full mr-1`} 
              ></div>
              <span className="text-xs text-muted-foreground">{name}</span>
            </div>
          ))}
          <div className="flex items-center">
            <div className="bg-green-100 w-3 h-3 rounded-full mr-1"></div>
            <span className="text-xs text-muted-foreground">Disponible</span>
          </div>
          <div className="flex items-center">
            <div className="bg-gray-200 w-3 h-3 rounded-full mr-1"></div>
            <span className="text-xs text-muted-foreground">Pasado</span>
          </div>
        </div>
        
        {/* Grid de meses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {months}
        </div>
      </CardContent>
    </Card>
  );
}