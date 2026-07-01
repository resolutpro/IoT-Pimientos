import { Router, type IRouter } from "express";
import { db, readingsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { getSensorsConfig } from "../lib/sensors";
import { logger } from "../lib/logger";
import { checkThresholdsAndAlert } from "../lib/telegram";

const router: IRouter = Router();

// Middleware to check Bearer token
router.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  const secret = process.env.THINGSPEAK_WEBHOOK_SECRET;

  if (!secret) {
    logger.warn("THINGSPEAK_WEBHOOK_SECRET is not set. Webhooks will fail.");
    res.status(500).json({ error: "Server misconfiguration" });
    return;
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.substring(7);
  if (token !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
});

router.post("/thingspeak", async (req, res) => {
  try {
    const { channel_id, sensor_id, entry_id, created_at, ...fields } = req.body;

    // Use channel_id from body if present, else fallback to something else, or reject
    const actualChannelId = channel_id ? String(channel_id) : null;
    if (!actualChannelId) {
      res.status(400).json({ error: "Missing channel_id" });
      return;
    }

    const sensors = await getSensorsConfig();
    const sensor = sensors.find((s) => s.thingspeak_channel_id === actualChannelId);

    if (!sensor) {
      logger.warn({ channel_id: actualChannelId }, "Received data for unknown ThingSpeak channel, skipping");
      res.status(404).json({ error: "Sensor not found for this channel" });
      return;
    }

    const actualEntryId = entry_id ? String(entry_id) : null;
    const timestamp = created_at ? new Date(created_at) : new Date();

    // Deduplication check
    if (actualEntryId) {
      const existing = await db
        .select()
        .from(readingsTable)
        .where(
          and(
            eq(readingsTable.channel_id, actualChannelId),
            eq(readingsTable.entry_id, actualEntryId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        logger.info({ channel_id: actualChannelId, entry_id: actualEntryId }, "Duplicate reading, skipping");
        res.status(200).json({ message: "Duplicate, ignored" });
        return;
      }
    }

    // Dynamic mapping
    const rawData = { ...req.body, ...fields };
    
    const mapKey = (stdKey: string) => {
      const rawKey = sensor.mapeo_variables?.[stdKey] || stdKey;
      const val = rawData[rawKey];
      if (val !== undefined && val !== null && val !== "") {
        const num = Number(val);
        return isNaN(num) ? null : num;
      }
      return null;
    };

    const humedad = mapKey("humedad");
    const temperatura = mapKey("temperatura");
    const ec = mapKey("ec");
    const bateria = mapKey("bateria");
    const senal = mapKey("senal");

    await db.insert(readingsTable).values({
      sensor_id: sensor.id_sensor,
      timestamp,
      humedad,
      temperatura,
      ec,
      bateria,
      senal,
      source: "thingspeak",
      channel_id: actualChannelId,
      entry_id: actualEntryId,
    });

    logger.info({ sensorId: sensor.id_sensor }, "ThingSpeak reading saved");

    await checkThresholdsAndAlert(
      sensor.id_sensor,
      sensor.nombre_zona,
      humedad,
      ec,
      bateria,
      {
        umbral_humedad_min: sensor.umbral_humedad_min,
        umbral_humedad_max: sensor.umbral_humedad_max,
        umbral_ec_max: sensor.umbral_ec_max,
      }
    );

    res.status(200).json({ message: "Success" });
  } catch (err) {
    logger.error({ err }, "Error processing ThingSpeak webhook");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
