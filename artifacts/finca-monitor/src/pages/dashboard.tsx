import { useGetSensorsSummary, getGetSensorsSummaryQueryKey } from "@workspace/api-client-react";
import { SensorCard } from "@/components/sensor-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: summaries, isLoading } = useGetSensorsSummary({
    query: { queryKey: getGetSensorsSummaryQueryKey(), refetchInterval: 30_000 },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Estado de Sensores</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {summaries ? `${summaries.length} zona${summaries.length !== 1 ? 's' : ''} monitoreada${summaries.length !== 1 ? 's' : ''}` : 'Cargando...'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3 p-4 bg-card rounded-xl border">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <div className="grid grid-cols-3 gap-2 pt-2">
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-10 rounded-lg" />
              </div>
              <Skeleton className="h-4 w-full mt-2" />
            </div>
          ))}
        </div>
      ) : summaries?.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card rounded-xl border border-dashed">
          <p className="text-muted-foreground font-medium mb-4">No hay sensores configurados.</p>
          <p className="text-sm text-muted-foreground">Configura los sensores en el archivo sensors.json</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {summaries?.map((summary) => (
            <SensorCard key={summary.sensor.id_sensor} summary={summary} />
          ))}
        </div>
      )}
    </div>
  );
}
