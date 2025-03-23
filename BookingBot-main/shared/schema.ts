import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password"),
  isAdmin: boolean("is_admin").default(false).notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  isAdmin: true,
});

// Reservations table
export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  numberOfGuests: integer("number_of_guests").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected, modified, cancelled
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define a custom schema with proper date validation
export const insertReservationSchema = z.object({
  userId: z.number(),
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
  numberOfGuests: z.number(),
  notes: z.string().optional(),
  status: z.enum(["pending", "approved", "rejected", "modified", "cancelled"]).optional(),
});

export const updateReservationStatusSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "modified", "cancelled"]),
  adminMessage: z.string().optional() // Mensaje opcional del administrador
});

// Schema para modificación de reservas por el usuario
export const updateReservationSchema = z.object({
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
  numberOfGuests: z.number().int().min(1).max(10),
  notes: z.string().optional(),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = z.infer<typeof insertReservationSchema>;
export type UpdateReservationStatus = z.infer<typeof updateReservationStatusSchema>;
export type UpdateReservation = z.infer<typeof updateReservationSchema>;

// Statistics type for dashboard
export type ReservationStats = {
  totalReservations: number;
  occupiedDays: number;
  frequentUser: string;
  occupancyRate: number;
  reservationsByMonth: { month: number; count: number }[];
  reservationsByUser: { username: string; count: number }[];
};
