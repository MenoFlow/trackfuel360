import { Parametre, parametresData } from "@/lib/data/mockData.parametres";

// Simule un délai réseau pour les tests
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// URL de base de l'API - À configurer selon l'environnement
const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const API_BASE_URL = API_BASE+'/api/parametres';
//import.meta.env.VITE_API_URL || 

/**
 * Récupère tous les paramètres
 * 
 * FUTURE API CALL:
 * GET /api/params
 * Response: { data: Parametre[] }
 */
export const fetchParametres = async (): Promise<Parametre[]> => {
  // MOCK DATA - Remplacer par l'appel API réel
  // await delay(500);
  // console.log(parametresData);
  // return parametresData;

  /* BACKEND INTEGRATION - Décommenter pour utiliser le vrai backend:
  */
  
  try {
    const response = await fetch(`${API_BASE_URL}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Ajouter token d'authentification si nécessaire:
        // 'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres:', error);
    throw error;
  }
};

/**
 * Met à jour un paramètre individuel
 * 
 * FUTURE API CALL:
 * PUT /api/params/:id
 * Body: { valeur: number }
 * Response: { data: Parametre, message: string }
 */
export const updateParametre = async (id: string, valeur: number): Promise<Parametre> => {
  // MOCK DATA - Remplacer par l'appel API réel
  await delay(500);
  
  // Simulation de la mise à jour d'un seul paramètre
  const param = parametresData.find(p => p.id === id);
  if (!param) {
    throw new Error(`Paramètre ${id} introuvable`);
  }
  
  return { ...param, valeur };

  /* BACKEND INTEGRATION - Décommenter pour utiliser le vrai backend:
  
  try {
    const response = await fetch(`${API_BASE_URL}/params/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // Ajouter token d'authentification si nécessaire:
        // 'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ valeur }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du paramètre:', error);
    throw error;
  }
  */
};

/**
 * Sauvegarde tous les paramètres modifiés (mise à jour en masse)
 * 
 * FUTURE API CALL:
 * PUT /api/params
 * Body: { parametres: Parametre[] }
 * Response: { data: Parametre[], message: string }
 */
// parametresApi.ts
export const saveParametres = async (parametres: Parametre[]) => {
  const response = await fetch(API_BASE+'/api/parametres', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parametres }), // ENVOIE { parametres: [...] }
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Erreur serveur');
  }

  return response.json();
};

/**
 * Réinitialise les paramètres aux valeurs par défaut
 * 
 * FUTURE API CALL:
 * POST /api/params/reset
 * Response: { data: Parametre[], message: string }
 */
export const resetParametres = async (): Promise<Parametre[]> => {
  // MOCK DATA - Remplacer par l'appel API réel
  // await delay(500);
  // console.log(parametresData);
  // return parametresData;

  /* BACKEND INTEGRATION - Décommenter pour utiliser le vrai backend: */
  
  try {
    const response = await fetch(`${API_BASE_URL}/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Ajouter token d'authentification si nécessaire:
        // 'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    return result;
  } catch (error) {
    console.error('Erreur lors de la réinitialisation des paramètres:', error);
    throw error;
  }
};
