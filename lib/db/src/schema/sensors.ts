import { pgTable, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sensorsTable = pgTable("sensors", {
  id_sensor: text("id_sensor").primaryKey(),
  nombre_zona: text("nombre_zona").notNull(),
  umbral_humedad_min: real("umbral_humedad_min").notNull().default(30),
  umbral_humedad_max: real("umbral_humedad_max").notNull().default(80),
  umbral_ec_max: real("umbral_ec_max").notNull().default(3.0),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertSensorSchema = createInsertSchema(sensorsTable);
export type InsertSensor = z.infer<typeof insertSensorSchema>;
export type Sensor = typeof sensorsTable.$inferSelect;
