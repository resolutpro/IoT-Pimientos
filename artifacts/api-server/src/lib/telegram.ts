import TelegramBot from "node-telegram-bot-api";
import { logger } from "./logger";

let bot: TelegramBot | null = null;

const ALERT_DEBOUNCE_MS = 60 * 60 * 1000;
const alertTimestamps = new Map<string, number>();

function getBot(): TelegramBot | null {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  if (!token) return null;
  if (!bot) {
    bot = new TelegramBot(token);
  }
  return bot;
}

function shouldSendAlert(key: string): boolean {
  const last = alertTimestamps.get(key);
  const now = Date.now();
  if (!last || now - last > ALERT_DEBOUNCE_MS) {
    alertTimestamps.set(key, now);
    return true;
  }
  return false;
}

export async function sendTelegramAlert(message: string, key: string): Promise<void> {
  const chatId = process.env["TELEGRAM_CHAT_ID"];
  if (!chatId) return;

  const telegramBot = getBot();
  if (!telegramBot) return;

  if (!shouldSendAlert(key)) return;

  try {
    await telegramBot.sendMessage(chatId, message, { parse_mode: "HTML" });
    logger.info({ key }, "Telegram alert sent");
  } catch (err) {
    logger.error({ err, key }, "Failed to send Telegram alert");
  }
}

export async function checkThresholdsAndAlert(
  sensorId: string,
  zoneName: string,
  humedad: number | null | undefined,
  ec: number | null | undefined,
  bateria: number | null | undefined,
  thresholds: {
    umbral_humedad_min: number;
    umbral_humedad_max: number;
    umbral_ec_max: number;
  }
): Promise<void> {
  if (humedad !== null && humedad !== undefined) {
    if (humedad < thresholds.umbral_humedad_min) {
      await sendTelegramAlert(
        `<b>ALERTA - Estres Hidrico</b>\nSensor: <code>${sensorId}</code>\nZona: ${zoneName}\nHumedad: ${humedad.toFixed(1)}% (min: ${thresholds.umbral_humedad_min}%)\nRiesgo de caida de flor y podredumbre apical.`,
        `${sensorId}:humedad_min`
      );
    }

    if (humedad > thresholds.umbral_humedad_max) {
      await sendTelegramAlert(
        `<b>ALERTA - Asfixia Radicular</b>\nSensor: <code>${sensorId}</code>\nZona: ${zoneName}\nHumedad: ${humedad.toFixed(1)}% (max: ${thresholds.umbral_humedad_max}%)\nRiesgo de hongos por exceso de humedad.`,
        `${sensorId}:humedad_max`
      );
    }
  }

  if (ec !== null && ec !== undefined) {
    if (ec > thresholds.umbral_ec_max) {
      await sendTelegramAlert(
        `<b>ALERTA - Estres Salino</b>\nSensor: <code>${sensorId}</code>\nZona: ${zoneName}\nEC: ${ec.toFixed(2)} dS/m (max: ${thresholds.umbral_ec_max} dS/m)\nRiesgo de intoxicacion por sales.`,
        `${sensorId}:ec_max`
      );
    }
  }

  if (bateria !== null && bateria !== undefined) {
    if (bateria < 20) {
      await sendTelegramAlert(
        `<b>AVISO - Bateria Baja</b>\nSensor: <code>${sensorId}</code>\nZona: ${zoneName}\nBateria: ${bateria.toFixed(0)}%\nRevise la alimentacion del sensor.`,
        `${sensorId}:bateria`
      );
    }
  }
}
