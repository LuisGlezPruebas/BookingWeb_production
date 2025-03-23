import { 
  Reservation, 
  InsertReservation, 
  User, 
  InsertUser,
  UpdateReservationStatus,
  UpdateReservation,
  ReservationStats
} from "@shared/schema";

// Implementar la función calculateStats directamente en el servidor para evitar problemas
function calculateStats(reservations: Reservation[], usernames: Record<number, string>): ReservationStats {
  const totalReservations = reservations.length;
  
  // Calculate occupied days
  const occupiedDays = new Set<string>();
  reservations.forEach(reservation => {
    const start = new Date(reservation.startDate);
    const end = new Date(reservation.endDate);
    
    // For each day of the reservation
    for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
      occupiedDays.add(day.toISOString().split('T')[0]);
    }
  });
  
  // Calculate most frequent user and number of days per user
  const userCounts: Record<number, number> = {};
  
  reservations.forEach(reservation => {
    const start = new Date(reservation.startDate);
    const end = new Date(reservation.endDate);
    const userId = reservation.userId;
    let nightCount = 0;
    
    // Count nights for this reservation (day differences)
    for (let day = new Date(start); day < end; day.setDate(day.getDate() + 1)) {
      nightCount++;
    }
    
    // Add nights to user count
    userCounts[userId] = (userCounts[userId] || 0) + nightCount;
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
  const currentYear = parseInt(new Date().getFullYear().toString());
  const daysInYear = (currentYear % 4 === 0 && (currentYear % 100 !== 0 || currentYear % 400 === 0)) ? 366 : 365;
  const occupancyRate = Math.round((occupiedDays.size / daysInYear) * 100);
  
  // Calculate reservations by month
  const reservationsByMonth = Array(12).fill(0).map((_, i) => ({ month: i + 1, count: 0 }));
  
  reservations.forEach(reservation => {
    const start = new Date(reservation.startDate);
    const end = new Date(reservation.endDate);
    
    // For each day of the reservation
    for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
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

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Reservation operations
  getReservation(id: number): Promise<Reservation | undefined>;
  createReservation(reservation: InsertReservation): Promise<Reservation>;
  updateReservationStatus(id: number, status: UpdateReservationStatus): Promise<Reservation | undefined>;
  updateReservation(id: number, data: UpdateReservation): Promise<Reservation | undefined>;
  cancelReservation(id: number): Promise<Reservation | undefined>;
  getReservationsByYear(year: string): Promise<Reservation[]>;
  getPendingReservationsByYear(year: string): Promise<Reservation[]>;
  getReservationHistoryByYear(year: string): Promise<Reservation[]>;
  getApprovedReservationsByYear(year: string): Promise<Reservation[]>;
  getUserReservationsByYear(userId: number, year: string): Promise<Reservation[]>;
  getReservationStatsByYear(year: string): Promise<ReservationStats>;
  getCalendarDataByYear(year: string): Promise<{date: string, status: string}[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private reservations: Map<number, Reservation>;
  private userIdCounter: number;
  private reservationIdCounter: number;

  constructor() {
    this.users = new Map();
    this.reservations = new Map();
    this.userIdCounter = 1;
    this.reservationIdCounter = 1;
    
    // Initialize with default users
    this.createUser({ username: "admin", password: "123", isAdmin: true });
    this.createUser({ username: "Luis Glez", password: "", isAdmin: false });
    this.createUser({ username: "David Glez", password: "", isAdmin: false });
    this.createUser({ username: "Luis Glez Llobet", password: "", isAdmin: false });
    this.createUser({ username: "Martina", password: "", isAdmin: false });
    this.createUser({ username: "Juan", password: "", isAdmin: false });
    this.createUser({ username: "Mº Teresa", password: "", isAdmin: false });
    
    // Añadir reservas predeterminadas para David Glez (userId 3)
    // 1. Puente de mayo
    this.createReservation({
      userId: 3, 
      startDate: new Date("2025-04-30"),
      endDate: new Date("2025-05-04"),
      numberOfGuests: 4,
      notes: "Puente de mayo",
      status: "approved"
    });
    this.createReservation({
      userId: 3, 
      startDate: new Date("2026-04-30"),
      endDate: new Date("2026-05-03"),
      numberOfGuests: 4,
      notes: "Puente de mayo",
      status: "approved"
    });
    this.createReservation({
      userId: 3, 
      startDate: new Date("2027-04-30"),
      endDate: new Date("2027-05-02"),
      numberOfGuests: 4,
      notes: "Puente de mayo",
      status: "approved"
    });
    this.createReservation({
      userId: 3, 
      startDate: new Date("2028-04-30"),
      endDate: new Date("2028-05-03"),
      numberOfGuests: 4,
      notes: "Puente de mayo",
      status: "approved"
    });
    
    // 2. Última quincena de Junio
    this.createReservation({
      userId: 3, 
      startDate: new Date("2025-06-23"),
      endDate: new Date("2025-07-06"),
      numberOfGuests: 4,
      notes: "Última quincena de Junio",
      status: "approved"
    });
    this.createReservation({
      userId: 3, 
      startDate: new Date("2026-06-22"),
      endDate: new Date("2026-07-05"),
      numberOfGuests: 4,
      notes: "Última quincena de Junio",
      status: "approved"
    });
    this.createReservation({
      userId: 3, 
      startDate: new Date("2027-06-21"),
      endDate: new Date("2027-07-03"),
      numberOfGuests: 4,
      notes: "Última quincena de Junio",
      status: "approved"
    });
    this.createReservation({
      userId: 3, 
      startDate: new Date("2028-06-20"),
      endDate: new Date("2028-07-02"),
      numberOfGuests: 4,
      notes: "Última quincena de Junio",
      status: "approved"
    });
    
    // 3. Última quincena de Julio
    this.createReservation({
      userId: 3, 
      startDate: new Date("2025-07-21"),
      endDate: new Date("2025-08-03"),
      numberOfGuests: 4,
      notes: "Última quincena de Julio",
      status: "approved"
    });
    this.createReservation({
      userId: 3, 
      startDate: new Date("2026-07-20"),
      endDate: new Date("2026-08-02"),
      numberOfGuests: 4,
      notes: "Última quincena de Julio",
      status: "approved"
    });
    this.createReservation({
      userId: 3, 
      startDate: new Date("2027-07-19"),
      endDate: new Date("2027-08-01"),
      numberOfGuests: 4,
      notes: "Última quincena de Julio",
      status: "approved"
    });
    this.createReservation({
      userId: 3, 
      startDate: new Date("2028-07-18"),
      endDate: new Date("2028-07-31"),
      numberOfGuests: 4,
      notes: "Última quincena de Julio",
      status: "approved"
    });
    
    // 4. Última quincena de Agosto
    this.createReservation({
      userId: 3, 
      startDate: new Date("2025-08-18"),
      endDate: new Date("2025-08-31"),
      numberOfGuests: 4,
      notes: "Última quincena de Agosto",
      status: "approved"
    });
    this.createReservation({
      userId: 3, 
      startDate: new Date("2026-08-24"),
      endDate: new Date("2026-09-06"),
      numberOfGuests: 4,
      notes: "Última quincena de Agosto",
      status: "approved"
    });
    this.createReservation({
      userId: 3, 
      startDate: new Date("2027-08-23"),
      endDate: new Date("2027-09-05"),
      numberOfGuests: 4,
      notes: "Última quincena de Agosto",
      status: "approved"
    });
    this.createReservation({
      userId: 3, 
      startDate: new Date("2028-08-22"),
      endDate: new Date("2028-09-04"),
      numberOfGuests: 4,
      notes: "Última quincena de Agosto",
      status: "approved"
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const users = Array.from(this.users.values());
    for (const user of users) {
      if (user.username.toLowerCase() === username.toLowerCase()) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const newUser: User = { 
      id,
      username: user.username,
      password: user.password || null,
      isAdmin: user.isAdmin || false
    };
    this.users.set(id, newUser);
    return newUser;
  }

  // Reservation operations
  async getReservation(id: number): Promise<Reservation | undefined> {
    return this.reservations.get(id);
  }

  async createReservation(reservationData: InsertReservation): Promise<Reservation> {
    const id = this.reservationIdCounter++;
    const now = new Date();
    
    const reservation: Reservation = {
      id,
      userId: reservationData.userId,
      startDate: reservationData.startDate,
      endDate: reservationData.endDate,
      numberOfGuests: reservationData.numberOfGuests || 1,
      notes: reservationData.notes || null,
      status: reservationData.status || "pending",
      createdAt: now,
    };
    
    console.log(`Creando reserva: ${JSON.stringify(reservation)}`);
    this.reservations.set(id, reservation);
    return reservation;
  }

  async updateReservationStatus(id: number, statusUpdate: UpdateReservationStatus): Promise<Reservation | undefined> {
    const reservation = this.reservations.get(id);
    if (!reservation) return undefined;
    
    const updatedReservation: Reservation = {
      ...reservation,
      status: statusUpdate.status,
    };
    
    this.reservations.set(id, updatedReservation);
    return updatedReservation;
  }
  
  async updateReservation(id: number, data: UpdateReservation): Promise<Reservation | undefined> {
    const reservation = this.reservations.get(id);
    if (!reservation) return undefined;
    
    // Solo se permiten modificaciones para reservas que no han pasado y que estén en estado aprobado
    const currentDate = new Date();
    if (new Date(reservation.startDate) <= currentDate) {
      return undefined; // No se puede modificar una reserva que ya pasó
    }
    
    const updatedReservation: Reservation = {
      ...reservation,
      startDate: data.startDate,
      endDate: data.endDate,
      numberOfGuests: data.numberOfGuests,
      notes: data.notes || reservation.notes,
      status: "modified", // Cambiar a estado modificado para que el admin lo apruebe
    };
    
    this.reservations.set(id, updatedReservation);
    return updatedReservation;
  }
  
  async cancelReservation(id: number): Promise<Reservation | undefined> {
    const reservation = this.reservations.get(id);
    if (!reservation) return undefined;
    
    // Solo se pueden cancelar reservas que no han pasado
    const currentDate = new Date();
    if (new Date(reservation.startDate) <= currentDate) {
      return undefined; // No se puede cancelar una reserva que ya pasó
    }
    
    const updatedReservation: Reservation = {
      ...reservation,
      status: "cancelled",
    };
    
    this.reservations.set(id, updatedReservation);
    return updatedReservation;
  }

  async getReservationsByYear(year: string): Promise<Reservation[]> {
    const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${parseInt(year) + 1}-01-01T00:00:00.000Z`);
    
    const reservations = Array.from(this.reservations.values());
    return reservations.filter(reservation => {
      const reservationDate = new Date(reservation.startDate);
      return reservationDate >= startOfYear && reservationDate < endOfYear;
    });
  }

  async getPendingReservationsByYear(year: string): Promise<Reservation[]> {
    const yearReservations = await this.getReservationsByYear(year);
    return yearReservations.filter(res => res.status === "pending" || res.status === "modified");
  }

  async getReservationHistoryByYear(year: string): Promise<Reservation[]> {
    const yearReservations = await this.getReservationsByYear(year);
    return yearReservations.filter(res => 
      res.status === "approved" || 
      res.status === "rejected" || 
      res.status === "cancelled"
    ).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }
  
  async getApprovedReservationsByYear(year: string): Promise<Reservation[]> {
    const yearReservations = await this.getReservationsByYear(year);
    const approvedReservations = yearReservations.filter(res => res.status === "approved")
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    
    console.log(`Obtenidas ${approvedReservations.length} reservas aprobadas para el año ${year}`);
    
    return approvedReservations;
  }

  async getUserReservationsByYear(userId: number, year: string): Promise<Reservation[]> {
    const yearReservations = await this.getReservationsByYear(year);
    return yearReservations.filter(res => res.userId === userId)
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }

  async getReservationStatsByYear(year: string): Promise<ReservationStats> {
    // Obtener solo las reservas aprobadas usando el método apropiado
    const approvedReservations = await this.getApprovedReservationsByYear(year);
    
    // Create a map of user IDs to usernames
    const usernames: Record<number, string> = {};
    const users = Array.from(this.users.values());
    for (const user of users) {
      usernames[user.id] = user.username;
    }
    
    // Imprimimos información para depuración
    console.log(`Calculando estadísticas para ${approvedReservations.length} reservas aprobadas en ${year}`);
    
    return calculateStats(approvedReservations, usernames);
  }

  async getCalendarDataByYear(year: string): Promise<{date: string, status: string}[]> {
    // Obtenemos todas las reservas para mostrar disponibilidad correctamente
    const yearReservations = await this.getReservationsByYear(year);
    const calendarData: {date: string, status: string}[] = [];
    
    // Process each day of the year
    const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${parseInt(year) + 1}-01-01T00:00:00.000Z`);
    
    // For each day, check if it's within any reservation period
    for (let day = new Date(startOfYear); day < endOfYear; day.setDate(day.getDate() + 1)) {
      const dateStr = day.toISOString().split('T')[0]; // YYYY-MM-DD format
      let status = 'available';
      
      // Check each reservation
      for (const reservation of yearReservations) {
        const startDate = new Date(reservation.startDate);
        const endDate = new Date(reservation.endDate);
        
        // Set to start of day for comparison
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        day.setHours(0, 0, 0, 0);
        
        // Check if the current day is within the reservation period
        if (day >= startDate && day <= endDate) {
          if (reservation.status === 'approved') {
            status = 'occupied';
            break; // Priority: occupied > pending/modified > available
          } else if ((reservation.status === 'pending' || reservation.status === 'modified') && status !== 'occupied') {
            status = 'pending';
            // Don't break, continue checking in case there's an approved reservation
          }
        }
      }
      
      calendarData.push({ date: dateStr, status });
    }
    
    return calendarData;
  }
}

export const storage = new MemStorage();
