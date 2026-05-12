import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sensorsTable, readingsTable } from "@workspace/db";
import { eq, desc, gte, and } from "drizzle-orm";
import type { Sensor, Reading } from "@workspace/db";

const router: IRouter = Router();

function computeStatus(
  reading: Reading | null,
  sensor: Sensor
): { status: "ok" | "warning" | "critical" | "unknown"; alerts: string[] } {
  if (!reading) return { status: "unknown", alerts: [] };

  const alerts: string[] = [];
  let worstLevel = 0;

  const { humedad, ec, bateria } = reading;

  if (humedad !== null && humedad !== undefined) {
    if (humedad < sensor.umbral_humedad_min) {
      alerts.push("Estres hidrico: humedad baja");
      worstLevel = Math.max(worstLevel, 2);
    } else if (humedad > sensor.umbral_humedad_max) {
      alerts.push("Asfixia radicular: humedad alta");
      worstLevel = Math.max(worstLevel, 2);
    }
  }

  if (ec !== null && ec !== undefined) {
    if (ec > sensor.umbral_ec_max) {
      alerts.push("Estres salino: EC alto");
      worstLevel = Math.max(worstLevel, 2);
    }
  }

  if (bateria !== null && bateria !== undefined) {
    if (bateria < 20) {
      alerts.push("Bateria baja");
      worstLevel = Math.max(worstLevel, 1);
    }
  }

  const status =
    worstLevel === 0 ? "ok" : worstLevel === 1 ? "warning" : "critical";
  return { status, alerts };
}

router.get("/sensors", async (_req, res) => {
  const sensors = await db.select().from(sensorsTable).orderBy(sensorsTable.nombre_zona);
  res.json(sensors);
});

router.post("/sensors", async (req, res) => {
  const { id_sensor, nombre_zona, umbral_humedad_min, umbral_humedad_max, umbral_ec_max } =
    req.body as {
      id_sensor: string;
      nombre_zona: string;
      umbral_humedad_min: number;
      umbral_humedad_max: number;
      umbral_ec_max: number;
    };

  if (!id_sensor || !nombre_zona) {
    res.status(400).json({ error: "id_sensor and nombre_zona are required" });
    return;
  }

  const existing = await db
    .select()
    .from(sensorsTable)
    .where(eq(sensorsTable.id_sensor, id_sensor))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Sensor ID already exists" });
    return;
  }

  const [created] = await db
    .insert(sensorsTable)
    .values({ id_sensor, nombre_zona, umbral_humedad_min, umbral_humedad_max, umbral_ec_max })
    .returning();

  res.status(201).json(created);
});

router.get("/sensors/summary", async (_req, res) => {
  const sensors = await db.select().from(sensorsTable).orderBy(sensorsTable.nombre_zona);

  const summaries = await Promise.all(
    sensors.map(async (sensor) => {
      const [latestReading] = await db
        .select()
        .from(readingsTable)
        .where(eq(readingsTable.sensor_id, sensor.id_sensor))
        .orderBy(desc(readingsTable.timestamp))
        .limit(1);

      const { status, alerts } = computeStatus(latestReading ?? null, sensor);

      return {
        sensor,
        latestReading: latestReading ?? null,
        status,
        alerts,
      };
    })
  );

  res.json(summaries);
});

router.get("/sensors/:id", async (req, res) => {
  const [sensor] = await db
    .select()
    .from(sensorsTable)
    .where(eq(sensorsTable.id_sensor, req.params.id))
    .limit(1);

  if (!sensor) {
    res.status(404).json({ error: "Sensor not found" });
    return;
  }

  res.json(sensor);
});

router.put("/sensors/:id", async (req, res) => {
  const { nombre_zona, umbral_humedad_min, umbral_humedad_max, umbral_ec_max } =
    req.body as {
      nombre_zona?: string;
      umbral_humedad_min?: number;
      umbral_humedad_max?: number;
      umbral_ec_max?: number;
    };

  const updates: Partial<Sensor> = {};
  if (nombre_zona !== undefined) updates.nombre_zona = nombre_zona;
  if (umbral_humedad_min !== undefined) updates.umbral_humedad_min = umbral_humedad_min;
  if (umbral_humedad_max !== undefined) updates.umbral_humedad_max = umbral_humedad_max;
  if (umbral_ec_max !== undefined) updates.umbral_ec_max = umbral_ec_max;

  const [updated] = await db
    .update(sensorsTable)
    .set(updates)
    .where(eq(sensorsTable.id_sensor, req.params.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Sensor not found" });
    return;
  }

  res.json(updated);
});

router.delete("/sensors/:id", async (req, res) => {
  const [deleted] = await db
    .delete(sensorsTable)
    .where(eq(sensorsTable.id_sensor, req.params.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Sensor not found" });
    return;
  }

  res.status(204).send();
});

router.get("/sensors/:id/readings/:range", async (req, res) => {
  const { range = "24h" } = req.params;

  const [sensor] = await db
    .select()
    .from(sensorsTable)
    .where(eq(sensorsTable.id_sensor, req.params.id))
    .limit(1);

  if (!sensor) {
    res.status(404).json({ error: "Sensor not found" });
    return;
  }

  const hours = range === "7d" ? 7 * 24 : 24;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const readings = await db
    .select()
    .from(readingsTable)
    .where(
      and(
        eq(readingsTable.sensor_id, req.params.id),
        gte(readingsTable.timestamp, since)
      )
    )
    .orderBy(readingsTable.timestamp);

  res.json(readings);
});

export default router;
