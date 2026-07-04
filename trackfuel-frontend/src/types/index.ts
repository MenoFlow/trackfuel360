// Types pour TrackFuel360

export interface Parametre {
  id: string;
  label?: string;
  description?: string;
  valeur: number;
  unite?: string;
  min?: number;
  max?: number;
}

export type AppRole = 'admin' | 'manager' | 'supervisor' | 'driver' | 'auditor';

export type SaisieType = 'auto' | 'manuelle';

export type CorrectionStatus = 'pending' | 'validated' | 'rejected';


export type AlerteStatus = 'new' | 'in_progress' | 'resolved' | 'dismissed';

// Types de rapports
export type RapportType = 
  | 'mensuel_site' 
  | 'top_ecarts' 
  | 'anomalies' 
  | 'corrections' 
  | 'comparaison' 
  | 'kpi_global';

export type FormatExport = 'pdf' | 'excel' | 'csv' | 'json';

export type AlerteType = 
  | 'consommation_elevee' 
  | 'plein_hors_zone' 
  | 'doublon_bon' 
  | 'distance_gps_ecart'
  | 'immobilisation_anormale'
  | 'carburant_disparu'
  | 'bon_carburant_suspect'
  | 'plein_suspect';

export interface RapportFilters {
  date_debut?: string;
  date_fin?: string;
  site_id?: number;
  vehicule_id?: number;
  chauffeur_id?: number;
  type_anomalie?: AlerteType;
  score_minimum?: number;
  statut_correction?: CorrectionStatus;
  type_saisie?: SaisieType;
}

export interface RapportMetadata {
  id: string;
  type: RapportType;
  titre: string;
  description: string;
  date_generation: string;
  utilisateur_id: number;
  utilisateur_nom: string;
  filtres?: RapportFilters;
  nb_lignes: number;
  format?: FormatExport;
}

export interface RapportData {
  metadata: RapportMetadata;
  donnees: any[];
  statistiques?: {
    total_vehicules?: number;
    total_litres?: number;
    total_cout?: number;
    consommation_moyenne?: number;
    nb_anomalies?: number;
    nb_corrections?: number;
    [key: string]: any;
  };
}

export interface User {
  id: number;
  email: string;
  matricule: string;
  nom: string;
  prenom: string;
  role: AppRole;
  site_id?: number;
  password_hash?: string;
  created_at?: string;
  updated_at?: string;
}

// types/vehicule.ts

/** Types de carburant autorisés */
export type VehiculeType = 'essence' | 'diesel' | 'hybride' | 'gpl';
export interface Vehicule {
  id?: number;
  immatriculation?: string;
  marque: string;
  modele: string;
  type: VehiculeType;
  capacite_reservoir: number;
  consommation_nominale: number;
  carburant_initial?: number;
  kilometrage_initial?: number;
  actif?: boolean;
  site_id?: number | null;
  created_at?: string;
  updated_at?: string;
}
export interface VehicleWithPosition extends Vehicule {
  position: [number, number];
}

export interface Site {
  id: number;
  nom: string;
  ville: string;
  pays: string;
}

export interface Affectation {
  id: number;
  vehicule_id: number;
  chauffeur_id: number;
  mission_id?: number | null;
  source?: 'manuelle' | 'mission';
  date_debut: string;
  date_fin: string;
  mission_destination?: string | null;
  mission_motif?: string | null;
  mission_statut?: string | null;
  created_at?: string;
}


export interface TraceGPSPoint {
  id: number;
  trajet_id: number;
  sequence: number;
  latitude: number;
  longitude: number;
  timestamp: string;
  traceGps?: any
}

export interface Trajet {
  id: number;
  vehicule_id: number;
  chauffeur_id: number;
  date_debut: string; // ISO: '2025-10-07T08:00:00Z'
  date_fin: string;   // ISO: '2025-10-07T12:15:00Z'
  distance_km: number;
  type_saisie: SaisieType;
  traceGps?: TraceGPSPoint[]; // Optionnel : tableau de points GPS
  created_at?: any;
}


