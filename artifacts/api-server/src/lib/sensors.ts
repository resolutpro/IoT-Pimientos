import fs from "fs/promises";
import path from "path";
import type { Sensor } from "@workspace/db";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type ConfigSensor = Sensor & { 
  tipo: string;
  mqtt_topic?: string;
  thingspeak_channel_id?: string;
  mapeo_variables?: Record<string, string>;
};

async function findSensorsJson(dir: string): Promise<string | null> {
  const currentPath = path.join(dir, "sensors.json");
  try {
    await fs.access(currentPath);
    return currentPath;
  } catch {
    const parentDir = path.dirname(dir);
    if (parentDir === dir) return null; // Root directory reached
    return findSensorsJson(parentDir);
  }
}

export async function getSensorsConfig(): Promise<ConfigSensor[]> {
  try {
    // Search upwards starting from the current file's directory
    let configPath = await findSensorsJson(__dirname);
    
    // Fallback: search upwards from the current working directory
    if (!configPath) {
      configPath = await findSensorsJson(process.cwd());
    }

    if (!configPath) {
      console.error("Error: sensors.json not found in any parent directories of", __dirname, "or", process.cwd());
      return [];
    }

    const data = await fs.readFile(configPath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading or parsing sensors.json:", err);
    return [];
  }
}
