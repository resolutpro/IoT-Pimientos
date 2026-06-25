import { SensorSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Droplets, Thermometer, Activity, Battery, Wifi, AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface SensorCardProps {
  summary: SensorSummary;
}

const STATUS_COLORS = {
  ok:       "border-emerald-500/60 bg-emerald-50/80 text-emerald-800",
  warning:  "border-amber-400/70 bg-amber-50/80 text-amber-800",
  critical: "border-red-500 bg-red-50/80 text-red-800",
  unknown:  "border-slate-300 bg-slate-50/80 text-slate-600",
} as const;

const CARD_BORDER = {
  ok:       "border-l-4 border-l-emerald-500 hover:shadow-md hover:shadow-emerald-100",
  warning:  "border-l-4 border-l-amber-400 hover:shadow-md hover:shadow-amber-100",
  critical: "border-l-4 border-l-red-500 hover:shadow-md hover:shadow-red-100 ring-1 ring-red-200",
  unknown:  "border-l-4 border-l-slate-300 hover:shadow-md",
} as const;

const STATUS_ICON = {
  ok:       CheckCircle2,
  warning:  AlertTriangle,
  critical: AlertTriangle,
  unknown:  HelpCircle,
} as const;

const STATUS_LABEL = {
  ok:       "OK",
  warning:  "Aviso",
  critical: "Crítico",
  unknown:  "Sin datos",
} as const;

export function SensorCard({ summary }: SensorCardProps) {
  const { sensor, latestReading, status, alerts } = summary;
  const StatusIcon = STATUS_ICON[status];

  return (
    <Link
      href={`/sensor/${sensor.id_sensor}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl"
    >
      <Card
        className={cn(
          "h-full transition-all duration-200 cursor-pointer group rounded-xl",
          CARD_BORDER[status]
        )}
        data-testid={`card-sensor-${sensor.id_sensor}`}
      >
        <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-base leading-tight line-clamp-1 group-hover:text-primary transition-colors">
              {sensor.nombre_zona}
            </h3>
            <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{sensor.id_sensor}</p>
          </div>
          <Badge
            variant="outline"
            className={cn("shrink-0 capitalize text-xs font-semibold flex items-center gap-1 py-1 px-2", STATUS_COLORS[status])}
          >
            <StatusIcon className="w-3 h-3" />
            {STATUS_LABEL[status]}
          </Badge>
        </CardHeader>

        <CardContent className="p-4 pt-2">
          {latestReading ? (
            sensor.tipo === "riego" ? (
              <div className="flex flex-col gap-4">
                <div className={cn(
                  "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-colors shadow-inner",
                  latestReading.humedad! < sensor.umbral_humedad_min
                    ? "bg-red-50 border-red-300 text-red-900"
                    : "bg-sky-50 border-sky-300 text-sky-900"
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className={cn(
                      "w-8 h-8",
                      latestReading.humedad! < sensor.umbral_humedad_min ? "text-red-500" : "text-sky-500"
                    )} />
                    <span className="font-extrabold text-4xl tracking-tight">
                      {latestReading.humedad != null ? `${latestReading.humedad}%` : '--'}
                    </span>
                  </div>
                  <div className="text-center mt-1">
                    {latestReading.humedad! < sensor.umbral_humedad_min ? (
                      <span className="font-bold text-red-600 text-lg uppercase tracking-widest drop-shadow-sm">¡Regar Ahora!</span>
                    ) : (
                      <span className="font-bold text-sky-700 text-lg">Humedad Óptima</span>
                    )}
                    <p className="text-xs mt-1.5 opacity-80 font-medium bg-background/40 px-2 py-1 rounded-md inline-block">
                      Umbral de riego: &lt; {sensor.umbral_humedad_min}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Battery className="w-4 h-4" />
                      {latestReading.bateria != null ? `${latestReading.bateria}%` : '--'}
                    </span>
                  </div>
                  <span className="tabular-nums font-medium">
                    {formatDistanceToNow(parseISO(latestReading.timestamp), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col bg-muted/40 rounded-lg p-2.5">
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider flex items-center gap-1 mb-1">
                      <Droplets className="w-3 h-3 text-sky-500" /> Hum.
                    </span>
                    <span className="font-bold text-xl leading-none text-foreground">
                      {latestReading.humedad != null ? `${latestReading.humedad}` : '--'}
                      <span className="text-xs font-normal text-muted-foreground ml-0.5">%</span>
                    </span>
                  </div>
                  <div className="flex flex-col bg-muted/40 rounded-lg p-2.5">
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider flex items-center gap-1 mb-1">
                      <Thermometer className="w-3 h-3 text-orange-500" /> Temp.
                    </span>
                    <span className="font-bold text-xl leading-none text-foreground">
                      {latestReading.temperatura != null ? `${latestReading.temperatura}` : '--'}
                      <span className="text-xs font-normal text-muted-foreground ml-0.5">°C</span>
                    </span>
                  </div>
                  <div className="flex flex-col bg-muted/40 rounded-lg p-2.5">
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider flex items-center gap-1 mb-1">
                      <Activity className="w-3 h-3 text-emerald-600" /> EC
                    </span>
                    <span className="font-bold text-xl leading-none text-foreground">
                      {latestReading.ec != null ? `${latestReading.ec}` : '--'}
                      <span className="text-xs font-normal text-muted-foreground ml-0.5">dS/m</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/60">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-medium">
                      <Battery className="w-3.5 h-3.5" />
                      {latestReading.bateria != null ? `${latestReading.bateria}%` : '--'}
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <Wifi className="w-3.5 h-3.5" />
                      {latestReading.senal != null ? `${latestReading.senal} dBm` : '--'}
                    </span>
                  </div>
                  <span className="text-muted-foreground tabular-nums">
                    {formatDistanceToNow(parseISO(latestReading.timestamp), { addSuffix: true })}
                  </span>
                </div>
              </div>
            )
          ) : (
            <div className="h-24 flex items-center justify-center text-sm text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
              Esperando primera lectura...
            </div>
          )}

          {alerts.length > 0 && sensor.tipo !== "riego" && (
            <div className="mt-3 text-xs font-semibold text-red-700 bg-red-50 p-2.5 rounded-lg border border-red-200 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{alerts.join(" • ")}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
