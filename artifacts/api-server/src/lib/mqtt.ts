import mqtt from "mqtt";
import { db } from "@workspace/db";
import { sensorsTable, readingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { checkThresholdsAndAlert } from "./telegram";

let mqttClient: mqtt.MqttClient | null = null;

interface SE01Payload {
  humedad?: number;
  temperatura?: number;
  ec?: number;
  bateria?: number;
  senal?: number;
  [key: string]: unknown;
}

function parseSE01Payload(raw: string): SE01Payload | null {
  try {
    const parsed = JSON.parse(raw) as SE01Payload;
    return parsed;
  } catch {
    logger.warn({ raw }, "Could not parse MQTT payload as JSON");
    return null;
  }
}

async function handleMessage(topic: string, payload: Buffer): Promise<void> {
  const raw = payload.toString();
  logger.info({ topic, raw }, "MQTT message received");

  const parts = topic.split("/");
  if (parts.length < 3) {
    logger.warn({ topic }, "Unexpected topic format, expected finca/<id>/datos");
    return;
  }
  const sensorId = parts[1];

  const data = parseSE01Payload(raw);
  if (!data) return;

  try {
    const [sensor] = await db
      .select()
      .from(sensorsTable)
      .where(eq(sensorsTable.id_sensor, sensorId))
      .limit(1);

    if (!sensor) {
      logger.warn({ sensorId }, "Received data for unknown sensor, skipping");
      return;
    }

    await db.insert(readingsTable).values({
      sensor_id: sensorId,
      humedad: data.humedad ?? null,
      temperatura: data.temperatura ?? null,
      ec: data.ec ?? null,
      bateria: data.bateria ?? null,
      senal: data.senal ?? null,
    });

    logger.info({ sensorId }, "Reading saved");

    await checkThresholdsAndAlert(
      sensorId,
      sensor.nombre_zona,
      data.humedad ?? null,
      data.ec ?? null,
      data.bateria ?? null,
      {
        umbral_humedad_min: sensor.umbral_humedad_min,
        umbral_humedad_max: sensor.umbral_humedad_max,
        umbral_ec_max: sensor.umbral_ec_max,
      }
    );
  } catch (err) {
    logger.error({ err, sensorId }, "Error processing MQTT message");
  }
}

export function startMqttClient(): void {
  const brokerUrl = process.env["MQTT_BROKER_URL"];
  if (!brokerUrl) {
    logger.warn("MQTT_BROKER_URL not set, MQTT client will not start");
    return;
  }

  const options: mqtt.IClientOptions = {
    rejectUnauthorized: false,
  };

  const username = process.env["MQTT_USERNAME"];
  const password = process.env["MQTT_PASSWORD"];
  if (username) options.username = username;
  if (password) options.password = password;

  mqttClient = mqtt.connect(brokerUrl, options);

  mqttClient.on("connect", () => {
    logger.info({ brokerUrl }, "MQTT connected");
    mqttClient!.subscribe("finca/+/datos", { qos: 1 }, (err) => {
      if (err) {
        logger.error({ err }, "MQTT subscribe error");
      } else {
        logger.info("Subscribed to finca/+/datos");
      }
    });
  });

  mqttClient.on("message", (topic, payload) => {
    handleMessage(topic, payload).catch((err) => {
      logger.error({ err, topic }, "Unhandled error in MQTT message handler");
    });
  });

  mqttClient.on("error", (err) => {
    logger.error({ err }, "MQTT client error");
  });

  mqttClient.on("reconnect", () => {
    logger.info("MQTT reconnecting...");
  });

  mqttClient.on("offline", () => {
    logger.warn("MQTT client offline");
  });
}

export function stopMqttClient(): void {
  if (mqttClient) {
    mqttClient.end();
    mqttClient = null;
  }
}
