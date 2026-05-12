import { pgTable, serial, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sensorsTable } from "./sensors";

export const readingsTable = pgTable("readings", {
  id: serial("id").primaryKey(),
  sensor_id: text("sensor_id")
    .notNull()
    .references(() => sensorsTable.id_sensor, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  humedad: real("humedad"),
  temperatura: real("temperatura"),
  ec: real("ec"),
  bateria: real("bateria"),
  senal: real("senal"),
});

export const insertReadingSchema = createInsertSchema(readingsTable).omit({ id: true });
export type InsertReading = z.infer<typeof insertReadingSchema>;
export type Reading = typeof readingsTable.$inferSelect;
