// Service de calcul de consommation de carburant
import { Trajet, Plein, NiveauCarburant, Vehicule } from '@/types';
import { getDaysAgo } from '@/lib/utils/dateUtils';

/**
 * Calcule la consommation d'un trajet spécifique
 */
export function getConsoTrajet(
  trajet: Trajet,
  niveauxCarburant: NiveauCarburant[],
  pleins: Plein[]
): number {
  const niveauAvant = niveauxCarburant.find(
    n => Number(n.trajet_id) === Number(trajet.id) && n.type === 'avant_trajet'
  );
  const niveauApres = niveauxCarburant.find(
    n => Number(n.trajet_id) === Number(trajet.id) && n.type === 'apres_trajet'
  );
  
  if (!niveauAvant || !niveauApres) return 0;
  
  const carburantConsomme = niveauAvant.niveau - niveauApres.niveau;
  
  // Ajouter les pleins effectués pendant le trajet
  const pleinsTrajet = pleins.filter(p => 
    p.vehicule_id === trajet.vehicule_id &&
    new Date(p.date) >= new Date(trajet.date_debut) &&
    new Date(p.date) <= new Date(trajet.date_fin)
  );
  
  const totalPleins = pleinsTrajet.reduce((sum, p) => sum + Number(p.litres), 0);
  const consommationTotale = carburantConsomme + totalPleins;
  
  return trajet.distance_km > 0 ? (consommationTotale / trajet.distance_km) * 100 : 0;
}

/**
 * Calcule la consommation moyenne d'un véhicule sur une période
 */
export function calculerConsommationMoyenne(
  vehiculeId: number,
  periodeJours: number,
  trajets: Trajet[],
  niveauxCarburant: NiveauCarburant[],
  pleins: Plein[]
): number {
  const dateDebut = getDaysAgo(periodeJours);
  
  const trajetsRecents = trajets.filter(t => 
    Number(t.vehicule_id) === Number(vehiculeId) && new Date(t.date_debut) >= dateDebut
  );
  
  if (trajetsRecents.length === 0) return 0;
  
  let totalDistance = 0;
  let totalCarburant = 0;
  
  trajetsRecents.forEach(trajet => {
    const niveauAvant = niveauxCarburant.find(
      n => Number(n.trajet_id) === Number(trajet.id) && n.type === 'avant_trajet'
    );
    const niveauApres = niveauxCarburant.find(
      n => Number(n.trajet_id) === Number(trajet.id) && n.type === 'apres_trajet'
    );
    
    if (niveauAvant && niveauApres) {
      const carburantConsomme = niveauAvant.niveau - niveauApres.niveau;
      
      // Ajouter les pleins effectués pendant le trajet
      const pleinsTrajet = pleins.filter(p => 
        p.vehicule_id === vehiculeId &&
        new Date(p.date) >= new Date(trajet.date_debut) &&
        new Date(p.date) <= new Date(trajet.date_fin)
      );
      
      const totalPleins = pleinsTrajet.reduce((sum, p) => sum + Number(p.litres), 0);
      totalCarburant += carburantConsomme + totalPleins;
      totalDistance += trajet.distance_km;
    }
  });
  
  return totalDistance > 0 ? (totalCarburant / totalDistance) * 100 : 0;
}

/**
 * Calcule les statistiques de consommation pour tous les véhicules actifs
 */
export function calculerStatistiquesConsommation(
  vehicules: Vehicule[],
  trajets: Trajet[],
  niveauxCarburant: NiveauCarburant[],
  pleins: Plein[],
  periodeJours: number = 30
) {
  return vehicules
    .filter(v => v.actif)
    .map(vehicule => {
      const consoMoyenne = calculerConsommationMoyenne(
        vehicule.id,
        periodeJours,
        trajets,
        niveauxCarburant,
        pleins
      );
      
      const ecart_pourcentage = vehicule.consommation_nominale > 0
        ? (((consoMoyenne - vehicule.consommation_nominale) / vehicule.consommation_nominale) * 100)
        : 0;
      
      return {
        vehicule_id: vehicule.immatriculation,
        immatriculation: vehicule.immatriculation,
        consommation: Number(consoMoyenne.toFixed(1)),
        ecart_pourcentage: Number(ecart_pourcentage.toFixed(4))
      };
    })
    .filter(v => v.consommation > 0)
    .sort((a, b) => b.ecart_pourcentage - a.ecart_pourcentage);
}
