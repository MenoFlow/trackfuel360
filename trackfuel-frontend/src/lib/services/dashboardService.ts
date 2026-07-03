// Service de calcul des statistiques du dashboard
import {
  Vehicule,
  Trajet,
  Plein,
  NiveauCarburant,
  Alerte,
  DashboardStats,
} from "@/types";
import { getStartOfCurrentMonth } from "@/lib/utils/dateUtils";
import { calculerStatistiquesConsommation } from "./consommationService";

/**
 * Calcule les statistiques du dashboard de manière dynamique
 */
export function calculerDashboardStats(
  vehicules: Vehicule[],
  trajets: Trajet[],
  pleins: Plein[],
  niveauxCarburant: NiveauCarburant[],
  alertes: Alerte[]
): DashboardStats {
  const debutMois = getStartOfCurrentMonth();

  // Trajets et pleins du mois en cours
  const trajetsMois = trajets.filter(
    (t) => new Date(t.date_debut) >= debutMois
  );
  const pleinsMois = pleins.filter((p) => new Date(p.date) >= debutMois);

  // Stats de base
  const total_vehicules = vehicules.length;
  const vehicules_actifs = vehicules.filter((v) => v.actif).length;
  const alertes_actives = alertes.filter((a) => a.status === "new").length;

  // Calculs carburant et distance
  const litres_mois = pleinsMois.reduce((sum, p) => sum + Number(p.litres), 0);
  const cout_carburant_mois = pleinsMois.reduce(
    (sum, p) => sum + Number(Number(p.litres) * Number(p.prix_unitaire)),
    0
  );
  const distance_mois_km = trajetsMois.reduce(
    (sum, t) => sum + Number(t.distance_km),
    0
  );

  // Consommation moyenne de la flotte pour le mois
  let totalCarburantFlotte = 0;
  let totalDistanceFlotte = 0;

  vehicules
    .filter((v) => v.actif)
    .forEach((vehicule) => {
      const trajetsVehicule = trajetsMois.filter(
        (t) => t.vehicule_id === vehicule.id
      );

      trajetsVehicule.forEach((trajet) => {
        const niveauAvant = niveauxCarburant.find(
          (n) =>
            Number(n.trajet_id) === Number(trajet.id) &&
            n.type === "avant_trajet"
        );
        const niveauApres = niveauxCarburant.find(
          (n) =>
            Number(n.trajet_id) === Number(trajet.id) &&
            n.type === "apres_trajet"
        );
        if (niveauAvant && niveauApres) {
          const carburantConsomme = niveauAvant.niveau - niveauApres.niveau;
          const pleinsTrajet = pleins.filter(
            (p) =>
              p.vehicule_id === vehicule.id &&
              new Date(p.date) >= new Date(trajet.date_debut) &&
              new Date(p.date) <= new Date(trajet.date_fin)
          );
          const totalPleinsTrajet = pleinsTrajet.reduce(
            (sum, p) => sum + Number(p.litres),
            0
          );

          totalCarburantFlotte += carburantConsomme + totalPleinsTrajet;
          totalDistanceFlotte += Number(trajet.distance_km);
        }
      });
    });

  const consommation_moyenne_flotte =
    totalDistanceFlotte > 0
      ? Number(((totalCarburantFlotte / totalDistanceFlotte) * 100).toFixed(1))
      : 0;

  // Top véhicules à forte consommation (sur 30 jours)
  const vehiculesConsommation = calculerStatistiquesConsommation(
    vehicules,
    trajets,
    niveauxCarburant,
    pleins,
    30
  ).slice(0, 3);

  return {
    total_vehicules,
    vehicules_actifs,
    alertes_actives,
    cout_carburant_mois: Number(cout_carburant_mois.toFixed(2)),
    litres_mois: Number(Number(litres_mois)?.toFixed(1)),
    distance_mois_km: Number(distance_mois_km.toFixed(1)),
    consommation_moyenne_flotte,
    top_vehicules_consommation: vehiculesConsommation,
  };
}
