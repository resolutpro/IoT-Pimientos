import { logger } from "./logger";

interface WeatherCache {
  forecast: boolean;
  timestamp: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map<string, WeatherCache>();

export async function getRainForecast(lat: number, lon: number): Promise<boolean> {
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const cached = cache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.forecast;
  }

  try {
    // We check if there's any precipitation expected today or tomorrow
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum&timezone=Europe%2FMadrid`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.statusText}`);
    }

    const data = await response.json() as any;
    const precipitationSum = data.daily?.precipitation_sum;

    // Check if precipitation > 1mm is expected today or tomorrow
    let willRain = false;
    if (precipitationSum && precipitationSum.length >= 2) {
      if (precipitationSum[0] > 1.0 || precipitationSum[1] > 1.0) {
        willRain = true;
      }
    }

    cache.set(cacheKey, { forecast: willRain, timestamp: now });
    return willRain;
  } catch (error) {
    logger.error({ error, lat, lon }, "Failed to fetch weather forecast");
    // Fallback: assume no rain if API fails, to err on the side of watering
    return false;
  }
}

export interface DailyForecast {
  date: string;
  temp_max: number;
  temp_min: number;
  precipitation_sum: number;
  weathercode: number;
}

const forecastCache = new Map<string, { data: DailyForecast[]; timestamp: number }>();

export async function get7DayForecast(lat: number, lon: number): Promise<DailyForecast[] | null> {
  const cacheKey = `7d_${lat.toFixed(4)},${lon.toFixed(4)}`;
  const cached = forecastCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Europe%2FMadrid`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.statusText}`);
    }

    const data = await response.json() as any;
    
    if (!data.daily || !data.daily.time) {
      return null;
    }

    const forecast: DailyForecast[] = data.daily.time.map((time: string, index: number) => ({
      date: time,
      temp_max: data.daily.temperature_2m_max[index],
      temp_min: data.daily.temperature_2m_min[index],
      precipitation_sum: data.daily.precipitation_sum[index],
      weathercode: data.daily.weathercode[index],
    }));

    forecastCache.set(cacheKey, { data: forecast, timestamp: now });
    return forecast;
  } catch (error) {
    logger.error({ error, lat, lon }, "Failed to fetch 7-day weather forecast");
    return null;
  }
}
