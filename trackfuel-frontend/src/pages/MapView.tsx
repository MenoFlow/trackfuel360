import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import * as L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, Circle, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import type { LatLngExpression } from 'leaflet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Fuel, Navigation, Move, AlertTriangle, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { MainLayout } from '@/components/Layout/MainLayout';
import { MapToolbar } from '@/components/Map/MapToolbar';
import { GeofenceDialog } from '@/components/Map/GeofenceDialog';
import { LegendPanel } from '@/components/Map/LegendPanel';
import { VehicleFilters } from '@/components/Map/VehicleFilters';
import { GeofenceDetailsPanel } from '@/components/Map/GeofenceDetailsPanel';
import { AlertButton } from '@/components/Map/AlertButton';
import { AlertPanel } from '@/components/Map/AlertPanel';
import { useGeofences } from '@/hooks/useGeofences';
import { useAlerts } from '@/hooks/useAlerts';
import { useQuery } from '@tanstack/react-query';
import { getFuelStatus, calculateFuelRemaining, getFuelStatusColor, getFuelStatusLabel } from '@/lib/fuelCalculations';
import { createCustomVehicleIcon, createLucideDivIcon, getGeofenceColor, getRadiusMarkerPosition, calculateDistanceMeters } from '@/lib/utils/mapUtils';
import { detectDangerZoneViolations } from '@/lib/utils/geofenceUtils';
import { Geofence, GeofenceType, FilterState } from '@/types';
import 'leaflet-draw';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useTrajets } from '@/hooks/useTrajets';
import { usePleins } from '@/hooks/usePleins';

const MAP_CENTER: LatLngExpression = [-18.8792, 47.5079];

/* ==================== TYPES ==================== */
type Vehicule = {
  id: number;
  immatriculation: string;
  marque: string;
  modele: string;
  type: 'essence' | 'diesel' | 'hybride' | 'gpl';
  capacite_reservoir: number;
  consommation_nominale: number;
  actif: boolean;
};

type Trip = {
  id: number;
  vehicule_id: number;
  date_debut: string;
  date_fin: string;
  distance_km: number;
  traceGps: TraceGpsPoint[];
};

type TraceGpsPoint = {
  id: number;
  trajet_id: number;
  sequence: number;
  latitude: number;
  longitude: number;
  timestamp: string;
};

type VehicleWithPosition = Vehicule & {
  position: [number, number];
  lastTrip?: Trip;
};

/* ==================== API FETCHERS ==================== */
const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const fetchVehicules = async (): Promise<Vehicule[]> => {
  const res = await fetch(API_BASE+'/api/vehicules');
  if (!res.ok) throw new Error('Erreur véhicules');
  return res.json();
};

const fetchTrips = async (): Promise<Trip[]> => {
  const res = await fetch(API_BASE+'/api/trajets');
  if (!res.ok) throw new Error('Erreur trajets');
  return res.json();
};

const fetchTraceGps = async (): Promise<TraceGpsPoint[]> => {
  const res = await fetch(API_BASE+'/api/trace-gps');
  if (!res.ok) throw new Error('Erreur trace GPS');
  return res.json();
};

/* ==================== FONCTION LOCALE DE POSITION ==================== */
const useLocalVehiclePositions = () => {
  const { data: vehicules = [], isLoading: vLoading } = useQuery({
    queryKey: ['vehicules'],
    queryFn: fetchVehicules,
  });

  const { data: trips = [], isLoading: tLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: fetchTrips,
  });

  const { data: traces = [], isLoading: gLoading } = useQuery({
    queryKey: ['trace-gps'],
    queryFn: fetchTraceGps,
  });

  return useMemo(() => {
    if (vLoading || tLoading || gLoading) {
      return { vehiclesWithPositions: [], isLoading: true };
    }

    const traceMap = new Map<number, TraceGpsPoint[]>();
    traces.forEach((t) => {
      if (!traceMap.has(t.trajet_id)) traceMap.set(t.trajet_id, []);
      traceMap.get(t.trajet_id)!.push(t);
    });

    const tripMap = new Map<number, Trip[]>();
    trips.forEach((trip) => {
      if (!tripMap.has(trip.vehicule_id)) tripMap.set(trip.vehicule_id, []);
      tripMap.get(trip.vehicule_id)!.push({
        ...trip,
        traceGps: traceMap.get(trip.id) || [],
      });
    });

    const vehiclesWithPositions: VehicleWithPosition[] = vehicules
      .filter((v) => v.actif)
      .map((vehicule) => {
        const vehicleTrips = tripMap.get(vehicule.id) || [];
        const sortedTrips = vehicleTrips.sort((a, b) => 
          new Date(b.date_fin).getTime() - new Date(a.date_fin).getTime()
        );
        const lastTrip = sortedTrips[0];
        const lastPoint = lastTrip?.traceGps
          .sort((a, b) => b.sequence - a.sequence)[0];

        const position: [number, number] = lastPoint
          ? [lastPoint.latitude, lastPoint.longitude]
          : [MAP_CENTER[0], MAP_CENTER[1]];

        return {
          ...vehicule,
          position,
          lastTrip,
        };
      });

    return { vehiclesWithPositions, isLoading: false };
  }, [vehicules, trips, traces, vLoading, tLoading, gLoading]);
};

