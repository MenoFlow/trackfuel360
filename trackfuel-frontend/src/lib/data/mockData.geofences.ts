// // src/mocks/geofences.ts
// import { Geofence, GeofencePoint } from '@/types';

// export const mockGeofences: Geofence[] = [
//   { id: 1, nom: 'Dépôt Central Kinshasa', type: 'depot',       lat: -4.3276,  lon: 15.3136,  rayon_metres: 500 },
//   { id: 2, nom: 'Station Total Gombe',     type: 'station',    lat: -4.3276,  lon: 15.3136,  rayon_metres: 150 },
//   { id: 3, nom: 'Station Shell Limete',    type: 'station',    lat: -4.3797,  lon: 15.2993,  rayon_metres: 150 },
//   { id: 4, nom: 'Station Total Lubumbashi',type: 'station',    lat: -11.6792, lon: 27.4794,  rayon_metres: 150 },
//   { id: 5, nom: 'Dépôt Nord Lubumbashi',   type: 'depot',      lat: -11.6792, lon: 27.4794,  rayon_metres: 500 },
//   { id: 6, nom: 'Dépôt Sud Goma',          type: 'depot',      lat: -1.6585,  lon: 29.2205,  rayon_metres: 500 },
//   { id: 7, nom: 'Zone risque Nord-Kivu',   type: 'zone_risque',lat: -1.5000,  lon: 29.0000,  rayon_metres: 5000 },
//   { id: 8, nom: 'Zone risque Katanga',     type: 'zone_risque',lat: -10.0000, lon: 26.0000,  rayon_metres: 10000 },
// ];

// export const mockGeofencePoints: GeofencePoint[] = [
//   // Polygone circulaire approximé pour Dépôt Central (8 points pour un cercle ~500m)
//   { id: 1, geofence_id: 1, sequence: 1, latitude: -4.3276, longitude: 15.3136 + 0.0045 }, // Est
//   { id: 2, geofence_id: 1, sequence: 2, latitude: -4.3276 + 0.0032, longitude: 15.3136 + 0.0032 }, // NE
//   { id: 3, geofence_id: 1, sequence: 3, latitude: -4.3276 + 0.0045, longitude: 15.3136 }, // Nord
//   { id: 4, geofence_id: 1, sequence: 4, latitude: -4.3276 + 0.0032, longitude: 15.3136 - 0.0032 }, // NW
//   { id: 5, geofence_id: 1, sequence: 5, latitude: -4.3276, longitude: 15.3136 - 0.0045 }, // Ouest
//   { id: 6, geofence_id: 1, sequence: 6, latitude: -4.3276 - 0.0032, longitude: 15.3136 - 0.0032 }, // SW
//   { id: 7, geofence_id: 1, sequence: 7, latitude: -4.3276 - 0.0045, longitude: 15.3136 }, // Sud
//   { id: 8, geofence_id: 1, sequence: 8, latitude: -4.3276 - 0.0032, longitude: 15.3136 + 0.0032 }, // SE
// ];