// Service de génération des rapports
import { 
  RapportType, RapportFilters, RapportData, RapportMetadata,
  Vehicule, Trajet, Plein, Alerte, Correction, Site, User,
  NiveauCarburant
} from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { calculerConsommationMoyenne } from './consommationService';

/**
 * Génère un rapport selon le type et les filtres
 */
/**
 * Génère un rapport selon le type et les filtres
 */
export function genererRapport(
  type: RapportType,
  filtres: RapportFilters,
  vehicules: Vehicule[],
  trajets: Trajet[],
  pleins: Plein[],
  // alertes: Alerte[],          // Temporairement désactivé
  corrections: Correction[],
  sites: Site[],
  currentUser: User,
  niveauxCarburant: NiveauCarburant[]
): RapportData {
  const metadata: RapportMetadata = {
    id: `rapport_${Date.now()}`,
    type,
    titre: getTitreRapport(type),
    description: getDescriptionRapport(type),
    date_generation: new Date().toISOString(),
    utilisateur_id: currentUser.id,
    utilisateur_nom: currentUser.nom,
    filtres,
    nb_lignes: 0
  };

  let donnees: any[] = [];
  let statistiques: any = {};

  // Filtrer les données selon les critères
  const trajetsFiltered = filtrerTrajets(trajets, filtres);
  const pleinsFiltered = filtrerPleins(pleins, filtres);
  
  // PARTIE COMMENTÉE : alertes pas encore disponibles
  // const alertesFiltered = filtrerAlertes(alertes, filtres);
  const alertesFiltered: Alerte[] = []; // Mock vide pour éviter les erreurs
  // const correctionsFiltered = filtrerCorrections(corrections, filtres);
  const correctionsFiltered = filtrerCorrections(corrections, filtres);

  switch (type) {
    case 'mensuel_site':
      ({ donnees, statistiques } = genererRapportMensuel(
        vehicules, trajetsFiltered, pleinsFiltered, sites, filtres, niveauxCarburant
      ));
      break;
    
    case 'top_ecarts':
      ({ donnees, statistiques } = genererRapportTopEcarts(
        vehicules, trajetsFiltered, pleinsFiltered, filtres, niveauxCarburant
      ));
      break;
    
    // PARTIE COMMENTÉE : dépend des alertes
    // case 'anomalies':
    //   ({ donnees, statistiques } = genererRapportAnomalies(
    //     alertesFiltered, vehicules, filtres
    //   ));
    //   break;
    
    case 'corrections':
      ({ donnees, statistiques } = genererRapportCorrections(
        correctionsFiltered, vehicules, filtres
      ));
      break;
    
    case 'comparaison':
      ({ donnees, statistiques } = genererRapportComparaison(
        vehicules, trajetsFiltered, pleinsFiltered, sites, filtres
      ));
      break;
    
    case 'kpi_global':
      ({ donnees, statistiques } = genererRapportKPI(
        vehicules, trajetsFiltered, pleinsFiltered, alertesFiltered, correctionsFiltered, filtres
      ));
      break;
  }

  metadata.nb_lignes = donnees.length;

  return { metadata, donnees, statistiques };
}
/**
 * Rapport mensuel par site/véhicule/chauffeur
 */
