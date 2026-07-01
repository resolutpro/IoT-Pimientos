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

export async function getSensorsConfig(): Promise<ConfigSensor[]> {
  const possiblePaths = [
    path.resolve(process.cwd(), "sensors.json"),
    path.resolve(process.cwd(), "../../sensors.json"),
    path.resolve(__dirname, "../../../sensors.json"),
    path.resolve(__dirname, "../../../../sensors.json"),
  ];

  for (const configPath of possiblePaths) {
    try {
      const data = await fs.readFile(configPath, "utf-8");
      return JSON.parse(data);
    } catch (err) {
      // continue searching
    }
  }

  console.error("Error reading sensors.json. Looked in:", possiblePaths);
  return [];
}
