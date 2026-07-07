import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Cloud, CloudDrizzle, CloudLightning, CloudRain, CloudSnow, Sun, CloudSun } from "lucide-react";
import { useGetSensorWeather } from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface WeatherForecastCardProps {
  sensorId: string;
}

// Map WMO weather codes to Lucide icons
// https://open-meteo.com/en/docs
function getWeatherIcon(code: number) {
  if (code === 0) return <Sun className="w-6 h-6 text-amber-500" />;
  if (code === 1 || code === 2) return <CloudSun className="w-6 h-6 text-amber-400" />;
  if (code === 3) return <Cloud className="w-6 h-6 text-slate-400" />;
  if (code >= 45 && code <= 48) return <CloudDrizzle className="w-6 h-6 text-slate-400" />;
  if (code >= 51 && code <= 55) return <CloudDrizzle className="w-6 h-6 text-sky-400" />;
  if (code >= 61 && code <= 65) return <CloudRain className="w-6 h-6 text-sky-500" />;
  if (code >= 71 && code <= 77) return <CloudSnow className="w-6 h-6 text-slate-200" />;
  if (code >= 80 && code <= 82) return <CloudRain className="w-6 h-6 text-sky-600" />;
  if (code >= 95 && code <= 99) return <CloudLightning className="w-6 h-6 text-purple-500" />;
  return <Cloud className="w-6 h-6 text-slate-400" />;
}

export function WeatherForecastCard({ sensorId }: WeatherForecastCardProps) {
  const { data: forecast, isLoading, error } = useGetSensorWeather(sensorId);

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Previsión Meteorológica (7 días)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground border border-dashed rounded-xl">
            Previsión no disponible
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Previsión (7 días)</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {isLoading ? (
            Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))
          ) : (
            forecast?.map((day) => (
              <div 
                key={day.date} 
                className="flex flex-col items-center justify-between p-3 rounded-xl border bg-card text-center gap-2 hover:bg-muted/30 transition-colors"
              >
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {format(parseISO(day.date), "EEE", { locale: es })}
                </div>
                
                <div className="flex flex-col items-center gap-1">
                  {getWeatherIcon(day.weathercode)}
                  {day.precipitation_sum > 0 && (
                    <span className="text-[10px] font-semibold text-sky-600 bg-sky-100 dark:bg-sky-900/40 px-1 rounded-sm mt-1">
                      {day.precipitation_sum}mm
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-sm font-semibold mt-1">
                  <span className="text-orange-500">{Math.round(day.temp_max)}°</span>
                  <span className="text-slate-400 font-normal">/</span>
                  <span className="text-sky-500">{Math.round(day.temp_min)}°</span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
