// // Données de corrections et paramètres
// import { Correction, ParametresDetection } from '@/types';
// // src/mocks/corrections-params.ts

// export const mockCorrections: Correction[] = [
//   {
//     id: 1,
//     table: 'pleins',
//     record_id: 3,
//     champ: 'litres',
//     old_value: '95',
//     new_value: '105',
//     status: 'pending',
//     comment: 'Erreur de saisie initiale - bon papier indique 105L',
//     requested_by: 4,
//     requested_at: '2025-09-21T11:00:00Z',
//     validated_by: null,
//     validated_at: null,
//   },
//   { 
//     id: 2,
//     table: 'pleins',
//     record_id: 1,
//     champ: 'odometre',
//     old_value: '120400',
//     new_value: '120450',
//     status: 'validated',
//     comment: 'Correction odomètre après vérification photo',
//     requested_by: 3,
//     requested_at: '2025-10-07T11:00:00Z',
//     validated_by: 2,
//     validated_at: '2025-10-07T14:30:00Z',
//   },
// ];

// export const mockParametresDetection: ParametresDetection = {
//   seuil_surconsommation_pct: 30,
//   seuil_ecart_gps_pct: 20,
//   seuil_carburant_disparu_litres: 5,
//   seuil_exif_heures: 2,
//   seuil_exif_distance_km: 1,
//   seuil_immobilisation_heures: 12,
//   periode_consommation_jours: 7,
// };