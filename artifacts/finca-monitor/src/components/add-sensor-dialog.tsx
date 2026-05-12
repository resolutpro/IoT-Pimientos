import { useCreateSensor, getGetSensorsSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  id_sensor: z.string().min(1, "Sensor ID is required"),
  nombre_zona: z.string().min(1, "Zone Name is required"),
  umbral_humedad_min: z.coerce.number().min(0).max(100),
  umbral_humedad_max: z.coerce.number().min(0).max(100),
  umbral_ec_max: z.coerce.number().min(0),
}).refine(data => data.umbral_humedad_max > data.umbral_humedad_min, {
  message: "Max humidity must be greater than min humidity",
  path: ["umbral_humedad_max"],
});

type FormValues = z.infer<typeof formSchema>;

export function AddSensorDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createSensor = useCreateSensor({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSensorsSummaryQueryKey() });
        toast({ title: "Sensor added successfully" });
        onOpenChange(false);
        form.reset();
      },
      onError: (err) => {
        toast({ title: "Failed to add sensor", description: err.error?.error || "Unknown error", variant: "destructive" });
      }
    }
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id_sensor: "",
      nombre_zona: "",
      umbral_humedad_min: 40,
      umbral_humedad_max: 80,
      umbral_ec_max: 2.5,
    },
  });

  function onSubmit(values: FormValues) {
    createSensor.mutate({ data: values });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Sensor</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="id_sensor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sensor ID</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. SENS-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nombre_zona"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zone Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Sector A - North" {...field} />
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
              <Button type="submit" disabled={createSensor.isPending}>
                {createSensor.isPending ? "Adding..." : "Add Sensor"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
