import { VehicleWithPosition, Geofence } from '@/types';

/**
 * Calcule la distance en mètres entre deux coordonnées
 */
export function calculateDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const R = 6371000; // rayon de la Terre en mètres
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  
  const dLat = toRad(coord2[0] - coord1[0]);
  const dLon = toRad(coord2[1] - coord1[1]);
  const lat1 = toRad(coord1[0]);
  const lat2 = toRad(coord2[0]);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Vérifie si un véhicule est dans une geofence
 */
export function isVehicleInGeofence(
  vehicle: VehicleWithPosition,
  geofence: Geofence
): boolean {
  const distance = calculateDistance(
    vehicle.position,
    [geofence.lat, geofence.lon]
  );
  return distance <= geofence.rayon_metres;
}

/**
 * Détecte les véhicules dans les zones à risque
 */
export function detectDangerZoneViolations(
  vehicles: VehicleWithPosition[],
  geofences: Geofence[]
): Array<{ vehicle: VehicleWithPosition; geofence: Geofence }> {
  const dangerZones = geofences.filter((g) => g.type === 'zone_risque');
  const violations: Array<{ vehicle: VehicleWithPosition; geofence: Geofence }> = [];

  vehicles.forEach((vehicle) => {
    dangerZones.forEach((geofence) => {
      if (isVehicleInGeofence(vehicle, geofence)) {
        violations.push({ vehicle, geofence });
      }
    });
  });

  return violations;
}
