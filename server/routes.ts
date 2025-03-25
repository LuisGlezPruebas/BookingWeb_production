import type { Request, Response } from "express";
import { Express } from "express";
import { z } from "zod";

import { storage } from "./storage";
import { EmailService } from "./services/email.service";
import { UserService } from "./services/user.service";
import {
  insertReservationSchema,
  updateReservationStatusSchema,
  updateReservationSchema,
} from "../shared/schema";

export function registerRoutes(app: Express): void {
  // === USER ROUTES ===

  app.get("/api/users", async (_req, res) => {
    try {
      const users = await Promise.all(
        Array.from({ length: 7 }, (_, i) => i + 1).map(async (id) => {
          const user = await storage.getUser(id);
          return user ? { id: user.id, username: user.username, isAdmin: user.isAdmin } : null;
        })
      );
      res.json(users.filter(Boolean));
    } catch (error) {
      res.status(500).json({ message: "Error getting users" });
    }
  });

  app.get("/api/user/calendar/:year", async (req, res) => {
    try {
      const year = req.params.year;
      const calendar = await storage.getCalendarDataByYear(year);
      res.json(calendar);
    } catch (error) {
      res.status(500).json({ message: "Error fetching calendar data" });
    }
  });

  app.get("/api/user/reservations/:year", async (req, res) => {
    try {
      const year = req.params.year;
      const userId = parseInt(req.query.userId as string) || 2;
      const reservations = await storage.getUserReservationsByYear(userId, year);
      res.json(reservations);
    } catch (error) {
      res.status(500).json({ message: "Error fetching reservations" });
    }
  });

  app.post("/api/user/reservations", async (req, res) => {
    try {
      const result = insertReservationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error.errors });
      }

      const reservation = await storage.createReservation(result.data);
      const user = await UserService.getUserInfo(result.data.userId);

      await EmailService.sendNewReservationNotificationToAdmin(reservation, user.username);
      await EmailService.sendReservationConfirmationToUser(reservation, user.username, user.email);

      res.status(201).json(reservation);
    } catch (error) {
      res.status(500).json({ message: "Error creating reservation" });
    }
  });

  app.patch("/api/user/reservations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = parseInt(req.query.userId as string);

      const existing = await storage.getReservation(id);
      if (!existing) return res.status(404).json({ message: "Not found" });
      if (existing.userId !== userId) return res.status(403).json({ message: "Forbidden" });

      const parsed = updateReservationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }

      const updated = await storage.updateReservation(id, parsed.data);
      const user = await UserService.getUserInfo(userId);

      if (updated) {
        await EmailService.sendReservationStatusUpdateToUser(updated, user.username, user.email);
        await EmailService.sendNewReservationNotificationToAdmin(updated, user.username);
        return res.json(updated);
      }

      res.status(500).json({ message: "Error updating reservation" });
    } catch (error) {
      res.status(500).json({ message: "Error updating reservation" });
    }
  });

  app.delete("/api/user/reservations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = parseInt(req.query.userId as string);

      const reservation = await storage.getReservation(id);
      if (!reservation) return res.status(404).json({ message: "Not found" });
      if (reservation.userId !== userId) return res.status(403).json({ message: "Forbidden" });

      const cancelled = await storage.cancelReservation(id);
      const user = await UserService.getUserInfo(userId);

      if (cancelled) {
        await EmailService.sendReservationStatusUpdateToUser(cancelled, user.username, user.email);
        return res.json(cancelled);
      }

      res.status(400).json({ message: "Could not cancel reservation" });
    } catch (error) {
      res.status(500).json({ message: "Error cancelling reservation" });
    }
  });

  // === ADMIN ROUTES ===

  app.get("/api/admin/stats/:year", async (req, res) => {
    try {
      const stats = await storage.getReservationStatsByYear(req.params.year);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Error fetching stats" });
    }
  });

  app.get("/api/admin/reservations/:year", async (req, res) => {
    try {
      const reservations = await storage.getApprovedReservationsByYear(req.params.year);
      const enriched = await Promise.all(reservations.map(async r => ({
        ...r,
        username: (await storage.getUser(r.userId))?.username || "Unknown User",
      })));
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ message: "Error fetching reservations" });
    }
  });

  app.get("/api/admin/all-reservations/:year", async (req, res) => {
    try {
      const reservations = await storage.getReservationsByYear(req.params.year);
      const enriched = await Promise.all(reservations.map(async r => ({
        ...r,
        username: (await storage.getUser(r.userId))?.username || "Unknown User",
      })));
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ message: "Error fetching all reservations" });
    }
  });

  app.get("/api/admin/reservations/pending/:year", async (req, res) => {
    try {
      const pending = await storage.getPendingReservationsByYear(req.params.year);
      const enriched = await Promise.all(pending.map(async r => ({
        ...r,
        username: (await storage.getUser(r.userId))?.username || "Unknown User",
      })));
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ message: "Error fetching pending reservations" });
    }
  });

  app.get("/api/admin/reservations/history/:year", async (req, res) => {
    try {
      const history = await storage.getReservationHistoryByYear(req.params.year);
      const enriched = await Promise.all(history.map(async r => ({
        ...r,
        username: (await storage.getUser(r.userId))?.username || "Unknown User",
      })));
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ message: "Error fetching reservation history" });
    }
  });

  app.patch("/api/admin/reservations/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parsed = updateReservationStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
      }

      const original = await storage.getReservation(id);
      if (!original) return res.status(404).json({ message: "Reservation not found" });

      const updated = await storage.updateReservationStatus(id, parsed.data);

      if (!updated) {
        return res.status(500).json({ message: "Error updating reservation status" });
      }

      const user = await UserService.getUserInfo(updated.userId);

      if (original.status !== updated.status) {
        await EmailService.sendReservationStatusUpdateToUser(
          updated,
          user.username,
          user.email,
          parsed.data.adminMessage || ""
        );
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Error updating status" });
    }
  });
}
