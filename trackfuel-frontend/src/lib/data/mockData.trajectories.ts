// // src/mocks/trips-gps.ts
// import { Trajet, TraceGPSPoint } from '@/types';

// export const mockTrajets: Trajet[] = [
//   {
//     id: 1,
//     vehicule_id: 1,        // CGO-123-AA
//     chauffeur_id: 3,       // Paul Tshisekedi
//     date_debut: '2025-10-07T08:00:00Z',
//     date_fin: '2025-10-07T12:15:00Z',
//     distance_km: 118.1,
//     type_saisie: 'auto',
//   },
//   {
//     id: 2,
//     vehicule_id: 1,
//     chauffeur_id: 3,
//     date_debut: '2025-09-20T06:00:00Z',
//     date_fin: '2025-09-20T18:30:00Z',
//     distance_km: 285,
//     type_saisie: 'auto',
//   },
//   {
//     id: 3,
//     vehicule_id: 2,        // CGO-456-BB
//     chauffeur_id: 4,       // Joseph Mulamba
//     date_debut: '2025-09-22T07:00:00Z',
//     date_fin: '2025-09-22T19:00:00Z',
//     distance_km: 297,
//     type_saisie: 'auto',
//   },
//   {
//     id: 4,
//     vehicule_id: 3,        // CGO-789-CC
//     chauffeur_id: 5,       // Sarah Ngoy (manager Lubumbashi)
//     date_debut: '2025-09-21T05:30:00Z',
//     date_fin: '2025-09-21T20:15:00Z',
//     distance_km: 620,
//     type_saisie: 'manuelle',
//   },
//   {
//     id: 5,
//     vehicule_id: 5,        // CGO-654-EE
//     chauffeur_id: 3,
//     date_debut: '2025-09-28T10:00:00Z',
//     date_fin: '2025-09-28T18:00:00Z',
//     distance_km: 320,
//     type_saisie: 'auto',
//   },
// ];

// export const mockTraceGPSPoints: TraceGPSPoint[] = [
//   // Trajet 1 : Kinshasa → Kintambo (118 km)
//   { id: 1,  trajet_id: 1, sequence: 1,  latitude: -4.3034, longitude: 15.3101, timestamp: '2025-10-07T08:00:00Z' },
//   { id: 2,  trajet_id: 1, sequence: 2,  latitude: -4.3200, longitude: 15.2800, timestamp: '2025-10-07T08:30:00Z' },
//   { id: 3,  trajet_id: 1, sequence: 3,  latitude: -4.3500, longitude: 15.2500, timestamp: '2025-10-07T09:00:00Z' },
//   { id: 4,  trajet_id: 1, sequence: 4,  latitude: -4.3800, longitude: 15.2200, timestamp: '2025-10-07T09:30:00Z' },
//   { id: 5,  trajet_id: 1, sequence: 5,  latitude: -4.4100, longitude: 15.2000, timestamp: '2025-10-07T10:30:00Z' },
//   { id: 6,  trajet_id: 1, sequence: 6,  latitude: -4.4400, longitude: 15.1800, timestamp: '2025-10-07T11:00:00Z' },
//   { id: 7,  trajet_id: 1, sequence: 7,  latitude: -4.4700, longitude: 15.1600, timestamp: '2025-10-07T11:45:00Z' },
//   { id: 8,  trajet_id: 1, sequence: 8,  latitude: -4.5000, longitude: 15.1400, timestamp: '2025-10-07T12:15:00Z' },

//   // Trajet 2 : Kinshasa → Matadi (285 km)
//   { id: 9,  trajet_id: 2, sequence: 1,  latitude: -4.3034, longitude: 15.3101, timestamp: '2025-09-20T06:00:00Z' },
//   { id: 10, trajet_id: 2, sequence: 2,  latitude: -4.5000, longitude: 15.0000, timestamp: '2025-09-20T08:00:00Z' },
//   { id: 11, trajet_id: 2, sequence: 3,  latitude: -4.8000, longitude: 14.6000, timestamp: '2025-09-20T10:00:00Z' },
//   { id: 12, trajet_id: 2, sequence: 4,  latitude: -5.1000, longitude: 14.2000, timestamp: '2025-09-20T12:00:00Z' },
//   { id: 13, trajet_id: 2, sequence: 5,  latitude: -5.4000, longitude: 13.8000, timestamp: '2025-09-20T14:00:00Z' },
//   { id: 14, trajet_id: 2, sequence: 6,  latitude: -5.7000, longitude: 13.4000, timestamp: '2025-09-20T16:00:00Z' },
//   { id: 15, trajet_id: 2, sequence: 7,  latitude: -5.8200, longitude: 13.0500, timestamp: '2025-09-20T18:30:00Z' },

