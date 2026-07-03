// // Données de base (entités principales)
// import { User, Vehicule, Site, Affectation } from '@/types';
// // src/mocks/data.ts

// // MOCKS CORRIGÉS
// export const mockSites: Site[] = [
//   { id: 1, nom: 'Dépôt Central', ville: 'Kinshasa', pays: 'RDC' },
//   { id: 2, nom: 'Dépôt Nord', ville: 'Lubumbashi', pays: 'RDC' },
//   { id: 3, nom: 'Dépôt Sud', ville: 'Goma', pays: 'RDC' },
// ];

// export const mockUsers: User[] = [
//   { id: 1, email: 'admin@trackfuel.com', matricule: 'ADM001', nom: 'Mukendi', prenom: 'Jean', role: 'admin' },
//   { id: 2, email: 'manager@trackfuel.com', matricule: 'MGR001', nom: 'Kabila', prenom: 'Marie', role: 'manager', site_id: 1 },
//   { id: 3, email: 'driver1@trackfuel.com', matricule: 'DRV001', nom: 'Tshisekedi', prenom: 'Paul', role: 'driver', site_id: 1 },
//   { id: 4, email: 'driver2@trackfuel.com', matricule: 'DRV002', nom: 'Mulamba', prenom: 'Joseph', role: 'driver', site_id: 1 },
//   { id: 5, email: 'supervisor@trackfuel.com', matricule: 'SUP001', nom: 'Ngoy', prenom: 'Sarah', role: 'manager', site_id: 2 },
//   { id: 6, email: 'audit@trackfuel.com', matricule: 'AUD001', nom: 'Mbuyi', prenom: 'Patrick', role: 'auditor' },
// ];

// export const mockVehicules: Vehicule[] = [
//   { id: 1, immatriculation: 'CGO-123-AA', marque: 'Toyota', modele: 'Land Cruiser', type: 'diesel', capacite_reservoir: 90, consommation_nominale: 13, site_id: 1, actif: true, carburant_initial: 50 },
//   { id: 2, immatriculation: 'CGO-456-BB', marque: 'Mitsubishi', modele: 'Canter', type: 'diesel', capacite_reservoir: 120, consommation_nominale: 18, site_id: 1, actif: true, carburant_initial: 80 },
//   { id: 3, immatriculation: 'CGO-789-CC', marque: 'Isuzu', modele: 'D-Max', type: 'diesel', capacite_reservoir: 80, consommation_nominale: 10, site_id: 2, actif: true, carburant_initial: 60 },
//   { id: 4, immatriculation: 'CGO-321-DD', marque: 'Nissan', modele: 'Patrol', type: 'essence', capacite_reservoir: 95, consommation_nominale: 14, site_id: 1, actif: false, carburant_initial: 45 },
//   { id: 5, immatriculation: 'CGO-654-EE', marque: 'Toyota', modele: 'Hilux', type: 'diesel', capacite_reservoir: 80, consommation_nominale: 11, site_id: 3, actif: true, carburant_initial: 55 },
// ];

// export const mockAffectations: Affectation[] = [
//   { id: 1, vehicule_id: 1, chauffeur_id: 3, date_debut: '2025-10-07T06:00:00Z', date_fin: '2025-12-12T14:00:00Z' },
//   { id: 2, vehicule_id: 2, chauffeur_id: 4, date_debut: '2025-09-21T05:00:00Z', date_fin: '2025-09-21T20:00:00Z' },
//   { id: 3, vehicule_id: 1, chauffeur_id: 3, date_debut: '2025-09-20T06:00:00Z', date_fin: '2025-09-20T18:30:00Z' },
//   { id: 4, vehicule_id: 1, chauffeur_id: 3, date_debut: '2025-09-22T07:00:00Z', date_fin: '2025-09-22T19:00:00Z' },
// ];