// @/types/fuel.ts
export interface Plein {
  id: number;
  vehicule_id: number;
  chauffeur_id: number;
  date: string;
  litres: number;
  prix_unitaire: number;
  montant_total?: number;
  odometre: number;
  station: string;
  type_saisie: 'manuelle' | 'auto';
  photo_bon?: File | string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface PleinExifMetadata {
  id: number;
  plein_id: number;
  date: string; // 'YYYY-MM-DD'
  heure: string; // 'HH:MM:SS'
  latitude?: number | null;
  longitude?: number | null;
  modele_telephone?: string | null;
}

export interface NiveauCarburant {
  id: number;
  vehicule_id: number;
  timestamp: string;
  niveau: number;
  type: 'avant_trajet' | 'avant_plein' | 'apres_plein' | 'apres_trajet';
  trajet_id?: number | null;
  plein_id?: number | null;
}

export interface NiveauCarburant {
  id: number;
  vehicule_id: number;
  timestamp: string;
  niveau: number; // Litres
  type: 'avant_trajet' | 'apres_trajet' | 'avant_plein' | 'apres_plein';
  trajet_id?: number; // Référence au trajet concerné
  plein_id?: number; // Référence au plein concerné
}

export interface ParametresDetection {
  seuil_surconsommation_pct: number; // % au-dessus de la nominale
  seuil_ecart_gps_pct: number; // % écart GPS vs odomètre
  seuil_carburant_disparu_litres: number; // Litres manquants minimum
  seuil_exif_heures: number; // Heures d'écart EXIF max
  seuil_exif_distance_km: number; // Distance EXIF max en km
  seuil_immobilisation_heures: number; // Heures d'immobilisation hors dépôt
  periode_consommation_jours: number; // Période pour calcul consommation moyenne
}

export interface AlerteMetadata {
  id: string;
  alerte_id: string;
  key: string;
  value: string;
}

export interface Alerte {
  id: string;
  vehicule_id: number;
  type: AlerteType;
  titre: string;
  description: string;
  score: number; // 0-100
  status: AlerteStatus;
  date_detection: string;
  justification?: string;
  resolved_by?: number;
  resolved_at?: string;
  chauffeur_id?: number;
  deviation_percent?: number;
  litres_manquants?: number;
  severity?: 'low' | 'medium' | 'high';
  meta?: {
    bon_scanne_id: number;
    raisons_detaillees: string[];
  };
}

export interface Correction {
  id?: number;
  table: string;
  record_id: number;
  champ: string;
  old_value: any;
  new_value: any;
  status: CorrectionStatus;
  comment?: string;
  requested_by: number;
  requested_at: string;
  validated_by?: number;
  validated_at?: string;
}

// @/types/geofence.ts
export type GeofenceType = 'depot' | 'station' | 'zone_risque';

export interface Geofence {
  id?: number;
  nom: string;
  type: GeofenceType;
  lat: number;
  lon: number;
  rayon_metres: number;
}

export interface GeofencePoint {
  id: number;
  geofence_id: number;
  sequence: number;
  latitude: number;
  longitude: number;
}

export type FuelStatus = 'critical' | 'low' | 'medium' | 'high';

export interface FilterState {
  showCritical: boolean;
  showLow: boolean;
  showMedium: boolean;
  showHigh: boolean;
}

export interface Alert {
  id: string;
  vehicleId: number;
  vehicleImmatriculation: string;
  vehicleModele: string;
  geofenceId: number;
  geofenceName: string;
  timestamp: string;
  coordinates: [number, number];
  isRead: boolean;
}

export interface BonCarburantScanne {
  id: number
  plein_id: number
  station?: string | null
  date_bon?: string | null
  litres?: number | null
  prix_total?: number | null
  chauffeur_matricule?: string | null
  chauffeur_nom?: string | null
  chauffeur_prenom?: string | null
  vehicule_immatriculation?: string | null
  vehicule_marque?: string | null
  photo_path?: string | null
  ocr_confidence?: number | null
  created_at?: string
}


export interface ConsommationStats {
  vehicule_id: string;
  periode: string;
  litres_total: number;
  distance_total_km: number;
  consommation_moyenne: number; // L/100km
  cout_total: number;
  cout_par_km: number;
  nb_pleins: number;
}

export interface DashboardStats {
  total_vehicules: number;
  vehicules_actifs: number;
  alertes_actives: number;
  cout_carburant_mois: number;
  litres_mois: number;
  distance_mois_km: number;
  consommation_moyenne_flotte: number;
  top_vehicules_consommation: Array<{
    vehicule_id: string;
    immatriculation: string;
    consommation: number;
    ecart_pourcentage: number;
  }>;
}
export const DATA_TYPES = [
  { value: 'Client', label: 'Clients', dependencies: [] },
  { value: 'Module', label: 'Modules', dependencies: [] },
  { value: 'ClientModule', label: 'Modules clients', dependencies: ['Client', 'Module'] },
  { value: 'AppConfiguration', label: 'Configuration app', dependencies: [] },
  { value: 'RoleModulePermission', label: 'Permissions modules', dependencies: ['Module'] },
  { value: 'Site', label: 'Sites', dependencies: [] },
  { value: 'User', label: 'Utilisateurs', dependencies: ['Site'] },
  { value: 'DriverProfile', label: 'Profils chauffeurs', dependencies: ['User'] },
  { value: 'Vehicule', label: 'Véhicules', dependencies: ['Site'] },
  { value: 'Geofence', label: 'Geofences', dependencies: [] },
  { value: 'Affectation', label: 'Affectations', dependencies: ['Vehicule', 'User'] },
  { value: 'Trip', label: 'Trajets', dependencies: ['Vehicule', 'User'] },
  { value: 'TraceGps', label: 'Traces GPS', dependencies: ['Trip'] },
  { value: 'Plein', label: 'Pleins', dependencies: ['Vehicule', 'User'] },
  { value: 'BonCarburantScanne', label: 'Bons carburant OCR', dependencies: ['Plein'] },
  { value: 'PleinExifMetadata', label: 'Métadonnées EXIF', dependencies: ['Plein'] },
  { value: 'NiveauCarburant', label: 'Niveaux Carburant', dependencies: ['Vehicule', 'Plein'] },
  { value: 'Parametre', label: 'Paramètres', dependencies: [] },
  { value: 'Correction', label: 'Corrections', dependencies: ['User'] },
  { value: 'OrdreMission', label: 'Ordres de mission', dependencies: ['Vehicule', 'User'] },
  { value: 'MaintenanceIntervention', label: 'Maintenance', dependencies: ['Vehicule'] },
  { value: 'DocumentAdministratif', label: 'Documents administratifs', dependencies: ['Vehicule', 'User'] },
  { value: 'VehicleReservation', label: 'Réservations véhicules', dependencies: ['Vehicule'] },
  { value: 'BudgetCout', label: 'Budgets et coûts', dependencies: ['Site', 'Vehicule'] },
  { value: 'StockPiece', label: 'Stock pièces', dependencies: [] },
  { value: 'PieceSortie', label: 'Sorties de pièces', dependencies: ['StockPiece'] },
  { value: 'RapportGenere', label: 'Rapports générés', dependencies: [] },
  { value: 'RapportShareToken', label: 'Liens de rapports', dependencies: ['RapportGenere'] },
] as const;