function genererRapportMensuel(
  vehicules: Vehicule[],
  trajets: Trajet[],
  pleins: Plein[],
  sites: Site[],
  filtres: RapportFilters,
  niveauxCarburant: NiveauCarburant[]
) {
  const donnees = vehicules
    .filter(v => !filtres.vehicule_id || v.id === filtres.vehicule_id)
    .filter(v => !filtres.site_id || v.site_id === filtres.site_id)
    .map(vehicule => {
      const trajetsVehicule = trajets.filter(t => t.vehicule_id === vehicule.id);
      const pleinsVehicule = pleins.filter(p => p.vehicule_id === vehicule.id);
      
      const totalLitres = pleinsVehicule.reduce((sum, p) => sum + Number(p.litres), 0);
      const totalCout = pleinsVehicule.reduce((sum, p) => sum + Number(Number(p.litres) * Number(p.prix_unitaire)), 0);
      const totalDistance = trajetsVehicule.reduce((sum, t) => sum + Number(t.distance_km), 0);
      const nbPleins = pleinsVehicule.length;
      
      const consommationMoyenne = totalDistance > 0 
        ? calculerConsommationMoyenne(vehicule.id, 30, trajets, niveauxCarburant, pleins)
        : 0;
      
      const coutParKm = totalDistance > 0 ? totalCout / totalDistance : 0;
      
      const site = sites.find(s => s.id === vehicule.site_id);

      return {
        immatriculation: vehicule.immatriculation,
        modele: vehicule.modele,
        site: site?.nom || 'N/A',
        nb_trajets: trajetsVehicule.length,
        nb_pleins: nbPleins,
        total_litres: Number(totalLitres.toFixed(1)),
        total_distance_km: Number(totalDistance.toFixed(1)),
        total_cout: Number(totalCout.toFixed(2)),
        consommation_moyenne: Number(consommationMoyenne.toFixed(1)),
        cout_par_km: Number(coutParKm.toFixed(2)),
        ecart_nominal: vehicule.consommation_nominale > 0 
          ? Number(((consommationMoyenne - vehicule.consommation_nominale) / vehicule.consommation_nominale * 100).toFixed(1))
          : 0
      };
    });

  const statistiques = {
    total_vehicules: donnees.length,
    total_litres: donnees.reduce((sum, d) => sum + Number(d.total_litres), 0),
    total_cout: donnees.reduce((sum, d) => sum + Number(d.total_cout), 0),
    total_distance: donnees.reduce((sum, d) => sum + Number(d.total_distance_km), 0),
    consommation_moyenne: donnees.length > 0 
      ? donnees.reduce((sum, d) => sum + Number(d.consommation_moyenne), 0) / donnees.length 
      : 0
  };

  return { donnees, statistiques };
}

/**
 * Rapport des 10 plus gros écarts
 */
function genererRapportTopEcarts(
  vehicules: Vehicule[],
  trajets: Trajet[],
  pleins: Plein[],
  filtres: RapportFilters,
  niveauxCarburant: NiveauCarburant[]
) {
  const donnees = vehicules
    .filter(v => !filtres.vehicule_id || v.id === filtres.vehicule_id)
    .map(vehicule => {
      const consommationMoyenne = calculerConsommationMoyenne(
        vehicule.id, 30, trajets, niveauxCarburant, pleins
      );
      
      const ecartPourcentage = vehicule.consommation_nominale > 0
        ? ((consommationMoyenne - vehicule.consommation_nominale) / vehicule.consommation_nominale) * 100
        : 0;
      
      const ecartAbsolu = consommationMoyenne - vehicule.consommation_nominale;
      
      const trajetsVehicule = trajets.filter(t => t.vehicule_id === vehicule.id);
      const pleinsVehicule = pleins.filter(p => p.vehicule_id === vehicule.id);
      const totalDistance = trajetsVehicule.reduce((sum, t) => sum + Number(t.distance_km), 0);
      const totalLitres = pleinsVehicule.reduce((sum, p) => sum + Number(p.litres), 0);

      return {
        immatriculation: vehicule.immatriculation,
        modele: vehicule.modele,
        consommation_nominale: vehicule.consommation_nominale,
        consommation_reelle: Number(consommationMoyenne.toFixed(1)),
        ecart_absolu: Number(ecartAbsolu.toFixed(1)),
        ecart_pourcentage: Number(ecartPourcentage.toFixed(1)),
        total_distance_km: Number(totalDistance.toFixed(1)),
        total_litres: Number(totalLitres.toFixed(1)),
        impact_financier: Number((ecartAbsolu * totalDistance / 100 * 1.5).toFixed(2)) // estimation
      };
    })
    .filter(d => Math.abs(d.ecart_pourcentage) > 0)
    .sort((a, b) => Math.abs(b.ecart_pourcentage) - Math.abs(a.ecart_pourcentage))
    .slice(0, 10);

  const statistiques = {
    nb_vehicules_analyses: vehicules.length,
    ecart_moyen: donnees.length > 0 
      ? Number((donnees.reduce((sum, d) => sum + Math.abs(d.ecart_pourcentage), 0) / donnees.length).toFixed(1))
      : 0,
    impact_financier_total: Number(donnees.reduce((sum, d) => sum + d.impact_financier, 0).toFixed(2))
  };

  return { donnees, statistiques };
}

