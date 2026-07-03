export interface Parametre {
  id: string;
  label?: string;
  description?: string;
  valeur: number;
  unite?: string;
  min?: number;
  max?: number;
}


export const parametresData: Parametre[] = [
  {
    id: "seuil_surconsommation_pct",
    label: "Seuil de surconsommation",
    description: "Pourcentage au-dessus de la consommation nominale",
    valeur: 30,
    unite: "%",
    min: 0,
    max: 100,
  },
  {
    id: "seuil_ecart_gps_pct",
    label: "Écart GPS vs odomètre",
    description: "Écart maximal entre GPS et odomètre",
    valeur: 20,
    unite: "%",
    min: 0,
    max: 100,
  },
  {
    id: "seuil_carburant_disparu_litres",
    label: "Carburant disparu",
    description: "Seuil minimal de carburant manquant",
    valeur: 5,
    unite: "L",
    min: 0,
    max: 1000,
  },
  {
    id: "seuil_exif_heures",
    label: "Écart EXIF temporel",
    description: "Écart maximal entre heure EXIF et heure réelle",
    valeur: 2,
    unite: "h",
    min: 0,
    max: 48,
  },
  {
    id: "seuil_exif_distance_km",
    label: "Écart EXIF géographique",
    description: "Écart maximal entre position EXIF et position réelle",
    valeur: 1,
    unite: "km",
    min: 0,
    max: 100,
  },
  {
    id: "seuil_immobilisation_heures",
    label: "Durée d'immobilisation",
    description: "Temps d'immobilisation hors dépôt déclenchant une alerte",
    valeur: 12,
    unite: "h",
    min: 0,
    max: 168,
  },
  {
    id: "periode_consommation_jours",
    label: "Période d'analyse",
    description: "Durée d'analyse de la consommation moyenne",
    valeur: 7,
    unite: "jours",
    min: 1,
    max: 365,
  },
];
