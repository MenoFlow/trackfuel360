import { createContext, useContext, useState, ReactNode } from "react";

export type Language = "fr" | "en";

interface Translations {
  [key: string]: {
    fr: string;
    en: string;
  };
}

export const translations: Translations = {
  // Navbar
  "nav.title": {
    fr: "Paramètres de détection",
    en: "Detection Settings"
  },
  "nav.language": {
    fr: "Langue",
    en: "Language"
  },
  
  // Page title and description
  "page.title": {
    fr: "Paramètres de détection",
    en: "Detection Settings"
  },
  "page.description": {
    fr: "Configurez les seuils et critères de détection pour l'analyse des véhicules",
    en: "Configure detection thresholds and criteria for vehicle analysis"
  },
  
  // Buttons
  "button.save": {
    fr: "Enregistrer les modifications",
    en: "Save changes"
  },
  "button.saving": {
    fr: "Enregistrement...",
    en: "Saving..."
  },
  "button.reset": {
    fr: "Réinitialiser aux valeurs par défaut",
    en: "Reset to default values"
  },
  "button.resetting": {
    fr: "Réinitialisation...",
    en: "Resetting..."
  },
  
  // Toasts
  "toast.saveSuccess": {
    fr: "Paramètres enregistrés avec succès",
    en: "Settings saved successfully"
  },
  "toast.saveError": {
    fr: "Erreur lors de l'enregistrement",
    en: "Error saving settings"
  },
  "toast.resetSuccess": {
    fr: "Paramètres réinitialisés",
    en: "Settings reset"
  },
  "toast.resetError": {
    fr: "Erreur lors de la réinitialisation",
    en: "Error resetting settings"
  },
  
  // Parameters
  "param.seuil_surconsommation_pct.label": {
    fr: "Seuil de surconsommation",
    en: "Overconsumption Threshold"
  },
  "param.seuil_surconsommation_pct.description": {
    fr: "Pourcentage au-dessus de la consommation nominale",
    en: "Percentage above nominal consumption"
  },
  "param.seuil_ecart_gps_pct.label": {
    fr: "Écart GPS / Odomètre",
    en: "GPS / Odometer Deviation"
  },
  "param.seuil_ecart_gps_pct.description": {
    fr: "Écart maximal entre GPS et odomètre",
    en: "Maximum deviation between GPS and odometer"
  },
  "param.seuil_carburant_disparu_litres.label": {
    fr: "Carburant disparu",
    en: "Missing Fuel"
  },
  "param.seuil_carburant_disparu_litres.description": {
    fr: "Seuil minimal de carburant disparu",
    en: "Minimum missing fuel threshold"
  },
  "param.seuil_exif_heures.label": {
    fr: "Écart EXIF temporel",
    en: "EXIF Time Deviation"
  },
  "param.seuil_exif_heures.description": {
    fr: "Écart maximal entre heure EXIF et heure réelle",
    en: "Maximum deviation between EXIF time and real time"
  },
  "param.seuil_exif_distance_km.label": {
    fr: "Écart EXIF spatial",
    en: "EXIF Location Deviation"
  },
  "param.seuil_exif_distance_km.description": {
    fr: "Écart maximal entre position EXIF et position réelle",
    en: "Maximum deviation between EXIF and real location"
  },
  "param.seuil_immobilisation_heures.label": {
    fr: "Durée d'immobilisation",
    en: "Immobilization Duration"
  },
  "param.seuil_immobilisation_heures.description": {
    fr: "Durée d'immobilisation hors dépôt",
    en: "Immobilization duration outside depot"
  },
  "param.periode_consommation_jours.label": {
    fr: "Période d'analyse",
    en: "Analysis Period"
  },
  "param.periode_consommation_jours.description": {
    fr: "Période d'analyse de la consommation moyenne",
    en: "Average consumption analysis period"
  },
  
  // Units
  "unit.percent": {
    fr: "%",
    en: "%"
  },
  "unit.liters": {
    fr: "L",
    en: "L"
  },
  "unit.hours": {
    fr: "h",
    en: "h"
  },
  "unit.kilometers": {
    fr: "km",
    en: "km"
  },
  "unit.days": {
    fr: "j",
    en: "d"
  },
  
  // Accessibility
  "a11y.minMax": {
    fr: "Minimum : {min} — Maximum : {max}",
    en: "Minimum: {min} — Maximum: {max}"
  },
  "a11y.loading": {
    fr: "Chargement des paramètres...",
    en: "Loading settings..."
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("fr");

  const t = (key: string, params?: Record<string, string | number>): string => {
    const translation = translations[key]?.[language] || key;
    
    if (!params) return translation;
    
    return Object.entries(params).reduce((acc, [paramKey, paramValue]) => {
      return acc.replace(`{${paramKey}}`, String(paramValue));
    }, translation);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
};
