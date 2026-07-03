import { Geofence, GeofenceType } from '@/types';
// import { mockGeofences } from '@/lib/mockData';

/**
 * ============================================
 * API GEOFENCES - FONCTIONS MOCKÉES
 * ============================================
 * 
 * Ce fichier contient toutes les fonctions d'API pour la gestion des geofences.
 * Actuellement mockées avec localStorage, prêtes pour l'intégration backend.
 * 
 * BACKEND ATTENDU:
 * - Base de données: MySQL
 * - Schéma table `geofences`:
 *   CREATE TABLE geofences (
 *     id VARCHAR(36) PRIMARY KEY,
 *     nom VARCHAR(255) NOT NULL,
 *     type ENUM('depot', 'station', 'zone_risque') NOT NULL,
 *     lat DECIMAL(10, 8) NOT NULL,
 *     lon DECIMAL(11, 8) NOT NULL,
 *     rayon_metres INT NOT NULL,
 *     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
 *   );
 */

const STORAGE_KEY = 'geofences_data';
const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const API_BASE_URL = API_BASE+'/api/geofences';


/**
 * Récupère toutes les geofences depuis le localStorage (mock)
 * 
 * BACKEND RÉEL:
 * - Method: GET
 * - URL: /api/geofences
 * - Response: { data: Geofence[], total: number }
 * - SQL: SELECT * FROM geofences ORDER BY created_at DESC
 */
export async function fetchGeofences(): Promise<Geofence[]> {
  // Simulation d'un délai réseau
  
  try {
    // const stored = localStorage.getItem(STORAGE_KEY);
    // if (stored) {
    //   return JSON.parse(stored);
    // }
    // console.log(stored);

    const response = await fetch(`${API_BASE_URL}`);
    if (!response.ok) throw new Error('Erreur lors de la récupération des utilisateurs');
    const data = await response.json();
    // const data = mockGeofences;
    // console.log(mockGeofences);
    
    // Initialiser avec les données mockées si aucune donnée n'existe
    // localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error('Erreur lors du chargement des geofences:', error);
    return [];
  }
}

/**
 * Crée une nouvelle geofence
 * 
 * BACKEND RÉEL:
 * - Method: POST
 * - URL: /api/geofences
 * - Body: { nom: string, type: GeofenceType, lat: number, lon: number, rayon_metres: number }
 * - Response: { data: Geofence, message: string }
 * - SQL: INSERT INTO geofences (id, nom, type, lat, lon, rayon_metres) VALUES (?, ?, ?, ?, ?, ?)
 */

export async function createGeofence(geofence: Omit<Geofence, 'id'>): Promise<Geofence> {
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geofence),
    });

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data as Geofence;
  } catch (error) {
    console.error('Erreur lors de la création de la geofence:', error);
    throw error;
  }
}

/**
 * Met à jour une geofence existante
 * 
 * BACKEND RÉEL:
 * - Method: PUT
 * - URL: /api/geofences/:id
 * - Params: { id: string }
 * - Body: Partial<{ nom: string, type: GeofenceType, lat: number, lon: number, rayon_metres: number }>
 * - Response: { data: Geofence, message: string }
 * - SQL: UPDATE geofences SET nom = ?, type = ?, lat = ?, lon = ?, rayon_metres = ? WHERE id = ?
 */

export async function updateGeofence(id: number, updates: Partial<Geofence>): Promise<Geofence> {
  try {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data as Geofence;
  } catch (error) {
    console.error(`Erreur lors de la mise à jour de la geofence ${id}:`, error);
    throw error;
  }
}

/**
 * Supprime une geofence
 * 
 * BACKEND RÉEL:
 * - Method: DELETE
 * - URL: /api/geofences/:id
 * - Params: { id: string }
 * - Response: { success: boolean, message: string }
 * - SQL: DELETE FROM geofences WHERE id = ?
 */

export async function deleteGeofence(id: number): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Erreur lors de la suppression de la geofence ${id}:`, error);
    throw error;
  }
}
