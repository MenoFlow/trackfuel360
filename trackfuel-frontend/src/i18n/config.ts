import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import fr from './locales/fr.json';
import en from './locales/en.json';
import es from './locales/es.json';
import mg from './locales/mg.json';

const resources = {
  fr: { translation: fr },
  en: { translation: en },
  es: { translation: es },
  mg: { translation: mg },
};

i18n
  .use(LanguageDetector) // Détection automatique de la langue
  .use(initReactI18next) // Initialisation de react-i18next
  .init({
    resources,
    fallbackLng: 'fr', // Langue par défaut
    supportedLngs: ['fr', 'en', 'es', 'mg'], // Langues supportées
    debug: false, // Mettre à true pour déboguer
    
    interpolation: {
      escapeValue: false, // React échappe déjà les valeurs
    },
    
    detection: {
      // Ordre de détection de la langue
      order: ['localStorage', 'navigator', 'htmlTag'],
      // Clé de stockage dans localStorage
      lookupLocalStorage: 'i18nextLng',
      // Cache la langue détectée
      caches: ['localStorage'],
    },
  });

export default i18n;
