import { Vehicule, FuelStatus, Trajet, Plein } from '@/types';

// Structure pour combiner toutes les données d'un véhicule
export interface VehicleWithData extends Vehicule {
  trajets: Array<{
    id: number;
    date_debut: string;
    date_fin: string;
    distance_km: number;
  }>;
  pleins?: Array<{
    id: number;
    date: string;
    litres: number;
  }>;
}

// Calcul du carburant restant en tenant compte des trajets ET des ravitaillements
export const calculateFuelRemaining = (vehicle: Vehicule, trips: Trajet[], refuels: Plein[]): number => {
  const trajets = trips;
  const pleins = refuels;
  
  // Carburant de départ
  let fuelRemaining = vehicle?.carburant_initial || 0;
  
  // Soustraire la consommation des trajets
  const totalDistance = trajets?.reduce((sum, trip) => sum + Number(trip.distance_km), 0);
  const fuelConsumed = (vehicle?.consommation_nominale / 100) * totalDistance;
  fuelRemaining -= fuelConsumed;

  // Ajouter les ravitaillements
  const totalRefueled = pleins?.reduce((sum, plein) => sum + Number(plein.litres), 0);
  fuelRemaining += totalRefueled;
  // Ne peut pas être négatif ou dépasser la capacité du réservoir
  return Math.max(0, Math.min((fuelRemaining), vehicle?.capacite_reservoir));
};

export const calculateAutonomy = (vehicle: Vehicule, trips: Trajet[], refuels: Plein[]): number => {
  const fuelRemaining = calculateFuelRemaining(vehicle, trips, refuels);
  return (fuelRemaining / vehicle?.consommation_nominale) * 100;
};

export const getFuelLevel = (vehicle: Vehicule, trips: Trajet[], refuels: Plein[]): number => {
  const fuelRemaining = calculateFuelRemaining(vehicle, trips, refuels);
  return (fuelRemaining / vehicle?.capacite_reservoir) * 100;
};

export const getFuelStatus = (vehicle: Vehicule, trips: Trajet[], refuels: Plein[]): 'critical' | 'low' | 'medium' | 'high' => {
  const fuelLevel = getFuelLevel(vehicle, trips, refuels);
  const fuelRemaining = calculateFuelRemaining(vehicle, trips, refuels);
  
  if (fuelRemaining < 10 || fuelLevel < 15) return 'critical';
  if (fuelLevel < 30) return 'low';
  if (fuelLevel < 60) return 'medium';
  return 'high';
};

export function getFuelStatusColor(status: FuelStatus): string {
  switch (status) {
    case 'critical': return '#ef4444';
    case 'low': return '#f97316';
    case 'medium': return '#eab308';
    case 'high': return '#22c55e';
    default: return '#6b7280';
  }
}

export function getFuelStatusLabel(status: FuelStatus): string {
  switch (status) {
    case 'critical': return 'Critique';
    case 'low': return 'Faible';
    case 'medium': return 'Moyen';
    case 'high': return 'Normal';
    default: return 'Inconnu';
  }
}
