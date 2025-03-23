import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertReservationSchema, updateReservationStatusSchema, updateReservationSchema } from "@shared/schema";
import { z } from "zod";
import { EmailService } from "./services/email.service";
import { UserService } from "./services/user.service";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Get all users
  app.get("/api/users", async (_req: Request, res: Response) => {
    try {
      // Obtener todos los usuarios utilizando los IDs predefinidos (del 1 al 7)
      const users = await Promise.all(
        Array.from({ length: 7 }, (_, i) => i + 1).map(async (id) => {
          const user = await storage.getUser(id);
          if (user) {
            return {
              id: user.id,
              username: user.username,
              isAdmin: user.isAdmin
            };
          }
          return null;
        })
      );

      // Filtrar null values (si algún usuario no existe)
      const validUsers = users.filter(user => user !== null);
      
      res.json(validUsers);
    } catch (error) {
      console.error("Error getting users:", error);
      res.status(500).json({ message: "Error getting users" });
    }
  });

  // === USER ROUTES ===
  
  // Get calendar data for a specific year
  app.get("/api/user/calendar/:year", async (req: Request, res: Response) => {
    try {
      const year = req.params.year;
      const calendarData = await storage.getCalendarDataByYear(year);
      res.json(calendarData);
    } catch (error) {
      res.status(500).json({ message: "Error fetching calendar data" });
    }
  });
  
  // Get user reservations for a specific year
  app.get("/api/user/reservations/:year", async (req: Request, res: Response) => {
    try {
      const year = req.params.year;
      // Obtener el userId del parámetro o usar el default (2: Luis Glez)
      const userId = parseInt(req.query.userId as string) || 2;
      
      console.log(`Obteniendo reservas para el usuario con ID: ${userId} en el año: ${year}`);
      
      const reservations = await storage.getUserReservationsByYear(userId, year);
      
      console.log(`Reservas encontradas: ${reservations.length}`);
      console.log("Reservas:", JSON.stringify(reservations.map(r => ({ id: r.id, userId: r.userId, startDate: r.startDate, status: r.status }))));
      
      res.json(reservations);
    } catch (error) {
      console.error("Error obteniendo reservas de usuario:", error);
      res.status(500).json({ message: "Error fetching user reservations" });
    }
  });
  
  // Create a new reservation
  app.post("/api/user/reservations", async (req: Request, res: Response) => {
    try {
      console.log("Received reservation data:", req.body);
      
      // Manual handling for date conversion
      const startDate = new Date(req.body.startDate);
      const endDate = new Date(req.body.endDate);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ 
          message: "Invalid date format", 
          received: { startDate: req.body.startDate, endDate: req.body.endDate } 
        });
      }
      
      // Verificar que no haya reservas aprobadas que se solapen con el rango de fechas solicitado
      const year = startDate.getFullYear().toString();
      const existingReservations = await storage.getReservationsByYear(year);
      
      // Función para verificar si dos rangos de fechas se solapan
      const datesOverlap = (startA: Date, endA: Date, startB: Date, endB: Date): boolean => {
        return startA <= endB && startB <= endA;
      };
      
      // Comprobar si hay alguna reserva aprobada que se solape
      const hasConflict = existingReservations.some(reservation => {
        // Solo considerar reservas aprobadas
        if (reservation.status !== 'approved') return false;
        
        // Verificar solapamiento
        return datesOverlap(
          startDate, 
          endDate,
          new Date(reservation.startDate), 
          new Date(reservation.endDate)
        );
      });
      
      if (hasConflict) {
        return res.status(400).json({ 
          message: "El rango de fechas seleccionado incluye días que ya están ocupados por otra reserva aprobada." 
        });
      }
      
      const validatedData = {
        userId: parseInt(req.body.userId) || 2, // Obtener el ID del usuario desde el body o defaultear a Luis Glez (ID: 2)
        startDate: startDate,
        endDate: endDate,
        numberOfGuests: parseInt(req.body.numberOfGuests) || 2,
        notes: req.body.notes || ""
      };
      
      console.log("Processed reservation data:", validatedData);
      
      const reservation = await storage.createReservation(validatedData);
      
      try {
        // Obtener información del usuario
        const userInfo = await UserService.getUserInfo(validatedData.userId);
        
        // Enviar email al administrador
        await EmailService.sendNewReservationNotificationToAdmin(reservation, userInfo.username);
        
        // Enviar confirmación al usuario
        await EmailService.sendReservationConfirmationToUser(
          reservation, 
          userInfo.username, 
          userInfo.email
        );
        
        console.log("Email notifications sent successfully");
      } catch (emailError) {
        console.error("Error sending email notifications:", emailError);
        // No fallamos la solicitud si los emails fallan
      }
      
      res.status(201).json(reservation);
    } catch (error) {
      console.error("Reservation error:", error);
      res.status(500).json({ message: "Error creating reservation" });
    }
  });
  
  // Modificar una reserva existente
  app.patch("/api/user/reservations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verificar que la reserva existe
      const existingReservation = await storage.getReservation(id);
      if (!existingReservation) {
        return res.status(404).json({ message: "Reserva no encontrada" });
      }
      
      // Verificar que el usuario es el propietario de la reserva
      const userId = parseInt(req.query.userId as string);
      if (existingReservation.userId !== userId) {
        return res.status(403).json({ message: "No tienes permiso para modificar esta reserva" });
      }
      
      // Verificar que la reserva no ha pasado
      const currentDate = new Date();
      if (new Date(existingReservation.startDate) <= currentDate) {
        return res.status(400).json({ message: "No se puede modificar una reserva que ya ha comenzado o pasado" });
      }
      
      try {
        // Validar los datos de actualización
        const parsedData = updateReservationSchema.parse(req.body);
        
        // Verificar que no hay conflictos con otras reservas aprobadas
        const year = new Date(parsedData.startDate).getFullYear().toString();
        const existingReservations = await storage.getReservationsByYear(year);
        
        // Función para verificar si dos rangos de fechas se solapan
        const datesOverlap = (startA: Date, endA: Date, startB: Date, endB: Date): boolean => {
          return startA <= endB && startB <= endA;
        };
        
        // Comprobar si hay alguna reserva aprobada que se solape (excepto la que estamos modificando)
        const hasConflict = existingReservations.some(reservation => {
          // No considerar la reserva que estamos modificando
          if (reservation.id === id) return false;
          
          // Solo considerar reservas aprobadas
          if (reservation.status !== 'approved') return false;
          
          // Verificar solapamiento
          return datesOverlap(
            new Date(parsedData.startDate),
            new Date(parsedData.endDate),
            new Date(reservation.startDate),
            new Date(reservation.endDate)
          );
        });
        
        if (hasConflict) {
          return res.status(400).json({
            message: "El rango de fechas seleccionado incluye días que ya están ocupados por otra reserva aprobada."
          });
        }
        
        // Actualizar la reserva
        const updatedReservation = await storage.updateReservation(id, parsedData);
        
        if (!updatedReservation) {
          return res.status(500).json({ message: "Error al actualizar la reserva" });
        }
        
        // Enviar notificaciones por email
        try {
          const userInfo = await UserService.getUserInfo(existingReservation.userId);
          
          // Notificar al usuario
          await EmailService.sendReservationStatusUpdateToUser(
            updatedReservation,
            userInfo.username,
            userInfo.email
          );
          
          // Notificar al administrador
          await EmailService.sendNewReservationNotificationToAdmin(
            updatedReservation,
            userInfo.username
          );
          
          console.log("Notificaciones de modificación enviadas");
        } catch (emailError) {
          console.error("Error al enviar notificaciones de modificación:", emailError);
        }
        
        res.json(updatedReservation);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          return res.status(400).json({ 
            message: "Datos de actualización inválidos", 
            errors: validationError.errors 
          });
        }
        throw validationError;
      }
    } catch (error) {
      console.error("Error al modificar reserva:", error);
      res.status(500).json({ message: "Error interno al modificar la reserva" });
    }
  });
  
  // Cancelar una reserva
  app.delete("/api/user/reservations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verificar que la reserva existe
      const existingReservation = await storage.getReservation(id);
      if (!existingReservation) {
        return res.status(404).json({ message: "Reserva no encontrada" });
      }
      
      // Verificar que el usuario es el propietario de la reserva
      const userId = parseInt(req.query.userId as string);
      if (existingReservation.userId !== userId) {
        return res.status(403).json({ message: "No tienes permiso para cancelar esta reserva" });
      }
      
      // Cancelar la reserva
      const cancelledReservation = await storage.cancelReservation(id);
      
      if (!cancelledReservation) {
        return res.status(400).json({ 
          message: "No se puede cancelar la reserva. Posiblemente ya ha comenzado o pasado." 
        });
      }
      
      // Enviar notificaciones por email
      try {
        const userInfo = await UserService.getUserInfo(existingReservation.userId);
        
        // Notificar al usuario
        await EmailService.sendReservationStatusUpdateToUser(
          cancelledReservation,
          userInfo.username,
          userInfo.email
        );
        
        console.log("Notificación de cancelación enviada al usuario");
      } catch (emailError) {
        console.error("Error al enviar notificación de cancelación:", emailError);
      }
      
      res.json(cancelledReservation);
    } catch (error) {
      console.error("Error al cancelar reserva:", error);
      res.status(500).json({ message: "Error interno al cancelar la reserva" });
    }
  });

  // === ADMIN ROUTES ===
  
  // Get stats for a specific year
  app.get("/api/admin/stats/:year", async (req: Request, res: Response) => {
    try {
      const year = req.params.year;
      console.log(`Obteniendo estadísticas para el año ${year}`);
      
      const stats = await storage.getReservationStatsByYear(year);
      console.log(`Estadísticas obtenidas correctamente: ${JSON.stringify(stats, null, 2)}`);
      
      res.json(stats);
    } catch (error) {
      console.error("Error obteniendo estadísticas:", error);
      res.status(500).json({ message: "Error fetching stats" });
    }
  });
  
  // Get all reservations for a specific year
  app.get("/api/admin/reservations/:year", async (req: Request, res: Response) => {
    try {
      const year = req.params.year;
      console.log(`Obteniendo reservas aprobadas para el año ${year}`);
      
      const reservations = await storage.getApprovedReservationsByYear(year);
      console.log(`Obtenidas ${reservations.length} reservas aprobadas`);
      
      // Get usernames for each reservation
      const reservationsWithUsernames = await Promise.all(
        reservations.map(async (reservation) => {
          const user = await storage.getUser(reservation.userId);
          return {
            ...reservation,
            username: user?.username || "Unknown User"
          };
        })
      );
      
      console.log(`Devolviendo ${reservationsWithUsernames.length} reservas con nombres de usuario`);
      res.json(reservationsWithUsernames);
    } catch (error) {
      console.error("Error obteniendo reservas:", error);
      res.status(500).json({ message: "Error fetching reservations" });
    }
  });
  
  // Get all reservations for a specific year (including all statuses)
  app.get("/api/admin/all-reservations/:year", async (req: Request, res: Response) => {
    try {
      const year = req.params.year;
      const reservations = await storage.getReservationsByYear(year);
      
      // Get usernames for each reservation
      const reservationsWithUsernames = await Promise.all(
        reservations.map(async (reservation) => {
          const user = await storage.getUser(reservation.userId);
          return {
            ...reservation,
            username: user?.username || "Unknown User"
          };
        })
      );
      
      res.json(reservationsWithUsernames);
    } catch (error) {
      res.status(500).json({ message: "Error fetching reservations" });
    }
  });
  
  // Get pending reservations
  app.get("/api/admin/reservations/pending/:year", async (req: Request, res: Response) => {
    try {
      const year = req.params.year;
      const pendingReservations = await storage.getPendingReservationsByYear(year);
      
      // Get usernames for each reservation
      const pendingWithUsernames = await Promise.all(
        pendingReservations.map(async (reservation) => {
          const user = await storage.getUser(reservation.userId);
          return {
            ...reservation,
            username: user?.username || "Unknown User"
          };
        })
      );
      
      res.json(pendingWithUsernames);
    } catch (error) {
      res.status(500).json({ message: "Error fetching pending reservations" });
    }
  });
  
  // Get reservation history (approved or rejected)
  app.get("/api/admin/reservations/history/:year", async (req: Request, res: Response) => {
    try {
      const year = req.params.year;
      const historyReservations = await storage.getReservationHistoryByYear(year);
      
      // Get usernames for each reservation
      const historyWithUsernames = await Promise.all(
        historyReservations.map(async (reservation) => {
          const user = await storage.getUser(reservation.userId);
          return {
            ...reservation,
            username: user?.username || "Unknown User"
          };
        })
      );
      
      res.json(historyWithUsernames);
    } catch (error) {
      res.status(500).json({ message: "Error fetching reservation history" });
    }
  });
  
  // Update reservation status
  app.patch("/api/admin/reservations/:id/status", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = updateReservationStatusSchema.parse(req.body);
      
      const originalReservation = await storage.getReservation(id);
      if (!originalReservation) {
        res.status(404).json({ message: "Reservation not found" });
        return;
      }
      
      const updatedReservation = await storage.updateReservationStatus(id, validatedData);
      
      if (!updatedReservation) {
        res.status(404).json({ message: "Error updating reservation" });
        return;
      }
      
      try {
        // Obtener la información del usuario
        const user = await storage.getUser(updatedReservation.userId);
        const userInfo = await UserService.getUserInfo(updatedReservation.userId);
        
        if (user && updatedReservation.status !== originalReservation.status) {
          // Enviar email al usuario sobre el cambio de estado
          await EmailService.sendReservationStatusUpdateToUser(
            updatedReservation,
            userInfo.username,
            userInfo.email,
            validatedData.adminMessage || ""
          );
          
          console.log(`Email de actualización de estado enviado a ${userInfo.email}`);
        }
      } catch (emailError) {
        console.error("Error al enviar email de actualización de estado:", emailError);
        // No fallamos la solicitud si los emails fallan
      }
      
      res.json(updatedReservation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid status data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error updating reservation status" });
      }
    }
  });

  return httpServer;
}
