import { Reservation } from "@shared/schema";

/**
 * Check if two date ranges overlap
 */
export function datesOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && startB < endA;
}

/**
 * Get the status of a date based on existing reservations
 * Returns 'available', 'pending', or 'occupied'
 */
export function getDateStatus(
  date: Date, 
  reservations: Reservation[]
): 'available' | 'pending' | 'occupied' {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  for (const reservation of reservations) {
    const startDate = new Date(reservation.startDate);
    const endDate = new Date(reservation.endDate);
    
    // Adjust end date for comparison (inclusive start date, exclusive end date)
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    
    const currentDate = new Date(dateStr);
    currentDate.setHours(0, 0, 0, 0);
    
    if (currentDate >= startDate && currentDate < endDate) {
      if (reservation.status === 'approved') {
        return 'occupied';
      } else if (reservation.status === 'pending') {
        return 'pending';
      }
    }
  }
  
  return 'available';
}

/**
 * Calculate statistics for dashboard
 * Esta función recibe reservas que ya están filtradas para ser solo 'approved'
 */
export function calculateStats(reservations: Reservation[], usernames: Record<number, string>) {
  // Ya no filtramos por status === 'approved' porque ahora la función recibe solo las reservas aprobadas
  const totalReservations = reservations.length;
  
  // Calculate occupied days
  const occupiedDays = new Set<string>();
  reservations.forEach(reservation => {
    const start = new Date(reservation.startDate);
    const end = new Date(reservation.endDate);
    
    // For each day of the reservation
    for (let day = new Date(start); day < end; day.setDate(day.getDate() + 1)) {
      occupiedDays.add(day.toISOString().split('T')[0]);
    }
  });
  
  // Calculate most frequent user
  const userCounts: Record<number, number> = {};
  reservations.forEach(reservation => {
    userCounts[reservation.userId] = (userCounts[reservation.userId] || 0) + 1;
  });
  
  let mostFrequentUserId = 0;
  let maxCount = 0;
  
  Object.entries(userCounts).forEach(([userId, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostFrequentUserId = parseInt(userId);
    }
  });
  
  const frequentUser = usernames[mostFrequentUserId] || '-';
  
  // Calculate occupancy rate
  const totalDaysInYear = new Date(parseInt(new Date().getFullYear().toString()), 11, 31).getDate() + 365;
  const occupancyRate = Math.round((occupiedDays.size / totalDaysInYear) * 100);
  
  // Calculate reservations by month
  const reservationsByMonth = Array(12).fill(0).map((_, i) => ({ month: i + 1, count: 0 }));
  
  reservations.forEach(reservation => {
    const start = new Date(reservation.startDate);
    const end = new Date(reservation.endDate);
    
    // For each day of the reservation
    for (let day = new Date(start); day < end; day.setDate(day.getDate() + 1)) {
      reservationsByMonth[day.getMonth()].count++;
    }
  });
  
  // Calculate reservations by user
  const reservationsByUser = Object.entries(userCounts).map(([userId, count]) => ({
    username: usernames[parseInt(userId)] || '-',
    count
  }));
  
  return {
    totalReservations,
    occupiedDays: occupiedDays.size,
    frequentUser,
    occupancyRate,
    reservationsByMonth,
    reservationsByUser
  };
}
