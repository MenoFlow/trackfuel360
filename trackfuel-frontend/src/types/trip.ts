/**
 * Type definitions for Trip management
 * These types will be shared between frontend and backend
 */

export interface TripGPSPoint {
  id?: number;
  trajet_id: number;
  sequence: number;
  latitude: number;
  longitude: number;
  timestamp: string; // ISO datetime string
}
export type SaisieType = 'auto' | 'manuelle';
export interface TraceGPSPoint {
  id: number;
  trajet_id: number;
  sequence: number;
  latitude: number;
  longitude: number;
  timestamp: string;
  traceGps?: any;
}
export interface Trip {
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

export interface TripInput {
  vehicule_id: number;
  chauffeur_id: number;
  date_debut: string;
  date_fin: string;
  distance_km: number;
  type_saisie: "auto" | "manuelle";
  traceGps: TripGPSPoint[];
}

export interface TripFilters {
  vehicule_id?: string;
  start_date?: string;
  end_date?: string;
}
