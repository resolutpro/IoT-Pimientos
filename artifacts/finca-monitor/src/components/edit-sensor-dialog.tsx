import { useUpdateSensor, getGetSensorQueryKey, getGetSensorsSummaryQueryKey, Sensor } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  nombre_zona: z.string().min(1, "Zone Name is required"),
  umbral_humedad_min: z.coerce.number().min(0).max(100),
  umbral_humedad_max: z.coerce.number().min(0).max(100),
  umbral_ec_max: z.coerce.number().min(0),
}).refine(data => data.umbral_humedad_max > data.umbral_humedad_min, {
  message: "Max humidity must be greater than min humidity",
  path: ["umbral_humedad_max"],
});

type FormValues = z.infer<typeof formSchema>;

export function EditSensorDialog({ open, onOpenChange, sensor }: { open: boolean; onOpenChange: (open: boolean) => void, sensor: Sensor }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const updateSensor = useUpdateSensor({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getGetSensorQueryKey(sensor.id_sensor) });
        queryClient.invalidateQueries({ queryKey: getGetSensorsSummaryQueryKey() });
        toast({ title: "Sensor updated successfully" });
        onOpenChange(false);
      },
      onError: (err) => {
        toast({ title: "Failed to update sensor", description: err.error?.error || "Unknown error", variant: "destructive" });
      }
    }
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre_zona: sensor.nombre_zona,
      umbral_humedad_min: sensor.umbral_humedad_min,
      umbral_humedad_max: sensor.umbral_humedad_max,
      umbral_ec_max: sensor.umbral_ec_max,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        nombre_zona: sensor.nombre_zona,
        umbral_humedad_min: sensor.umbral_humedad_min,
        umbral_humedad_max: sensor.umbral_humedad_max,
        umbral_ec_max: sensor.umbral_ec_max,
      });
    }
  }, [open, sensor, form]);

  function onSubmit(values: FormValues) {
    updateSensor.mutate({ id: sensor.id_sensor, data: values });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Sensor Settings</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre_zona"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zone Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="umbral_humedad_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Humidity (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="umbral_humedad_max"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Humidity (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="umbral_ec_max"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max EC (dS/m)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={updateSensor.isPending}>
                {updateSensor.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