/**
 * Rapport des anomalies détectées
 */
// function genererRapportAnomalies(
//   alertes: Alerte[],
//   vehicules: Vehicule[],
//   filtres: RapportFilters
// ) {
//   const donnees = alertes.map(alerte => {
//     const vehicule = vehicules.find(v => v.id === alerte.vehicule_id);
    
//     return {
//       date: format(new Date(alerte.date_detection), 'dd/MM/yyyy HH:mm', { locale: fr }),
//       vehicule: vehicule?.immatriculation || 'N/A',
//       type: alerte.type,
//       description: alerte.description,
//       score: alerte.score,
//       statut: alerte.status,
//       details: alerte.justification || '',
//       date_resolution: alerte.resolved_at 
//         ? format(new Date(alerte.resolved_at), 'dd/MM/yyyy HH:mm', { locale: fr })
//         : 'En cours'
//     };
//   });

//   const statistiques = {
//     nb_anomalies: donnees.length,
//     nb_resolues: alertes.filter(a => a.status === 'resolved').length,
//     nb_en_cours: alertes.filter(a => a.status === 'new' || a.status === 'in_progress').length,
//     score_moyen: donnees.length > 0 
//       ? donnees.reduce((sum, d) => sum + d.score, 0) / donnees.length 
//       : 0,
//     repartition_types: Object.entries(
//       alertes.reduce((acc, a) => {
//         acc[a.type] = (acc[a.type] || 0) + 1;
//         return acc;
//       }, {} as Record<string, number>)
//     ).map(([type, count]) => ({ type, count }))
//   };

//   return { donnees, statistiques };
// }

/**
 * Rapport des corrections validées/rejetées
 */
function genererRapportCorrections(
  corrections: Correction[],
  vehicules: Vehicule[],
  filtres: RapportFilters
) {
  const donnees = corrections.map(correction => {
    // Extract vehicule_id from record_id if table is 'plein' or 'trajet'
    const vehiculeId = correction.table === 'vehicule' 
      ? correction.record_id 
      : vehicules.find(v => v.id)?.id || 'N/A';
    const vehicule = vehicules.find(v => v.id === vehiculeId);
    
    return {
      date_proposition: format(new Date(correction.requested_at), 'dd/MM/yyyy HH:mm', { locale: fr }),
      vehicule: vehicule?.immatriculation || 'N/A',
      champ: correction.champ,
      valeur_originale: correction.old_value,
      valeur_proposee: correction.new_value,
      justification: correction.comment || '',
      statut: correction.status,
      propose_par: correction.requested_by,
      valide_par: correction.validated_by || 'N/A',
      date_validation: correction.validated_at 
        ? format(new Date(correction.validated_at), 'dd/MM/yyyy HH:mm', { locale: fr })
        : 'N/A'
    };
  });

  const statistiques = {
    nb_corrections: donnees.length,
    nb_validees: corrections.filter(c => c.status === 'validated').length,
    nb_rejetees: corrections.filter(c => c.status === 'rejected').length,
    nb_en_attente: corrections.filter(c => c.status === 'pending').length,
    taux_validation: corrections.length > 0 
      ? (corrections.filter(c => c.status === 'validated').length / corrections.length * 100).toFixed(1)
      : 0
  };

  return { donnees, statistiques };
}

/**
 * Rapport de comparaison inter-sites/véhicules
 */
