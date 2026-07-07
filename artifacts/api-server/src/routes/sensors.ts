import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { readingsTable, sensorsTable } from "@workspace/db";
import { eq, desc, gte, lte, and } from "drizzle-orm";
import type { Sensor, Reading } from "@workspace/db";
import { getSensorsConfig } from "../lib/sensors";
import { getWateringRecommendation } from "../lib/wateringLogic";
import { getRainForecast, get7DayForecast } from "../lib/weather";

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
      
      let recommendation = null;
      let rain_forecast = null;

      if (sensor.ubicacion) {
        rain_forecast = await getRainForecast(sensor.ubicacion.lat, sensor.ubicacion.lon);
      }

      if (sensor.tipo === "riego") {
        recommendation = await getWateringRecommendation(sensor.id_sensor, sensor as any);
      }

      return {
        sensor,
        latestReading: latestReading ?? null,
        status,
        alerts,
        recommendation,
        rain_forecast,
      };
    })
  );

  res.json(summaries);
});

router.get("/sensors", async (req: Request, res: Response) => {
  const sensors = await db.select().from(sensorsTable);
  const configList = await getSensorsConfig();

  const mappedSensors = sensors.map(s => {
    const config = configList.find(c => c.id_sensor === s.id_sensor);
    return {
      ...s,
      ubicacion: config?.ubicacion ?? null
    };
  });

  res.json(mappedSensors);
});

router.get("/sensors/:id", async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const sensor = await db
    .select()
    .from(sensorsTable)
    .where(eq(sensorsTable.id_sensor, id))
    .limit(1);

  if (sensor.length === 0) {
    res.status(404).json({ error: "Sensor not found" });
    return;
  }

  const configList = await getSensorsConfig();
  const config = configList.find(c => c.id_sensor === id);

  res.json({
    ...sensor[0],
    ubicacion: config?.ubicacion ?? null
  });
});

router.get("/sensors/:id/weather", async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const configList = await getSensorsConfig();
  const config = configList.find(c => c.id_sensor === id);

  if (!config || !config.ubicacion) {
    res.status(404).json({ error: "Sensor not found or has no location configured" });
    return;
  }

  const forecast = await get7DayForecast(config.ubicacion.lat, config.ubicacion.lon);
  if (!forecast) {
    res.status(500).json({ error: "Failed to fetch weather forecast" });
    return;
  }

  res.json(forecast);
});

router.get("/sensors/:id/readings", async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const fromQuery = req.query["from"] as string | undefined;
  const toQuery = req.query["to"] as string | undefined;
  const rangeQuery = req.query["range"] as string | undefined;

  const sensors = await getSensorsConfig();
  const sensor = sensors.find((s) => s.id_sensor === id);

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
        eq(readingsTable.sensor_id, id),
        gte(readingsTable.timestamp, fromDate),
        lte(readingsTable.timestamp, toDate)
      )
    )
    .orderBy(readingsTable.timestamp);

  res.json(readings);
});

export default router;
