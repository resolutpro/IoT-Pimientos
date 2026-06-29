import fs from "fs/promises";
import path from "path";
import type { Sensor } from "@workspace/db";

export type ConfigSensor = Sensor & { 
  tipo: string;
  mqtt_topic?: string;
  mapeo_variables?: Record<string, string>;
};

export async function getSensorsConfig(): Promise<ConfigSensor[]> {
  try {
    const configPath = path.resolve(process.cwd(), "../../sensors.json");
    const data = await fs.readFile(configPath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading sensors.json:", err);
    return [];
  }
}
