import * as React from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { divIcon } from "leaflet";
import { Vehicule, Trajet } from "@/types";
import { getFuelStatus, calculateFuelRemaining } from "@/lib/fuelCalculations";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Fuel, Navigation, Route, MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { useTrajets } from "@/hooks/useTrajets";
import { usePleins } from "@/hooks/usePleins";

interface FleetMapProps {
  vehicles: Vehicule[];
  onVehicleSelect?: (vehicle: Vehicule) => void;
}

const createCustomIcon = (status: string) => {
  const color =
    status === "critical"
      ? "#ef4444"
      : status === "low"
      ? "#f97316"
      : status === "medium"
      ? "#eab308"
      : "#22c55e";

  return divIcon({
    html: `
      <div style="
        width: 32px; 
        height: 32px; 
        border-radius: 50%; 
        background-color: ${color}; 
        border: 3px solid white; 
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>
    `,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

const createStartIcon = () =>
  divIcon({
    html: `
      <div style="
        width: 16px; 
        height: 16px; 
        border-radius: 50%; 
        background-color: #3b82f6; 
        border: 2px solid white; 
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      "></div>
    `,
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

const createStopIcon = () =>
  divIcon({
    html: `
      <div style="
        width: 16px; 
        height: 16px; 
        border-radius: 50%; 
        background-color: #f63b83; 
        border: 2px solid white; 
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      "></div>
    `,
    className: "",
    iconSize: [ 16, 16 ],
    iconAnchor: [8, 8],
  });

const getPolylineColor = (status: string) =>
  status === "critical"
    ? "#ef4444"
    : status === "low"
    ? "#f97316"
    : status === "medium"
    ? "#eab308"
    : "#22c55e";

export const FleetMap: React.FC<FleetMapProps> = ({ vehicles, onVehicleSelect }) => {
  const [selectedVehicle, setSelectedVehicle] = React.useState<Vehicule & { position: [number, number] } | null>(null);
  const [showTrips, setShowTrips] = React.useState(false);

  const allTrips = useTrajets().data || [];
  const allRefuels = usePleins().data || [];

  const selectedTrips = useTrajets(selectedVehicle?.id).data || [];
  const selectedRefuels = usePleins(selectedVehicle?.id).data || [];

  const MAP_CENTER: LatLngExpression = [-18.8792, 47.5079];

  // Véhicules avec position GPS réelle uniquement
  const visibleVehicles = React.useMemo(() => {
    const result: Array<{
      vehicle: Vehicule;
      position: [number, number];
      fuelStatus: string;
      remainingFuel: number;
      autonomy: number;
    }> = [];

    for (const vehicle of vehicles) {
      const trips = allTrips.filter(t => t.vehicule_id === vehicle.id);
      const refuels = allRefuels.filter(r => r.vehicule_id === vehicle.id);

      let lastGpsPoint: { latitude: number; longitude: number } | null = null;

      // Cherche le dernier trajet avec traceGps
      for (let i = trips.length - 1; i >= 0; i--) {
        if (trips[i].traceGps && trips[i].traceGps.length > 0) {
          lastGpsPoint = trips[i].traceGps[trips[i].traceGps.length - 1];
          break;
        }
      }

      if (!lastGpsPoint) continue; // On n'affiche pas le véhicule s'il n'a jamais eu de GPS

      const fuelStatus = getFuelStatus(vehicle, trips, refuels);
      const remainingFuel = calculateFuelRemaining(vehicle, trips, refuels);
      const autonomy = (remainingFuel / vehicle.consommation_nominale) * 100;

      result.push({
        vehicle,
        position: [lastGpsPoint.latitude, lastGpsPoint.longitude],
        fuelStatus,
        remainingFuel,
        autonomy,
      });
    }

    return result;
  }, [vehicles, allTrips, allRefuels]);

  const handleVehicleClick = (item: typeof visibleVehicles[0]) => {
    setSelectedVehicle({ ...item.vehicle, position: item.position });
    setShowTrips(false);
  };

  const handleToggleTrips = () => setShowTrips(prev => !prev);

  return (
    <Card className="rounded-2xl overflow-hidden border-0 shadow-lg">
      <CardContent className="p-0">
        <div className="h-[600px] relative">
          <MapContainer center={MAP_CENTER} zoom={6} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {/* Véhicules avec GPS uniquement */}
            {visibleVehicles.map(({ vehicle, position, fuelStatus, remainingFuel, autonomy }) => (
              <Marker
                key={vehicle.immatriculation}
                position={position}
                icon={createCustomIcon(fuelStatus)}
                eventHandlers={{ click: () => handleVehicleClick({ vehicle, position, fuelStatus, remainingFuel, autonomy }) }}
              >
                <Popup>
                  <div className="min-w-[200px] p-2">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-base">{vehicle.marque}</h3>
                      <Badge
                        variant={fuelStatus === "critical" ? "destructive" : "secondary"}
                        className="ml-2"
                      >
                        {fuelStatus === "critical"
                          ? "Critique"
                          : fuelStatus === "low"
                          ? "Faible"
                          : fuelStatus === "medium"
                          ? "Moyen"
                          : "Normal"}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-sm mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Immatriculation:</span>
                        <span className="font-medium">{vehicle.immatriculation}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Fuel className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{remainingFuel.toFixed(1)}L</span>
                        <span className="text-muted-foreground">/ {vehicle.capacite_reservoir}L</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{autonomy.toFixed(0)} km</span>
                        <span className="text-muted-foreground">autonomie</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => onVehicleSelect?.(vehicle)} className="flex-1">
                        Détails
                      </Button>
                      <Button size="sm" onClick={handleToggleTrips} className="flex-1">
                        <Route className="h-4 w-4 mr-1" />
                        Trajets
                      </Button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Trajets du véhicule sélectionné */}
            {showTrips && selectedVehicle && selectedTrips.map(trip => {
              if (!trip.traceGps || trip.traceGps.length === 0) return null;

              const positions: LatLngExpression[] = trip.traceGps.map(p => [p.latitude, p.longitude]);
              const color = getPolylineColor(getFuelStatus(selectedVehicle, selectedTrips, selectedRefuels));

              return (
                <React.Fragment key={trip.id}>
                  <Polyline positions={positions} pathOptions={{ color, weight: 3, opacity: 0.7 }} />
                  <Marker position={positions[0]} icon={createStartIcon()}>
                    <Popup>Départ • {new Date(trip.date_debut).toLocaleString("fr-FR")}</Popup>
                  </Marker>
                  <Marker position={positions[positions.length - 1]} icon={createStopIcon()}>
                    <Popup>Arrivée • {new Date(trip.date_fin).toLocaleString("fr-FR")}</Popup>
                  </Marker>
                </React.Fragment>
              );
            })}
          </MapContainer>

          {/* Légende */}
          <div className="absolute bottom-4 right-4 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg p-3 z-[1000]">
            <h4 className="text-xs font-semibold mb-2">État carburant</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Normal (&gt;60%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>Moyen (30-60%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span>Faible (15-30%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Critique (&lt;15%)</span>
              </div>
            </div>
          </div>

          {/* Panneau véhicule sélectionné */}
          {selectedVehicle && (
            <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg p-3 z-[1000] max-w-xs">
              <h4 className="text-sm font-semibold mb-2">{selectedVehicle.marque}</h4>
              <p className="text-xs text-muted-foreground mb-3">{selectedVehicle.immatriculation}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => onVehicleSelect?.(selectedVehicle)} className="flex-1">
                  Fiche détails
                </Button>
                <Button size="sm" variant={showTrips ? "default" : "outline"} onClick={handleToggleTrips} className="flex-1">
                  <Route className="h-4 w-4 mr-1" />
                  {showTrips ? "Masquer" : "Afficher"} trajets
                </Button>
              </div>
              {showTrips && (
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedTrips.length} trajet(s) affiché(s)
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};