//   // Trajet 3 : Lubumbashi → Kolwezi (297 km)
//   { id: 16, trajet_id: 3, sequence: 1,  latitude: -11.6647, longitude: 27.4794, timestamp: '2025-09-22T07:00:00Z' },
//   { id: 17, trajet_id: 3, sequence: 2,  latitude: -11.5000, longitude: 27.2000, timestamp: '2025-09-22T09:00:00Z' },
//   { id: 18, trajet_id: 3, sequence: 3,  latitude: -11.3000, longitude: 26.9000, timestamp: '2025-09-22T11:00:00Z' },
//   { id: 19, trajet_id: 3, sequence: 4,  latitude: -11.1000, longitude: 26.6000, timestamp: '2025-09-22T13:00:00Z' },
//   { id: 20, trajet_id: 3, sequence: 5,  latitude: -10.9000, longitude: 26.3000, timestamp: '2025-09-22T15:00:00Z' },
//   { id: 21, trajet_id: 3, sequence: 6,  latitude: -10.7000, longitude: 26.0000, timestamp: '2025-09-22T19:00:00Z' },

//   // Trajet 4 : Goma → Bukavu (620 km via Kisangani)
//   { id: 22, trajet_id: 4, sequence: 1,  latitude: -1.6585, longitude: 29.2205, timestamp: '2025-09-21T05:30:00Z' },
//   { id: 23, trajet_id: 4, sequence: 2,  latitude: -1.4000, longitude: 29.0000, timestamp: '2025-09-21T08:00:00Z' },
//   { id: 24, trajet_id: 4, sequence: 3,  latitude: -1.1000, longitude: 28.8000, timestamp: '2025-09-21T10:30:00Z' },
//   { id: 25, trajet_id: 4, sequence: 4,  latitude: -0.8000, longitude: 28.6000, timestamp: '2025-09-21T13:00:00Z' },
//   { id: 26, trajet_id: 4, sequence: 5,  latitude: -0.5000, longitude: 28.4000, timestamp: '2025-09-21T15:30:00Z' },
//   { id: 27, trajet_id: 4, sequence: 6,  latitude: -0.2000, longitude: 28.2000, timestamp: '2025-09-21T18:00:00Z' },
//   { id: 28, trajet_id: 4, sequence: 7,  latitude: -0.1000, longitude: 28.0000, timestamp: '2025-09-21T20:15:00Z' },

//   // Trajet 5 : Kinshasa → Bandundu (320 km)
//   { id: 29, trajet_id: 5, sequence: 1,  latitude: -4.3034, longitude: 15.3101, timestamp: '2025-09-28T10:00:00Z' },
//   { id: 30, trajet_id: 5, sequence: 2,  latitude: -4.0000, longitude: 15.8000, timestamp: '2025-09-28T11:30:00Z' },
//   { id: 31, trajet_id: 5, sequence: 3,  latitude: -3.7000, longitude: 16.3000, timestamp: '2025-09-28T13:00:00Z' },
//   { id: 32, trajet_id: 5, sequence: 4,  latitude: -3.4000, longitude: 16.8000, timestamp: '2025-09-28T14:30:00Z' },
//   { id: 33, trajet_id: 5, sequence: 5,  latitude: -3.3000, longitude: 17.3000, timestamp: '2025-09-28T16:00:00Z' },
//   { id: 34, trajet_id: 5, sequence: 6,  latitude: -3.3167, longitude: 17.3833, timestamp: '2025-09-28T18:00:00Z' },
// ];