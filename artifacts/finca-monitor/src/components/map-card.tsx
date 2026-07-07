import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

interface MapCardProps {
  lat: number;
  lon: number;
  title?: string;
}

export function MapCard({ lat, lon, title = "Ubicación" }: MapCardProps) {
  // We use an OpenStreetMap iframe
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.01},${lat - 0.01},${lon + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lon}`;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <div className="w-full h-48 sm:h-[250px] rounded-xl overflow-hidden border bg-muted">
          <iframe 
            width="100%" 
            height="100%" 
            frameBorder="0" 
            scrolling="no" 
            src={mapSrc}
            title="Mapa de ubicación"
            className="w-full h-full"
          ></iframe>
        </div>
      </CardContent>
    </Card>
  );
}
