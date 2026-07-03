// Service de génération des alertes
import { 
  Alerte, Vehicule, Trajet, Plein, NiveauCarburant, 
  Geofence, PleinExifMetadata, ParametresDetection, TraceGPSPoint, 
  User,
  BonCarburantScanne
} from '@/types';
import {
  detectBonCarburantSuspect,
  detectPleinHorsZone,
  detectSurconsommation,
  // detectEcartDistanceGPS,
  detectCarburantDisparu,
  detectExifSuspect,
  detectImmobilisationAnormale
} from '@/lib/utils/anomalyDetection';
import { calculerConsommationMoyenne } from './consommationService';
import { calculerDureeImmobilisation } from './immobilisationService';

/**
 * Génère toutes les alertes en fonction des données et paramètres
 */
export function generateAlertes(
  vehicules: Vehicule[],
  trajets: Trajet[],
  pleins: Plein[],
  niveauxCarburant: NiveauCarburant[],
  geofences: Geofence[],
  pleinExifMetadata: PleinExifMetadata[],
  traceGPSPoints: TraceGPSPoint[],
  params: ParametresDetection,
  users: User[],
  bonsCarburantScannes: BonCarburantScanne[]
): Alerte[] {
  const alertes: Alerte[] = [];
  
  
  // Stations autorisées et dépôts
  const stationsAutorisees = geofences
    .filter(g => g.type === 'station')
    .map(g => ({ id: g.id, nom: g.nom, lat: g.lat, lon: g.lon, rayon_metres: g.rayon_metres }));
  
  const depots = geofences
    .filter(g => g.type === 'depot')
    .map(g => ({ id: g.id, nom: g.nom, lat: g.lat, lon: g.lon, rayon_metres: g.rayon_metres }));
  
  // 1. Vérifier les pleins hors zone
  pleins.forEach(plein => {
    const vehicule = vehicules.find(v => v.id === plein.vehicule_id);
    if (vehicule) {
      const alerte = detectPleinHorsZone(plein, stationsAutorisees, vehicule);
      if (alerte) alertes.push(alerte);
    }
  });
  
  // 2. Vérifier les EXIF suspects
  pleins.forEach(plein => {
    const exifItem = pleinExifMetadata.find(e => e.plein_id === plein.id);
    const alerte = detectExifSuspect(plein, exifItem ?? null, params.seuil_exif_heures);
    if (alerte) alertes.push(alerte);
  });
  
  // 3. Vérifier écarts GPS vs odomètre
  // trajets.forEach(trajet => {
  //   const alerte = detectEcartDistanceGPS(trajet, params.seuil_ecart_gps_pct);
  //   if (alerte) alertes.push(alerte);
  // });
  
  // 4. Détecter carburant disparu pour chaque plein
  pleins.forEach(plein => {
    const vehicule = vehicules.find(v => v.id === plein.vehicule_id);
    if (!vehicule) return;
    
    const niveauAvantPlein = niveauxCarburant.find(
      n => n.plein_id === plein.id && n.type === 'avant_plein'
    );
    
    const niveauApresPlein = niveauxCarburant.find(
      n => n.plein_id === plein.id && n.type === 'apres_plein'
    );
    
    if (!niveauAvantPlein || !niveauApresPlein) return;
    
    // Trouver le trajet suivant ce plein
    const trajetApres = trajets.find(t => 
      t.vehicule_id === plein.vehicule_id &&
      new Date(t.date_debut) >= new Date(plein.date)
    );
    
    if (!trajetApres) return;
    
    const niveauApresTrajet = niveauxCarburant.find(
      n => n.trajet_id === trajetApres.id && n.type === 'apres_trajet'
    );
    
    if (!niveauApresTrajet) return;
    
    const consommationTheorique = (trajetApres.distance_km * vehicule.consommation_nominale) / 100;
    
    const alerteVol = detectCarburantDisparu(
      plein,
      niveauAvantPlein.niveau,
      niveauApresTrajet.niveau,
      consommationTheorique,
      trajetApres.distance_km
    );
    if (alerteVol) alertes.push(alerteVol);
  });
  
  // 5. Détecter surconsommation pour chaque véhicule actif
  vehicules.filter(v => v.actif).forEach(vehicule => {
    const consoMoyenne = calculerConsommationMoyenne(
      vehicule.id,
      params.periode_consommation_jours,
      trajets,
      niveauxCarburant,
      pleins
    );
    
    if (consoMoyenne > 0) {
      const alerteConso = detectSurconsommation(vehicule, consoMoyenne, params.periode_consommation_jours);
      if (alerteConso) alertes.push(alerteConso);
    }
  });
  
  // 6. Détecter immobilisation anormale pour chaque véhicule
  vehicules.filter(v => v.actif).forEach(vehicule => {
    const immobilisation = calculerDureeImmobilisation(vehicule.id, trajets, traceGPSPoints);
    if (immobilisation) {
      const alerteImmob = detectImmobilisationAnormale(
        vehicule,
        immobilisation.position,
        immobilisation.dureeHeures,
        depots,
        params.seuil_immobilisation_heures
      );
      if (alerteImmob) alertes.push(alerteImmob);
    }
  });

  // Ajouter cette boucle après les autres détections par exemple
pleins.forEach(plein => {
  const alerte = detectBonCarburantSuspect(
    plein,
    bonsCarburantScannes,   // ← tout le tableau
    users,                  // ← tableau complet des utilisateurs
    vehicules,              // ← tableau complet des véhicules
    5
  );
  if (alerte) alertes.push(alerte);
});
  
  return alertes;
}
