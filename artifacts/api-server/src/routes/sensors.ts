import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { readingsTable } from "@workspace/db";
import { eq, desc, gte, lte, and } from "drizzle-orm";
import type { Sensor, Reading } from "@workspace/db";
import { getSensorsConfig } from "../lib/sensors";

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
  const sensors = await getSensorsConfig();
  res.json(sensors);
});

router.get("/sensors/summary", async (_req, res) => {
  const sensors = await getSensorsConfig();

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
  const sensors = await getSensorsConfig();
  const sensor = sensors.find((s) => s.id_sensor === req.params.id);

  if (!sensor) {
    res.status(404).json({ error: "Sensor not found" });
    return;
  }

  res.json(sensor);
});

router.get("/sensors/:id/readings", async (req, res) => {
  const fromQuery = req.query["from"] as string | undefined;
  const toQuery = req.query["to"] as string | undefined;
  const rangeQuery = req.query["range"] as string | undefined;

  const sensors = await getSensorsConfig();
  const sensor = sensors.find((s) => s.id_sensor === req.params.id);

  if (!sensor) {
    res.status(404).json({ error: "Sensor not found" });
    return;
  }

  let fromDate: Date;
  let toDate = new Date(); // now

  if (fromQuery) {
    fromDate = new Date(fromQuery);
  } else if (rangeQuery === "7d") {
    fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  } else {
    fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h default
  }

  if (toQuery) {
    toDate = new Date(toQuery);
  }

  const readings = await db
    .select()
    .from(readingsTable)
    .where(
      and(
        eq(readingsTable.sensor_id, req.params.id),
        gte(readingsTable.timestamp, fromDate),
        lte(readingsTable.timestamp, toDate)
      )
    )
    .orderBy(readingsTable.timestamp);

  res.json(readings);
});

export default router;
