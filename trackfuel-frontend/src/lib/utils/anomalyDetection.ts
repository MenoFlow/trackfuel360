// Système de détection d'anomalies et génération d'alertes
import { Vehicule, Plein, Trajet, NiveauCarburant, Geofence, Alerte, AlerteType, PleinExifMetadata, BonCarburantScanne } from '@/types';
import { haversineDistance, isPointInGeofence } from './geolocation';

/**
 * Détecte si un plein est effectué hors zone autorisée
 */
export function detectPleinHorsZone(
  plein: Plein,
  stationsAutorisees: Array<{ id: number; nom: string; lat: number; lon: number; rayon_metres: number }>,
  vehicule: Vehicule
): Alerte | null {
  if (!plein.latitude || !plein.longitude) return null;
  
  const lat = plein.latitude;
  const lon = plein.longitude;
  
  // Vérifier si le plein est dans une station autorisée
  const dansZoneAutorisee = stationsAutorisees.some(station =>
    isPointInGeofence(lat, lon, station.lat, station.lon, station.rayon_metres)
  );
  
  if (!dansZoneAutorisee) {
    // Trouver la station la plus proche pour contexte
    let distanceMin = Infinity;
    let stationProche = '';
    
    stationsAutorisees.forEach(station => {
      const dist = haversineDistance(lat, lon, station.lat, station.lon);
      if (dist < distanceMin) {
        distanceMin = dist;
        stationProche = station.nom;
      }
    });
    
    return {
      id: `alert_hz_${plein.id}`,
      vehicule_id: vehicule.id,
      chauffeur_id: plein.chauffeur_id,
      type: 'plein_hors_zone',
      titre: 'Plein effectué hors zone autorisée',
      description: `Plein à "${plein.station}" situé à ${distanceMin.toFixed(1)}km de la station autorisée la plus proche (${stationProche})`,
      score: Math.min(95, 60 + distanceMin * 2),
      severity: distanceMin > 50 ? 'high' : distanceMin > 20 ? 'medium' : 'low',
      status: 'new',
      date_detection: new Date(plein.date).toISOString(),
    };
  }
  
  return null;
}

/**
 * Détecte une surconsommation par rapport à la consommation nominale
 */
export function detectSurconsommation(
  vehicule: Vehicule,
  consommationMoyenne: number,
  periodeJours: number = 7
): Alerte | null {
  const seuil = vehicule.consommation_nominale * 1.3; // 30% au-dessus de la nominale
  
  if (consommationMoyenne > seuil) {
    const deviationPercent = ((consommationMoyenne - vehicule.consommation_nominale) / vehicule.consommation_nominale) * 100;
    
    return {
      id: `alert_conso_${vehicule.immatriculation}`,
      vehicule_id: vehicule.id,
      type: 'consommation_elevee',
      titre: 'Surconsommation détectée',
      description: `Consommation moyenne de ${consommationMoyenne.toFixed(1)} L/100km vs nominale ${vehicule.consommation_nominale} L/100km (+${deviationPercent.toFixed(0)}%)`,
      score: Math.min(95, 50 + deviationPercent),
      severity: deviationPercent > 40 ? 'high' : deviationPercent > 25 ? 'medium' : 'low',
      status: 'new',
      date_detection: new Date().toISOString(),
      deviation_percent: deviationPercent,
    };
  }
  
  return null;
}

/**
 * Détecte du carburant disparu après un plein
 */
export function detectCarburantDisparu(
  plein: Plein,
  niveauAvantPlein: number,
  niveauApresTrajet: number,
  consommationTheorique: number,
  distanceKm: number
): Alerte | null {
  const niveauAttendu = niveauAvantPlein + plein.litres;
  const niveauFinalAttendu = niveauAttendu - consommationTheorique;
  const litresManquants = niveauFinalAttendu - niveauApresTrajet;
  
  // Seuil de 5L pour tenir compte des imprécisions
  if (litresManquants > 5) {
    const deviationPercent = (litresManquants / niveauAttendu) * 100;
    
    return {
      id: `alert_vol_${plein.id}`,
      vehicule_id: plein.vehicule_id,
      chauffeur_id: plein.chauffeur_id,
      type: 'carburant_disparu',
      titre: 'Carburant disparu après plein',
      description: `Plein de ${plein.litres}L effectué mais niveau final incohérent. Attendu: ${niveauFinalAttendu.toFixed(1)}L, Mesuré: ${niveauApresTrajet.toFixed(1)}L`,
      score: Math.min(98, 70 + deviationPercent),
      severity: litresManquants > 30 ? 'high' : litresManquants > 15 ? 'medium' : 'low',
      status: 'new',
      date_detection: new Date(plein.date).toISOString(),
      litres_manquants: litresManquants,
      deviation_percent: deviationPercent,
    };
  }
  
  return null;
}

/**
 * Détecte les métadonnées EXIF suspectes
 */
