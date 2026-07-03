// Utilitaires de géolocalisation et calculs de distance

/**
 * Calcule la distance en kilomètres entre deux points GPS (formule de Haversine)
 * @param lat1 Latitude du point 1
 * @param lon1 Longitude du point 1
 * @param lat2 Latitude du point 2
 * @param lon2 Longitude du point 2
 * @returns Distance en kilomètres
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convertit des degrés en radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Vérifie si un point est dans une zone geofence circulaire
 * @param pointLat Latitude du point à vérifier
 * @param pointLon Longitude du point à vérifier
 * @param centerLat Latitude du centre de la geofence
 * @param centerLon Longitude du centre de la geofence
 * @param radiusMeters Rayon de la geofence en mètres
 * @returns true si le point est dans la zone
 */
export function isPointInGeofence(
  pointLat: number,
  pointLon: number,
  centerLat: number,
  centerLon: number,
  radiusMeters: number
): boolean {
  const distanceKm = haversineDistance(pointLat, pointLon, centerLat, centerLon);
  return distanceKm * 1000 <= radiusMeters; // Convertir km en mètres
}

/**
 * Trouve la geofence la plus proche d'un point
 * @param pointLat Latitude du point
 * @param pointLon Longitude du point
 * @param geofences Liste des geofences avec coordonnées et rayon
 * @returns La geofence la plus proche et sa distance, ou null
 */
export function findNearestGeofence(
  pointLat: number,
  pointLon: number,
  geofences: Array<{ id: string; nom: string; lat: number; lon: number; rayon_metres: number }>
): { geofence: typeof geofences[0]; distance: number } | null {
  if (!geofences.length) return null;
  
  let nearest = geofences[0];
  let minDistance = haversineDistance(pointLat, pointLon, nearest.lat, nearest.lon);
  
  for (const geofence of geofences.slice(1)) {
    const distance = haversineDistance(pointLat, pointLon, geofence.lat, geofence.lon);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = geofence;
    }
  }
  
  return { geofence: nearest, distance: minDistance };
}