function genererRapportComparaison(
  vehicules: Vehicule[],
  trajets: Trajet[],
  pleins: Plein[],
  sites: Site[],
  filtres: RapportFilters
) {
  const donnees = sites.map(site => {
    const vehiculesSite = vehicules.filter(v => v.site_id === site.id);
    const trajetsSite = trajets.filter(t => 
      vehiculesSite.some(v => v.id === t.vehicule_id)
    );
    const pleinsSite = pleins.filter(p => 
      vehiculesSite.some(v => v.id === p.vehicule_id)
    );
    
    const totalLitres = pleinsSite.reduce((sum, p) => sum + p.litres, 0);
    const totalCout = pleinsSite.reduce((sum, p) => sum + (p.litres * p.prix_unitaire), 0);
    const totalDistance = trajetsSite.reduce((sum, t) => sum + t.distance_km, 0);
    
    const consommationMoyenne = totalDistance > 0 
      ? (totalLitres / totalDistance) * 100 
      : 0;

    return {
      site: site.nom,
      ville: site.ville,
      nb_vehicules: vehiculesSite.length,
      nb_trajets: trajetsSite.length,
      total_litres: Number(totalLitres.toFixed(1)),
      total_distance_km: Number(totalDistance.toFixed(1)),
      total_cout: Number(totalCout.toFixed(2)),
      consommation_moyenne: Number(consommationMoyenne.toFixed(1)),
      cout_par_km: totalDistance > 0 ? Number((totalCout / totalDistance).toFixed(2)) : 0
    };
  });

  const statistiques = {
    nb_sites: donnees.length,
    meilleur_site_conso: donnees.length > 0 
      ? donnees.reduce((min, d) => d.consommation_moyenne < min.consommation_moyenne ? d : min).site
      : 'N/A',
    meilleur_site_cout: donnees.length > 0 
      ? donnees.reduce((min, d) => d.cout_par_km < min.cout_par_km ? d : min).site
      : 'N/A'
  };

  return { donnees, statistiques };
}

/**
 * Rapport de KPI globaux
 */
/**
 * Rapport de KPI globaux
 */
function genererRapportKPI(
  vehicules: Vehicule[],
  trajets: Trajet[],
  pleins: Plein[],
  alertes: Alerte[], // peut être vide
  corrections: Correction[],
  filtres: RapportFilters
) {
  const totalLitres = pleins.reduce((sum, p) => sum + p.litres, 0);
  const totalCout = pleins.reduce((sum, p) => sum + (p.litres * p.prix_unitaire), 0);
  const totalDistance = trajets.reduce((sum, t) => sum + t.distance_km, 0);
  
  const consommationMoyenne = totalDistance > 0 ? (totalLitres / totalDistance) * 100 : 0;
  const coutParKm = totalDistance > 0 ? totalCout / totalDistance : 0;
  
  // OK même si alertes = []
  const nbAnomalies = alertes.length;
  const nbAnomaliesResolues = alertes.filter(a => a.status === 'resolved').length;
  const tauxResolution = nbAnomalies > 0 ? (nbAnomaliesResolues / nbAnomalies * 100) : 0;
  
  const nbCorrections = corrections.length;
  const nbCorrectionsValidees = corrections.filter(c => c.status === 'validated').length;
  const tauxValidation = nbCorrections > 0 ? (nbCorrectionsValidees / nbCorrections * 100) : 0;

  const donnees = [{
    periode: filtres.date_debut && filtres.date_fin 
      ? `${format(new Date(filtres.date_debut), 'dd/MM/yyyy', { locale: fr })} - ${format(new Date(filtres.date_fin), 'dd/MM/yyyy', { locale: fr })}`
      : 'Toutes périodes',
    total_vehicules: vehicules.length,
    vehicules_actifs: vehicules.filter(v => v.actif).length,
    total_trajets: trajets.length,
    total_pleins: pleins.length,
    total_litres: Number(totalLitres.toFixed(1)),
    total_distance_km: Number(totalDistance.toFixed(1)),
    total_cout: Number(totalCout.toFixed(2)),
    consommation_moyenne: Number(consommationMoyenne.toFixed(1)),
    cout_par_km: Number(coutParKm.toFixed(2)),
    nb_anomalies: nbAnomalies,
    taux_resolution_anomalies: Number(tauxResolution.toFixed(1)),
    nb_corrections: nbCorrections,
    taux_validation_corrections: Number(tauxValidation.toFixed(1))
  }];

  const statistiques = donnees[0];
  return { donnees, statistiques };
}
// Fonctions utilitaires de filtrage
function filtrerTrajets(trajets: Trajet[], filtres: RapportFilters): Trajet[] {
  return trajets.filter(t => {
    if (filtres.date_debut && new Date(t.date_debut) < new Date(filtres.date_debut)) return false;
    if (filtres.date_fin && new Date(t.date_fin) > new Date(filtres.date_fin)) return false;
    if (filtres.vehicule_id && t.vehicule_id !== filtres.vehicule_id) return false;
    if (filtres.chauffeur_id && t.chauffeur_id !== filtres.chauffeur_id) return false;
    return true;
  });
}