export function detectExifSuspect(
  plein: Plein,
  exifMetadata: PleinExifMetadata | undefined,
  seuilHeures: number = 2
): Alerte | null {
  if (!exifMetadata || !plein.latitude || !plein.longitude) return null;
  
  const datePlein = new Date(plein.date);
  const dateExif = new Date(`${exifMetadata.date.split("T")[0]}T${exifMetadata.heure}`);
  const ecartHeures = Math.abs(datePlein.getTime() - dateExif.getTime()) / (1000 * 60 * 60);
  // Vérifier écart de localisation
  const latPlein = plein.latitude;
  const lonPlein = plein.longitude;
  const latExif = exifMetadata.latitude;
  const lonExif = exifMetadata.longitude;
  const ecartDistanceKm = haversineDistance(latPlein, lonPlein, latExif, lonExif);
  
  if (ecartHeures > seuilHeures || ecartDistanceKm > 1) {
    let suspicionReason = '';
    if (ecartHeures > seuilHeures) {
      suspicionReason = `Photo prise ${ecartHeures.toFixed(1)}h ${ecartHeures > 0 ? 'avant' : 'après'} le plein déclaré`;
    }
    if (ecartDistanceKm > 1) {
      suspicionReason += (suspicionReason ? ' et ' : '') + `Localisation photo à ${ecartDistanceKm.toFixed(1)}km du plein`;
    }
    return {
      id: `alert_exif_${plein.id}`,
      vehicule_id: plein.vehicule_id,
      chauffeur_id: plein.chauffeur_id,
      type: 'plein_suspect',
      titre: 'Validation EXIF suspecte',
      description: `Les métadonnées EXIF de la photo ne correspondent pas aux données déclarées`,
      score: Math.min(95, 70 + ecartHeures * 5 + ecartDistanceKm * 10),
      severity: (ecartHeures > 4 || ecartDistanceKm > 5) ? 'high' : 'medium',
      status: 'new',
      date_detection: new Date(plein.date).toISOString(),
    };
  }
  
  return null;
}

/**
 * Détecte une immobilisation anormale hors dépôt
 */
export function detectImmobilisationAnormale(
  vehicule: Vehicule,
  position: [number, number],
  dureeHeures: number,
  depots: Array<{ id: number; nom: string; lat: number; lon: number; rayon_metres: number }>,
  seuilHeures: number = 12
): Alerte | null {
  if (dureeHeures < seuilHeures) return null;
  
  const [lat, lon] = position;
  const dansDepot = depots.some(depot =>
    isPointInGeofence(lat, lon, depot.lat, depot.lon, depot.rayon_metres)
  );
  
  if (!dansDepot) {
    return {
      id: `alert_immob_${vehicule.immatriculation}_${Date.now()}`,
      vehicule_id: vehicule.id,
      type: 'immobilisation_anormale',
      titre: 'Immobilisation prolongée hors dépôt',
      description: `Véhicule immobilisé ${dureeHeures.toFixed(1)}h en dehors d'un dépôt autorisé`,
      score: Math.min(90, 50 + dureeHeures * 2),
      severity: dureeHeures > 48 ? 'high' : dureeHeures > 24 ? 'medium' : 'low',
      status: 'new',
      date_detection: new Date().toISOString(),
    };
  }
  
  return null;
}

/**
 * Détecte les incohérences entre le bon carburant scanné (OCR) et les données déclarées du plein
 * - Usurpation d'identité chauffeur
 * - Véhicule différent sur le bon
 */
/**
 * Détecte les incohérences entre les données OCR du bon carburant scanné
 * et les informations réelles du plein (usurpation chauffeur / mauvais véhicule)
 */
