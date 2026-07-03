// Service de calcul des indicateurs comparatifs de flotte
import { Vehicule, Trajet, Plein, NiveauCarburant, User } from '@/types';
import { calculerConsommationMoyenne } from './consommationService';

export interface ComparaisonVehicule {
  vehicule_id: string;
  immatriculation: string;
  marque: string;
  modele: string;
  consommation_l_100km: number;
  cout_par_km: number;
  ecart_pct: number;
  chauffeur_nom?: string;
  chauffeur_prenom?: string;
  site_nom?: string;
  total_distance_km: number;
  total_litres: number;
  total_cout: number;
  nb_pleins: number;
}

/**
 * Calcule les indicateurs comparatifs pour tous les véhicules actifs
 */
export function calculerComparaisonFlotte(
  vehicules: Vehicule[],
  trajets: Trajet[],
  niveauxCarburant: NiveauCarburant[],
  pleins: Plein[],
  users: User[],
  sites: any[],
  periodeJours: number = 30
): ComparaisonVehicule[] {
  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() - periodeJours);

  const vehiculesActifs = vehicules.filter(v => v.actif);
  
  const comparaisons: ComparaisonVehicule[] = vehiculesActifs.map(vehicule => {
    // Trajets récents du véhicule
    const trajetsVehicule = trajets.filter(t => 
      t.vehicule_id === vehicule.id && 
      new Date(t.date_debut) >= dateDebut
    );

    // Pleins récents du véhicule
    const pleinsVehicule = pleins.filter(p => 
      p.vehicule_id === vehicule.id && 
      new Date(p.date) >= dateDebut
    );

    // Calculs de base
    const totalDistance = trajetsVehicule.reduce((sum, t) => sum + Number(t.distance_km), 0);
    const totalLitres = pleinsVehicule.reduce((sum, p) => sum + Number(p.litres), 0);
    const totalCout = pleinsVehicule.reduce((sum, p) => sum + Number(Number(p.litres) * Number(p.prix_unitaire)), 0);

    // Consommation moyenne (L/100km)
    const consommationMoyenne = calculerConsommationMoyenne(
      vehicule.id,
      periodeJours,
      trajets,
      niveauxCarburant,
      pleins
    );

    // Coût par km
    const coutParKm = totalDistance > 0 ? Number(totalCout) / Number(totalDistance) : 0;

    // Écart par rapport à la consommation nominale (%)
    const ecartPct = vehicule.consommation_nominale > 0
      ? Number((Number(Number(consommationMoyenne) - Number(vehicule.consommation_nominale))) / Number(vehicule.consommation_nominale)) * 100
      : 0;
    console.log(ecartPct);

    // Chauffeur le plus fréquent
    const chauffeurIds = trajetsVehicule.map(t => t.chauffeur_id);
    const chauffeurIdPlusFréquent = chauffeurIds.length > 0
      ? chauffeurIds.sort((a, b) => 
          chauffeurIds.filter(v => v === a).length - chauffeurIds.filter(v => v === b).length
        ).pop()
      : undefined;

    const chauffeur = chauffeurIdPlusFréquent 
      ? users.find(u => u.id === chauffeurIdPlusFréquent)
      : undefined;

    const site = vehicule.site_id 
      ? sites.find(s => s.id === vehicule.site_id)
      : undefined;

    return {
      vehicule_id: vehicule.immatriculation,
      immatriculation: vehicule.immatriculation,
      marque: vehicule.marque,
      modele: vehicule.modele,
      consommation_l_100km: Number(consommationMoyenne.toFixed(2)),
      cout_par_km: Number(coutParKm.toFixed(2)),
      ecart_pct: Number(ecartPct.toFixed(4)),
      chauffeur_nom: chauffeur?.nom,
      chauffeur_prenom: chauffeur?.prenom,
      site_nom: site?.nom,
      total_distance_km: Number(totalDistance.toFixed(1)),
      total_litres: Number(Number(totalLitres).toFixed(1)),
      total_cout: Number(totalCout.toFixed(2)),
      nb_pleins: pleinsVehicule.length,
    };
  });

  // Filtrer les véhicules sans données
  return comparaisons.filter(c => c.total_distance_km > 0);
}

/**
 * Calcule la moyenne de flotte pour un indicateur
 */
export function calculerMoyenneFlotte(
  comparaisons: ComparaisonVehicule[],
  indicateur: 'consommation_l_100km' | 'cout_par_km'
): number {
  if (comparaisons.length === 0) return 0;
  
  const total = comparaisons.reduce((sum, c) => sum + Number(c[indicateur]), 0);
  return Number((total / comparaisons.length).toFixed(2));
}