/* ==================== COMPOSANT PRINCIPAL ==================== */
export default function MapView() {
  const { t } = useTranslation();
  const [hideLateralWin, setHideLateralWin] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showAlertPanel, setShowAlertPanel] = useState(false);
  const [pendingGeofenceData, setPendingGeofenceData] = useState<{
    lat: number;
    lon: number;
    rayon_metres: number;
  } | null>(null);
  const [tempLayer, setTempLayer] = useState<any>(null); // État temporaire
  const mapRef = useRef<L.Map | null>(null);
  const tempLayerRef = useRef<L.Circle | null>(null);
  const editFeatureGroupRef = useRef<L.FeatureGroup<any>>(null); // ← LA REF MAGIQUE

  const [filters, setFilters] = useState<FilterState>({
    showCritical: true,
    showLow: true,
    showMedium: true,
    showHigh: true,
  });

  // CHARGE TOUS LES TRAJETS ET PLEINS UNE SEULE FOIS
  const { data: allTrips = [] } = useTrajets();
  const { data: allRefuels = [] } = usePleins();

  // Remplace useVehiclePositions
  const { vehiclesWithPositions, isLoading: vehiclesLoading } = useLocalVehiclePositions();

  // Geofences & Alerts
  const {
    geofences,
    selectedGeofence,
    editingGeofence,
    setSelectedGeofence,
    addGeofence,
    updateGeofence,
    deleteGeofence,
    startEditing,
    cancelEditing,
  } = useGeofences();

  const {
    alerts,
    addAlert,
    deleteAlert,
    markAllAsRead,
    clearAll,
    unreadCount,
  } = useAlerts();

  // FONCTION SANS HOOKS
  const getTripsAndRefuels = useCallback((vehiculeId: number) => {
    const tripsData = allTrips.filter(t => t.vehicule_id === vehiculeId);
    const refuels = allRefuels.filter(r => r.vehicule_id === vehiculeId);
    return { tripsData, refuels };
  }, [allTrips, allRefuels]);

  // Détection zones à risque (SANS BOUCLE INFINIE)
  const vehiclesInDangerZoneRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const violations = detectDangerZoneViolations(vehiclesWithPositions, geofences);
    const current = new Set<string>();

    violations.forEach(({ vehicle, geofence }) => {
      const key = `${vehicle.id}-${geofence.id}`;
      current.add(key);

      if (!vehiclesInDangerZoneRef.current.has(key)) {
        addAlert({
          vehicleId: vehicle.id,
          vehicleImmatriculation: vehicle.immatriculation,
          vehicleModele: vehicle.modele,
          geofenceId: geofence.id,
          geofenceName: geofence.nom,
          coordinates: vehicle.position,
        });

        toast({
          title: 'Alerte !',
          description: `${vehicle.modele} dans ${geofence.nom}`,
          variant: 'destructive',
        });
      }
    });

    vehiclesInDangerZoneRef.current = current;
  }, [vehiclesWithPositions, geofences, addAlert]);

  // Filtrage véhicules
  const filteredVehicles = useMemo(() => {
    return vehiclesWithPositions.filter((vehicle) => {
      const { tripsData, refuels } = getTripsAndRefuels(vehicle.id);
      const status = getFuelStatus(vehicle, tripsData, refuels);
      switch (status) {
        case 'critical': return filters.showCritical;
        case 'low': return filters.showLow;
        case 'medium': return filters.showMedium;
        case 'high': return filters.showHigh;
        default: return true;
      }
    });
  }, [vehiclesWithPositions, filters, getTripsAndRefuels]);

  const vehiclesInDangerZone = useMemo(() => {
    return new Set(
      detectDangerZoneViolations(vehiclesWithPositions, geofences).map(v => v.vehicle.id)
    );
  }, [vehiclesWithPositions, geofences]);

  // Icônes mémorisées
  const vehicleIcons = useMemo(() => {
    const icons: Record<number, any> = {};
    filteredVehicles.forEach((v) => {
      const { tripsData, refuels } = getTripsAndRefuels(v.id);
      const status = getFuelStatus(v, tripsData, refuels);
      icons[v.id] = createCustomVehicleIcon(getFuelStatusColor(status));
    });
    return icons;
  }, [filteredVehicles, getTripsAndRefuels]);

  // FONCTION DE NETTOYAGE UNIVERSELLE (à utiliser partout)
  const clearAllTempLayers = useCallback(() => {
    // 1. Supprime le cercle temporaire de création
    if (tempLayerRef.current && mapRef.current) {
      mapRef.current.removeLayer(tempLayerRef.current);
      tempLayerRef.current = null;
    }
    setTempLayer(null);

    // 2. Supprime TOUS les layers temporaires d'édition (EditControl)
    if (editFeatureGroupRef.current) {
      editFeatureGroupRef.current.clearLayers();
    }

    // 3. Réinitialise les états
    setPendingGeofenceData(null);
    setDialogOpen(false);
  }, []);
  
  // Geofence temporaire (visible)
  const handleGeofenceCreated = useCallback((e: any) => {
    if (e.layerType !== 'circle') return;
    const layer: L.Circle = e.layer;
    const center = layer.getLatLng();
  
    // Garde une référence directe
    tempLayerRef.current = layer;
  
    // Ajoute à la carte (par sécurité)
    layer.addTo(mapRef.current!);
  
    setTempLayer(layer); // optionnel, juste pour le rendu
    setPendingGeofenceData({
      lat: center.lat,
      lon: center.lng,
      rayon_metres: layer.getRadius(),
    });
    setDialogOpen(true);
  }, []);

  // Sauvegarde + nettoyage
  const handleSaveGeofence = useCallback((name: string, type: GeofenceType) => {
    if (editingGeofence) {
      updateGeofence(editingGeofence.id, { nom: name, type });
      cancelEditing();
    } else if (pendingGeofenceData) {
      addGeofence({
        nom: name,
        type,
        lat: pendingGeofenceData.lat,
        lon: pendingGeofenceData.lon,
        rayon_metres: Number(pendingGeofenceData.rayon_metres.toFixed(2)),
      });
      toast({ title: 'Geofence créée', description: name });
    }
    clearAllTempLayers(); // ← NETTOYAGE COMPLET

    // Nettoyage complet
    setPendingGeofenceData(null);
    setTempLayer(null);
    setDialogOpen(false);
  }, [pendingGeofenceData, editingGeofence, addGeofence, updateGeofence, cancelEditing, clearAllTempLayers]);

  // ANNULATION PROPRE
  const handleCancelGeofence = useCallback(() => {
    clearAllTempLayers();
  }, [clearAllTempLayers]);

  // ÉDITION TERMINÉE → NETTOYAGE
  const handleGeofenceEdited = useCallback((e: any) => {
    if (!editingGeofence) return;

    e.layers.eachLayer((layer: any) => {
      const center = layer.getLatLng();
      updateGeofence(editingGeofence.id, {
        lat: center.lat,
        lon: center.lng,
        rayon_metres: Number(layer.getRadius().toFixed(2)),
      });
    });

    clearAllTempLayers();
    cancelEditing();
    toast({ title: 'Geofence modifiée', description: editingGeofence.nom });
  }, [editingGeofence, updateGeofence, clearAllTempLayers, cancelEditing]);

  // SUPPRESSION → NETTOYAGE
  const handleGeofenceDeleted = useCallback(() => {
    if (editingGeofence) {
      deleteGeofence(editingGeofence.id);
      toast({ title: 'Supprimée', description: editingGeofence.nom });
    }
    clearAllTempLayers();
    cancelEditing();
  }, [editingGeofence, deleteGeofence, clearAllTempLayers, cancelEditing]);

  // ÉCHAP = ANNULER
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dialogOpen) {
        handleCancelGeofence();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [dialogOpen, handleCancelGeofence]);
  
  const handleStartEditing = useCallback((g: Geofence) => {
    startEditing(g);
    setDialogOpen(true);
  }, [startEditing]);

  const handleRadiusMarkerDrag = useCallback((id: number, center: [number, number], e: any) => {
    const newPos = e.target.getLatLng();
    const newRadius = calculateDistanceMeters(center, [newPos.lat, newPos.lng]);
    updateGeofence(id, { rayon_metres: newRadius });
  }, [updateGeofence]);

  const handleCenterMarkerDrag = useCallback((id: number, e: any) => {
    const { lat, lng } = e.target.getLatLng();
    updateGeofence(id, { lat, lon: lng });
  }, [updateGeofence]);

  const handleAlertButtonClick = useCallback(() => {
    setShowAlertPanel(v => !v);
    if (!showAlertPanel) markAllAsRead();
  }, [showAlertPanel, markAllAsRead]);

  // RENDER
  if (vehiclesLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-xl">Chargement de la flotte...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-4 pt-0 h-screen flex flex-col gap-4 max-w-full max-h-[90vh] overflow-x-hidden">
        {/* Toolbar */}
        <div className='flex flex-col justify-center text-center md:flex-row md:justify-between gap-4'>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold lg:text-start">{t('map.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('map.subtitle')}</p>
          </div>
          <div className="flex flex-row items-center justify-center gap-2">
            <MapToolbar
              isDrawing={isDrawing}
              isReadOnly={isReadOnly}
              onToggleDrawing={() => {
                setIsDrawing(!isDrawing);
                if (isDrawing) cancelEditing();
              }}
              onToggleReadOnly={() => setIsReadOnly(!isReadOnly)}
            />
            <AlertButton
              unreadCount={unreadCount}
              onClick={handleAlertButtonClick}
              isOpen={showAlertPanel}
            />
            <div className='hidden lg:block'>
              <Button variant='outline' onClick={() => setHideLateralWin(!hideLateralWin)}>
                {!hideLateralWin ? <ArrowLeft /> : <ArrowRight />}
              </Button>
            </div>
            <div className='lg:hidden'>
              <Button variant='outline' onClick={() => setHideLateralWin(!hideLateralWin)}>
                {!hideLateralWin ? <ArrowUp /> : <ArrowDown />}
              </Button>
            </div>
          </div>
        </div>

        {/* Dialog avec bouton Annuler */}
        <GeofenceDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={handleSaveGeofence}
          // onCancel={handleCancelGeofence}
          editingGeofence={editingGeofence}
        />

        {/* Carte */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
          <div className={`min-h-[400px] ${hideLateralWin ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
            <Card className="h-full overflow-hidden">
              <CardContent className="p-0 h-full">
                <MapContainer ref={mapRef} center={MAP_CENTER} zoom={6} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                  <FeatureGroup>
                    <EditControl
                      position="topright"
                      onCreated={handleGeofenceCreated}
                      onEdited={handleGeofenceEdited}
                      onDeleted={handleGeofenceDeleted}
                      draw={{
                        circle: isDrawing && !isReadOnly && !editingGeofence
                          ? { shapeOptions: { color: '#3b82f6', weight: 3 } }
                          : false,
                        polygon: false,
                        rectangle: false,
                        polyline: false,
                        marker: false,
                        circlemarker: false,
                      }}
                      edit={{ edit: false, remove: false }}
                    />

                    {/* Geofences persistantes */}
                    {geofences.map((geofence) => {
                      const isEditable = editingGeofence?.id === geofence.id;
                      const hasVehiclesInside = geofence.type === 'zone_risque' && 
                        vehiclesWithPositions.some(v => vehiclesInDangerZone.has(v.id));

                      return (
                        <Circle
                          key={geofence.id}
                          center={[Number(geofence.lat), Number(geofence.lon)]}
                          radius={geofence.rayon_metres}
                          pathOptions={{
                            color: getGeofenceColor(geofence.type),
                            fillOpacity: isEditable ? 0.4 : (hasVehiclesInside ? 0.3 : 0.2),
                            weight: isEditable ? 4 : (hasVehiclesInside ? 4 : 3),
                            className: hasVehiclesInside ? 'pulse-danger' : '',
                          }}
                          eventHandlers={{
                            click: () => {
                              if (!isDrawing) {
                                setSelectedGeofence(geofence);
                                setHideLateralWin(true);
                              }
                            },
                          }}
                        >
                          {isEditable && (
                            <>
                              <Marker
                                position={[Number(geofence.lat), Number(geofence.lon)]}
                                icon={createLucideDivIcon(Move, getGeofenceColor(geofence.type), 33)}
                                draggable
                                eventHandlers={{
                                  dragend: (e) => handleCenterMarkerDrag(geofence.id, e),
                                }}
                              />
                              <Marker
                                position={getRadiusMarkerPosition([Number(geofence.lat), Number(geofence.lon)], geofence.rayon_metres)}
                                icon={createLucideDivIcon(Move, getGeofenceColor(geofence.type), 33)}
                                draggable
                                eventHandlers={{
                                  dragend: (e) => handleRadiusMarkerDrag(geofence.id, [Number(geofence.lat), Number(geofence.lon)], e),
                                }}
                              />
                            </>
                          )}
                          <Popup>
                            <div className="p-2">
                              <h3 className="font-semibold">{geofence.nom}</h3>
                              <Badge style={{ backgroundColor: getGeofenceColor(geofence.type) }}>
                                {geofence.type === 'depot' ? 'Dépôt' : geofence.type === 'station' ? 'Station' : 'Zone à Risque'}
                              </Badge>
                            </div>
                          </Popup>
                        </Circle>
                      );
                    })}

                  </FeatureGroup>

                  {/* Véhicules */}
                  {filteredVehicles.map((vehicle) => {
                    const { tripsData, refuels } = getTripsAndRefuels(vehicle.id);
                    const fuelStatus = getFuelStatus(vehicle, tripsData, refuels);
                    const remainingFuel = calculateFuelRemaining(vehicle, tripsData, refuels);
                    const autonomy = (remainingFuel / vehicle.consommation_nominale) * 100;
                    const isInDangerZone = vehiclesInDangerZone.has(vehicle.id);
                    const lastTrip = tripsData[tripsData.length - 1];
                    const lastPosition = lastTrip?.traceGps?.[lastTrip.traceGps.length - 1];

                    return (
                      <div key={vehicle.id}>
                        <Marker
                          position={lastPosition ? [lastPosition.latitude, lastPosition.longitude] : vehicle.position}
                          icon={vehicleIcons[vehicle.id]}
                        >
                          <Popup>
                            <div className="min-w-[200px] p-2">
                              {isInDangerZone && (
                                <div className="mb-2 p-2 bg-red-100 border border-red-400 rounded">
                                  <div className="flex items-center gap-2 text-red-600">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span className="text-xs font-bold">En zone à risque</span>
                                  </div>
                                </div>
                              )}
                              <div className="flex justify-between mb-2">
                                <h3 className="font-semibold">{vehicle.modele}</h3>
                                <Badge variant={fuelStatus === 'critical' || fuelStatus === 'low' ? 'destructive' : 'secondary'}>
                                  {getFuelStatusLabel(fuelStatus)}
                                </Badge>
                              </div>
                              <div className="text-sm space-y-1">
                                <div>Immat: <strong>{vehicle.immatriculation}</strong></div>
                                <div><Fuel className="inline h-4 w-4" /> {remainingFuel.toFixed(1)}L</div>
                                <div><Navigation className="inline h-4 w-4" /> {autonomy.toFixed(0)} km</div>
                              </div>
                            </div>
                          </Popup>
                        </Marker>

                        {isInDangerZone && (
                          <Marker
                            position={vehicle.position}
                            icon={createLucideDivIcon(AlertTriangle, '#ef4444', 28)}
                            zIndexOffset={1000}
                          />
                        )}
                      </div>
                    );
                  })}
                </MapContainer>
              </CardContent>
            </Card>
          </div>

          {/* Panneau latéral */}
          <div hidden={!hideLateralWin} className="space-y-4 overflow-y-auto">
            {showAlertPanel ? (
              <AlertPanel
                alerts={alerts}
                onDeleteAlert={deleteAlert}
                onClearAll={clearAll}
                onClose={() => setShowAlertPanel(false)}
              />
            ) : (
              <>
                <VehicleFilters filters={filters} onFilterChange={setFilters} />
                <LegendPanel />
                <GeofenceDetailsPanel
                  geofence={selectedGeofence}
                  isEditing={editingGeofence?.id === selectedGeofence?.id}
                  isReadOnly={isReadOnly}
                  onEdit={handleStartEditing}
                  onDelete={() => selectedGeofence && deleteGeofence(selectedGeofence.id)}
                  onClose={() => {
                    setSelectedGeofence(null);
                    cancelEditing();
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}