export function detectBonCarburantSuspect(
  plein: Plein,
  bonScannes: BonCarburantScanne[],                    // ← Tableau complet
  users: Array<{ id: number; matricule: string; nom: string; prenom: string }>,
  vehicules: Vehicule[],
  seuilEcartLitres: number = 5,
  seuilSimilitudeNom: number = 0.75
): Alerte | null {
  // 1. Trouver le bon scanné correspondant à ce plein
  const bonScanne = bonScannes?.find(b => b.plein_id === plein.id);
  if (!bonScanne) return null;
  // console.log(bonScannes);
  const chauffeurPlein = users?.find(u => u.id === plein.chauffeur_id);
  const vehiculePlein = vehicules?.find(v => v.id === plein.vehicule_id);
  if (!chauffeurPlein || !vehiculePlein) return null;

  const raisons: string[] = [];
  let scoreBase = 60;

  // --- Chauffeur : matricule ---
  const matriculeOCR = (bonScanne.chauffeur_matricule || '').trim().toUpperCase();
  const matriculeReel = chauffeurPlein.matricule.trim().toUpperCase();

  if (matriculeOCR && matriculeOCR !== matriculeReel) {
    raisons.push(`Matricule OCR "${matriculeOCR}" ≠ réel "${matriculeReel}"`);
    scoreBase += 25;
  } else if (!matriculeOCR) {
    raisons.push('Matricule chauffeur absent sur le bon');
    scoreBase += 10;
  }

  // --- Chauffeur : nom + prénom (tolérant aux erreurs OCR) ---
  const nomOCR = `${(bonScanne.chauffeur_nom || '').trim()} ${(bonScanne.chauffeur_prenom || '').trim()}`.trim();
  const nomReel = `${chauffeurPlein.nom} ${chauffeurPlein.prenom}`.trim();

  if (nomOCR && nomReel) {
    const similarite = jaroWinkler(nomOCR.toLowerCase(), nomReel.toLowerCase());
    if (similarite < seuilSimilitudeNom) {
      raisons.push(`Nom chauffeur OCR "${nomOCR}" trop différent (similarité ${(similarite * 100).toFixed(0)}%)`);
      scoreBase += 20;
    }
  }

  // --- Véhicule : immatriculation ---
  const immatOCR = normalizeImmat((bonScanne.vehicule_immatriculation || '').trim());
  const immatReelle = normalizeImmat(vehiculePlein.immatriculation);

  if (immatOCR && immatOCR !== immatReelle) {
    raisons.push(`Immatriculation OCR "${bonScanne.vehicule_immatriculation}" ≠ réelle "${vehiculePlein.immatriculation}"`);
    scoreBase += 30;
  } else if (!immatOCR) {
    raisons.push('Immatriculation non détectée sur le bon');
    scoreBase += 15;
  }

  // --- Véhicule : marque (bonus) ---
  const marqueOCR = (bonScanne.vehicule_marque || '').trim().toUpperCase();
  const marqueReelle = vehiculePlein.marque.toUpperCase();
  if (
    marqueOCR &&
    marqueOCR !== marqueReelle &&
    !marqueOCR.includes(marqueReelle) &&
    !marqueReelle.includes(marqueOCR)
  ) {
    raisons.push(`Marque OCR "${bonScanne.vehicule_marque}" ≠ réelle "${vehiculePlein.marque}"`);
    scoreBase += 10;
  }

  // --- Quantité carburant ---
  if (bonScanne.litres != null) {
    const ecartLitres = Math.abs(bonScanne.litres - plein.litres);
    if (ecartLitres > seuilEcartLitres) {
      raisons.push(`Litres OCR ${bonScanne.litres}L ≠ déclarés ${plein.litres}L (Δ ${ecartLitres.toFixed(1)}L)`);
      scoreBase += Math.min(25, ecartLitres * 3);
    }
  }

  if (raisons.length === 0) return null;

  const severity = scoreBase >= 90 ? 'high' : scoreBase >= 75 ? 'high' : 'medium';

  return {
    id: `alert_bon_ocr_${plein.id}`,
    vehicule_id: plein.vehicule_id,
    chauffeur_id: plein.chauffeur_id,
    type: 'bon_carburant_suspect',
    titre: 'Bon carburant OCR incohérent',
    description: `Incohérence(s) sur le bon scanné : ${raisons.join(' • ')}`,
    score: Math.min(98, scoreBase),
    severity,
    status: 'new',
    date_detection: new Date(plein.date).toISOString(),
    meta: {
      bon_scanne_id: bonScanne.id,
      raisons_detaillees: raisons,
    },
  };
}

// ──────────────────────────────────────────────────────────────
// Fonctions utilitaires (à garder dans le même fichier ou dans un utils)
// ──────────────────────────────────────────────────────────────

function normalizeImmat(immat: string): string {
  return immat.replace(/[\s\-\.]/g, '').toUpperCase();
}

// Jaro-Winkler simplifié mais très efficace pour les noms courts
function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const lenA = a.length;
  const lenB = b.length;
  const matchWindow = Math.max(0, Math.floor(Math.max(lenA, lenB) / 2) - 1);

  const matchesA = new Array(lenA).fill(false);
  const matchesB = new Array(lenB).fill(false);
  let matches = 0;
  let transpositions = 0;

  // Recherche des correspondances
  for (let i = 0; i < lenA; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, lenB);
    for (let j = start; j < end; j++) {
      if (matchesB[j] || a[i] !== b[j]) continue;
      matchesA[i] = matchesB[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;

  // Comptage des transpositions
  let k = 0;
  for (let i = 0; i < lenA; i++) {
    if (!matchesA[i]) continue;
    while (!matchesB[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  const jaro = (matches / lenA + matches / lenB + (matches - transpositions / 2) / matches) / 3;

  // Bonus préfixe (Winkler)
  let prefix = 0;
  const maxPrefix = Math.min(4, lenA, lenB);
  for (let i = 0; i < maxPrefix; i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }

  return jaro + 0.1 * prefix * (1 - jaro);
}