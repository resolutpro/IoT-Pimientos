import { useParams, Link, useLocation } from "wouter";
import { 
  useGetSensor, 
  getGetSensorQueryKey,
  useGetSensorReadings,
  getGetSensorReadingsQueryKey,
  useDeleteSensor,
  getGetSensorsSummaryQueryKey
} from "@workspace/api-client-react";
import { useState } from "react";
import { ChevronLeft, Edit2, Trash2, Battery, Wifi, Droplets, Thermometer, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EditSensorDialog } from "@/components/edit-sensor-dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export default function SensorDetail() {
  const { id } = useParams<{ id: string }>();
  const [range, setRange] = useState<"24h" | "7d">("24h");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: sensor, isLoading: isLoadingSensor } = useGetSensor(id!, {
    query: { enabled: !!id, queryKey: getGetSensorQueryKey(id!), refetchInterval: 30_000 }
  });

  const { data: readings, isLoading: isLoadingReadings } = useGetSensorReadings(id!, { range }, {
    query: { enabled: !!id, queryKey: getGetSensorReadingsQueryKey(id!, { range }), refetchInterval: 30_000 }
  });

  const deleteMutation = useDeleteSensor({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSensorsSummaryQueryKey() });
        toast({ title: "Sensor deleted", description: "The sensor has been removed from the system." });
        setLocation("/");
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to delete sensor.", variant: "destructive" });
      }
    }
  });

  const latestReading = readings && readings.length > 0 ? readings[readings.length - 1] : null;

  if (isLoadingSensor) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (!sensor) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <p className="font-medium">Sensor no encontrado.</p>
        <Button variant="outline" asChild><Link href="/">Volver al inicio</Link></Button>
      </div>
    );
  }

  const chartData = readings?.map(r => ({
    time: format(parseISO(r.timestamp), range === "24h" ? "HH:mm" : "MMM dd HH:mm"),
    humidity: r.humedad,
    temperature: r.temperatura,
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 mt-0.5" asChild>
          <Link href="/">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold leading-tight">{sensor.nombre_zona}</h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">ID: {sensor.id_sensor}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => setIsEditOpen(true)} data-testid="button-edit-sensor">
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="destructive" size="icon" className="h-11 w-11" onClick={() => setIsDeleteOpen(true)} data-testid="button-delete-sensor">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Humedad", value: latestReading?.humedad != null ? `${latestReading.humedad}%` : '--', icon: Droplets, color: "text-sky-600" },
          { label: "Temp.", value: latestReading?.temperatura != null ? `${latestReading.temperatura}°C` : '--', icon: Thermometer, color: "text-orange-500" },
          { label: "EC", value: latestReading?.ec != null ? `${latestReading.ec} dS/m` : '--', icon: Activity, color: "text-emerald-600" },
          { label: "Batería", value: latestReading?.bateria != null ? `${latestReading.bateria}%` : '--', icon: Battery, color: "text-green-600" },
          { label: "Señal", value: latestReading?.senal != null ? `${latestReading.senal} dBm` : '--', icon: Wifi, color: "text-slate-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${color}`} />
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
              </div>
              <p className="text-2xl font-bold tracking-tight">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 gap-3">
          <CardTitle className="text-base font-semibold">Historial de Lecturas</CardTitle>
          <ToggleGroup type="single" value={range} onValueChange={(v) => v && setRange(v as "24h" | "7d")}>
            <ToggleGroupItem value="24h" aria-label="Ultimas 24 horas" className="h-9 px-4 font-medium">24h</ToggleGroupItem>
            <ToggleGroupItem value="7d" aria-label="Ultimos 7 dias" className="h-9 px-4 font-medium">7d</ToggleGroupItem>
          </ToggleGroup>
        </CardHeader>
        <CardContent>
          {isLoadingReadings ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : !readings || readings.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              Sin lecturas para este periodo.
            </div>
          ) : (
            <div className="h-64 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="time"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={40}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="hsl(var(--chart-1))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="hsl(var(--chart-2))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: '600', marginBottom: '4px' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} />
                  <Line yAxisId="left" type="monotone" dataKey="humidity" name="Humedad (%)" stroke="hsl(var(--chart-1))" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                  <Line yAxisId="right" type="monotone" dataKey="temperature" name="Temp (°C)" stroke="hsl(var(--chart-2))" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <EditSensorDialog open={isEditOpen} onOpenChange={setIsEditOpen} sensor={sensor} />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sensor?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the sensor "{sensor.nombre_zona}" and all its historical readings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate({ id: sensor.id_sensor })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Sensor"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
