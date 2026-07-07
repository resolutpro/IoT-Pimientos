import { db, readingsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import type { ConfigSensor } from "./sensors";
import { getRainForecast } from "./weather";
import { logger } from "./logger";

export async function getWateringRecommendation(
  sensorId: string,
  sensorConfig: ConfigSensor
): Promise<string | null> {
  if (sensorConfig.tipo !== "riego") {
    return null;
  }

  try {
    // Fetch the last 8 readings (approx 4 hours if readings are every 30 mins)
    const recentReadings = await db
      .select()
      .from(readingsTable)
      .where(eq(readingsTable.sensor_id, sensorId))
      .orderBy(desc(readingsTable.timestamp))
      .limit(8);

    if (recentReadings.length === 0) {
      return null;
    }

    const currentReading = recentReadings[0];
    const currentHumedad = currentReading.humedad;

    if (currentHumedad === null || currentHumedad === undefined) {
      return null;
    }

    const umbralRegar = sensorConfig.umbral_regar ?? 7.8;
    const umbralObjMin = sensorConfig.umbral_objetivo_min ?? 9.0;
    const umbralObjMax = sensorConfig.umbral_objetivo_max ?? 9.5;

    // Rule 2: Evaluate watering event
    // We look for a "watering event" (jump > 1.0) in the past readings, 
    // starting from index 3 or 4 (which means 1.5 to 2 hours ago).
    for (let i = 2; i < recentReadings.length - 1; i++) {
      const readingA = recentReadings[i];
      const readingB = recentReadings[i + 1];

      if (readingA.humedad !== null && readingB.humedad !== null) {
        if (readingA.humedad - readingB.humedad > 1.0) {
          // Watering event detected
          if (currentHumedad >= umbralObjMin && currentHumedad <= umbralObjMax) {
            return `Riego correcto (${umbralObjMin} - ${umbralObjMax})`;
          } else if (currentHumedad < 8.7) {
            return `El riego se ha quedado corto (< 8.7)`;
          } else if (currentHumedad > 10.5) {
            return `Riego excesivo (> 10.5)`;
          }
        }
      }
    }

    // Rule 1: Should we water?
    // Check if the last 3 consecutive readings are <= umbralRegar
    if (recentReadings.length >= 3) {
      const lastThreeReadings = recentReadings.slice(0, 3);
      const lowMoistureCount = lastThreeReadings.filter(r => r.humedad !== null && r.humedad <= umbralRegar).length;

      if (lowMoistureCount === 3) {
        // Check weather
        let willRain = false;
        if (sensorConfig.ubicacion) {
          willRain = await getRainForecast(
            sensorConfig.ubicacion.lat,
            sensorConfig.ubicacion.lon
          );
        }

        if (willRain) {
          return `Sugerencia: NO regar (Humedad <= ${umbralRegar} pero hay lluvia prevista)`;
        } else {
          return `Sugerencia: Regar (Humedad <= ${umbralRegar} en las últimas 3 lecturas)`;
        }
      }
    }

    // Default status if inside normal operational range
    if (currentHumedad >= umbralObjMin && currentHumedad <= umbralObjMax) {
      return `Zona buena (${umbralObjMin} - ${umbralObjMax})`;
    }

    return null;
  } catch (error) {
    logger.error({ error, sensorId }, "Error computing watering recommendation");
    return null;
  }
}