function filtrerPleins(pleins: Plein[], filtres: RapportFilters): Plein[] {
  return pleins.filter(p => {
    if (filtres.date_debut && new Date(p.date) < new Date(filtres.date_debut)) return false;
    if (filtres.date_fin && new Date(p.date) > new Date(filtres.date_fin)) return false;
    if (filtres.vehicule_id && p.vehicule_id !== filtres.vehicule_id) return false;
    if (filtres.type_saisie && p.type_saisie !== filtres.type_saisie) return false;
    return true;
  });
}

// function filtrerAlertes(alertes: Alerte[], filtres: RapportFilters): Alerte[] {
//   return alertes.filter(a => {
//     if (filtres.date_debut && new Date(a.date_detection) < new Date(filtres.date_debut)) return false;
//     if (filtres.date_fin && new Date(a.date_detection) > new Date(filtres.date_fin)) return false;
//     if (filtres.vehicule_id && a.vehicule_id !== filtres.vehicule_id) return false;
//     if (filtres.type_anomalie && a.type !== filtres.type_anomalie) return false;
//     if (filtres.score_minimum && a.score < filtres.score_minimum) return false;
//     return true;
//   });
// }

function filtrerCorrections(corrections: Correction[], filtres: RapportFilters): Correction[] {
  return corrections.filter(c => {
    if (filtres.date_debut && new Date(c.requested_at) < new Date(filtres.date_debut)) return false;
    if (filtres.date_fin && new Date(c.requested_at) > new Date(filtres.date_fin)) return false;
    if (filtres.statut_correction && c.status !== filtres.statut_correction) return false;
    return true;
  });
}

function getTitreRapport(type: RapportType): string {
  const titres: Record<RapportType, string> = {
    'mensuel_site': 'Rapport mensuel par site/véhicule',
    'top_ecarts': 'Top 10 des écarts de consommation',
    'anomalies': 'Rapport des anomalies détectées',
    'corrections': 'Rapport des corrections',
    'comparaison': 'Comparaison inter-sites',
    'kpi_global': 'Indicateurs de performance globaux'
  };
  return titres[type];
}

function getDescriptionRapport(type: RapportType): string {
  const descriptions: Record<RapportType, string> = {
    'mensuel_site': 'Synthèse de la consommation, des coûts et des trajets par site et véhicule',
    'top_ecarts': 'Classement des véhicules avec les plus gros écarts par rapport à la consommation nominale',
    'anomalies': 'Liste complète des anomalies détectées avec leur statut et score',
    'corrections': 'Historique des corrections proposées, validées et rejetées',
    'comparaison': 'Analyse comparative des performances entre les différents sites',
    'kpi_global': 'Vue d\'ensemble des indicateurs clés de performance de la flotte'
  };
  return descriptions[type];
}
