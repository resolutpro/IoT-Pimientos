import mqtt from "mqtt";
import { db, readingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { checkThresholdsAndAlert } from "./telegram";
import { getSensorsConfig } from "./sensors";

let mqttClient: mqtt.MqttClient | null = null;

function parsePayload(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw);
  } catch {
    logger.warn({ raw }, "Could not parse MQTT payload as JSON");
    return null;
  }
}

async function handleMessage(topic: string, payload: Buffer): Promise<void> {
  const raw = payload.toString();
  logger.info({ topic, raw }, "MQTT message received");

  try {
    const sensors = await getSensorsConfig();
    
    let sensor = sensors.find((s) => s.mqtt_topic === topic);
    let sensorId = sensor?.id_sensor;

    if (!sensor) {
      const parts = topic.split("/");
      if (parts.length === 3 && parts[0] === "finca" && parts[2] === "datos") {
        sensorId = parts[1];
        sensor = sensors.find((s) => s.id_sensor === sensorId);
      }
    }

    if (!sensor || !sensorId) {
      logger.warn({ topic }, "Received data for unknown sensor or topic, skipping");
      return;
    }

    const rawData = parsePayload(raw);
    if (!rawData) return;

    const mapKey = (stdKey: string) => {
      const rawKey = sensor!.mapeo_variables?.[stdKey] || stdKey;
      const val = rawData[rawKey];
      if (val !== undefined && val !== null) {
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
      sensor_id: sensorId,
      humedad,
      temperatura,
      ec,
      bateria,
      senal,
    });

    logger.info({ sensorId }, "Reading saved");

    await checkThresholdsAndAlert(
      sensorId,
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
  } catch (err) {
    logger.error({ err, topic }, "Error processing MQTT message");
  }
}

export function startMqttClient(): void {
  let brokerUrl = process.env["MQTT_BROKER_URL"];
  if (!brokerUrl) {
    logger.warn("MQTT_BROKER_URL not set, MQTT client will not start");
    return;
  }

  if (!brokerUrl.startsWith("mqtt://") && !brokerUrl.startsWith("mqtts://") && !brokerUrl.startsWith("ws://") && !brokerUrl.startsWith("wss://")) {
    brokerUrl = `mqtt://${brokerUrl}`;
  }

  const options: mqtt.IClientOptions = {};

  const username = process.env["MQTT_USERNAME"];
  const password = process.env["MQTT_PASSWORD"];
  if (username) options.username = username;
  if (password) options.password = password;

  mqttClient = mqtt.connect(brokerUrl, options);

  mqttClient.on("connect", () => {
    logger.info({ brokerUrl }, "MQTT connected");

    getSensorsConfig().then(sensors => {
      const topics = new Set<string>();
      topics.add("finca/+/datos"); // standard fallback
      
      for (const s of sensors) {
        if (s.mqtt_topic) topics.add(s.mqtt_topic);
      }

      for (const t of topics) {
        mqttClient!.subscribe(t, { qos: 1 }, (err) => {
          if (err) {
            logger.error({ err, topic: t }, "MQTT subscribe error");
          } else {
            logger.info({ topic: t }, "Subscribed to topic");
          }
        });
      }
    }).catch(err => {
      logger.error({ err }, "Failed to load sensors config for MQTT subscription");
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
