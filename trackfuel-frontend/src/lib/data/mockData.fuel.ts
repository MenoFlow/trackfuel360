// // src/mocks/fuel-data.ts
// import { Plein, NiveauCarburant, PleinExifMetadata } from '@/types';

// export const mockPleins: Plein[] = [
//   {
//     id: 1,
//     vehicule_id: 1,     // CGO-123-AA
//     chauffeur_id: 3,    // Paul Tshisekedi
//     date: '2025-10-07T10:30:00Z',
//     litres: 45,
//     prix_unitaire: 1.35,
//     montant_total: 60.75, // auto-calculé
//     odometre: 120450,
//     station: 'Station Total Gombe',
//     type_saisie: 'manuelle',
//     photo_bon: 'receipt_p1.jpg',
//     latitude: -4.3276,
//     longitude: 15.3136,
//   },
//   {
//     id: 2,
//     vehicule_id: 1,
//     chauffeur_id: 3,
//     date: '2025-09-22T14:15:00Z',
//     litres: 68,
//     prix_unitaire: 2.5,
//     montant_total: 170,
//     odometre: 120332,
//     station: 'Shell Limete',
//     type_saisie: 'auto',
//     photo_bon: 'receipt_p2.jpg',
//     latitude: -4.3797,
//     longitude: 15.2993,
//   },
//   {
//     id: 3,
//     vehicule_id: 2,     // CGO-456-BB
//     chauffeur_id: 4,    // Joseph Mulamba
//     date: '2025-09-21T10:00:00Z',
//     litres: 105,
//     prix_unitaire: 2.4,
//     montant_total: 252,
//     odometre: 78450,
//     station: 'Engen Matadi',
//     type_saisie: 'manuelle',
//     photo_bon: 'receipt_p3.jpg',
//     latitude: -5.8167,
//     longitude: 13.4500,
//   },
//   {
//     id: 4,
//     vehicule_id: 3,     // CGO-789-CC
//     chauffeur_id: 5,    // Sarah Ngoy
//     date: '2025-09-19T16:45:00Z',
//     litres: 72,
//     prix_unitaire: 2.6,
//     montant_total: 187.2,
//     odometre: 23100,
//     station: 'Total Lubumbashi',
//     type_saisie: 'auto',
//     photo_bon: 'receipt_p4.jpg',
//     latitude: -11.6792,
//     longitude: 27.4794,
//   },
// ];

// export const mockPleinExifMetadata: PleinExifMetadata[] = [
//   {
//     id: 1,
//     plein_id: 1,
//     date: '2025-10-07',
//     heure: '10:30:00',
//     latitude: -4.3276,
//     longitude: 15.3136,
//     modele_telephone: 'Samsung Galaxy S21',
//   },
//   {
//     id: 2,
//     plein_id: 2,
//     date: '2025-09-22',
//     heure: '14:15:00',
//     latitude: -4.3797,
//     longitude: 15.2993,
//     modele_telephone: 'iPhone 13',
//   },
//   {
//     id: 3,
//     plein_id: 3,
//     date: '2025-09-21',
//     heure: '10:00:00',
//     latitude: -5.8167,
//     longitude: 13.4500,
//     modele_telephone: 'Samsung Galaxy A52',
//   },
//   {
//     id: 4,
//     plein_id: 4,
//     date: '2025-09-19',
//     heure: '16:45:00',
//     latitude: -11.6792,
//     longitude: 27.4794,
//     modele_telephone: 'Xiaomi Redmi Note 10',
//   },
// ];

// export const mockNiveauxCarburant: NiveauCarburant[] = [
//   // Vol détecté : -47.7L en 1h45 (118 km) → alerte !
//   { id: 1, vehicule_id: 1, timestamp: '2025-10-07T08:00:00Z', niveau: 50, type: 'avant_trajet', trajet_id: 1 },
//   { id: 2, vehicule_id: 1, timestamp: '2025-10-07T10:30:00Z', niveau: 41.2, type: 'avant_plein', plein_id: 1 },
//   { id: 3, vehicule_id: 1, timestamp: '2025-10-07T10:31:00Z', niveau: 86.2, type: 'apres_plein', plein_id: 1 },
//   { id: 4, vehicule_id: 1, timestamp: '2025-10-07T12:15:00Z', niveau: 38.5, type: 'apres_trajet', trajet_id: 1 },

//   // Trajet normal CGO-456-BB (120L)
//   { id: 5, vehicule_id: 2, timestamp: '2025-09-21T05:30:00Z', niveau: 80, type: 'avant_trajet', trajet_id: 4 },
//   { id: 6, vehicule_id: 2, timestamp: '2025-09-21T10:00:00Z', niveau: 68.4, type: 'avant_plein', plein_id: 3 },
//   { id: 7, vehicule_id: 2, timestamp: '2025-09-21T10:01:00Z', niveau: 120, type: 'apres_plein', plein_id: 3 },
//   { id: 8, vehicule_id: 2, timestamp: '2025-09-21T20:15:00Z', niveau: 62, type: 'apres_trajet', trajet_id: 4 },

//   // Autres trajets CGO-123-AA
//   { id: 9, vehicule_id: 1, timestamp: '2025-09-20T06:00:00Z', niveau: 55, type: 'avant_trajet', trajet_id: 2 },
//   { id: 10, vehicule_id: 1, timestamp: '2025-09-20T18:30:00Z', niveau: 18, type: 'apres_trajet', trajet_id: 2 },

//   { id: 11, vehicule_id: 1, timestamp: '2025-09-22T07:00:00Z', niveau: 18, type: 'avant_trajet', trajet_id: 3 },
//   { id: 12, vehicule_id: 1, timestamp: '2025-09-22T14:15:00Z', niveau: 12, type: 'avant_plein', plein_id: 2 },
//   { id: 13, vehicule_id: 1, timestamp: '2025-09-22T14:16:00Z', niveau: 80, type: 'apres_plein', plein_id: 2 },
//   { id: 14, vehicule_id: 1, timestamp: '2025-09-22T19:00:00Z', niveau: 11, type: 'apres_trajet', trajet_id: 3 },
// ];