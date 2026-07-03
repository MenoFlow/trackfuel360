// Service de détection d'immobilisation des véhicules
import { Trajet, TraceGPSPoint } from '@/types';
import { getCurrentDate, getDifferenceInHours } from '@/lib/utils/dateUtils';

export interface ImmobilisationInfo {
  dureeHeures: number;
  position: [number, number];
}

/**
 * Calcule la durée d'immobilisation d'un véhicule depuis son dernier trajet
 */
export function calculerDureeImmobilisation(
  vehiculeId: number,
  trajets: Trajet[],
  traceGPSPoints: TraceGPSPoint[]
): ImmobilisationInfo | null {
  const trajetsVehicule = trajets
    .filter(t => t.vehicule_id === vehiculeId)
    .sort((a, b) => new Date(b.date_fin).getTime() - new Date(a.date_fin).getTime());
  
  if (trajetsVehicule.length === 0) return null;
  
  const dernierTrajet = trajetsVehicule[0];
  const maintenant = getCurrentDate();
  const finDernierTrajet = new Date(dernierTrajet.date_fin);
  
  const dureeHeures = getDifferenceInHours(maintenant, finDernierTrajet);
  // Position = dernière position connue du trajet GPS
  const tracePoints = traceGPSPoints
    .filter(p => p.trajet_id === dernierTrajet.id)
    .sort((a, b) => b.sequence - a.sequence);
  
  const position: [number, number] = tracePoints.length > 0
    ? [tracePoints[0].latitude, tracePoints[0].longitude]
    : [-4.3276, 15.3136]; // Position par défaut si pas de trace GPS
  
  return { dureeHeures, position };
}

/**
 * Trouve tous les véhicules immobilisés au-delà d'un seuil
 */
export function trouverVehiculesImmobilises(
  vehiculeIds: number[],
  seuilHeures: number,
  trajets: Trajet[],
  traceGPSPoints: TraceGPSPoint[]
): Array<{ vehiculeId: number } & ImmobilisationInfo> {
  const resultats: Array<{ vehiculeId: number } & ImmobilisationInfo> = [];
  
  vehiculeIds.forEach(vehiculeId => {
    const immobilisation = calculerDureeImmobilisation(vehiculeId, trajets, traceGPSPoints);
    
    if (immobilisation && immobilisation.dureeHeures >= seuilHeures) {
      resultats.push({
        vehiculeId,
        ...immobilisation
      });
    }
  });
  
  return resultats;
}
