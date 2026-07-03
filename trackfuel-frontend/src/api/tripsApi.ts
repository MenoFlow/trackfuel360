/**
 * API functions for Trip management
 * Currently mocked, will be replaced with real API calls to backend
 * 
 * Future endpoints:
 * - GET /api/trips?vehicule_id={vehiculeId}
 * - POST /api/trips
 * - PUT /api/trips/:id
 * - DELETE /api/trips/:id
 */

 
// import { consolidateTripsWithTraceGps } from "@/lib/mockData";
import { Trip, TripInput } from "@/types/trip";
const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

// Mock data
// const MOCK_TRIPS: Trip[] = consolidateTripsWithTraceGps();

// Simulate network latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch all trips for a specific vehicle
 * Future: GET /api/trips?vehicule_id={vehiculeId}
 */
export async function fetchTrips(vehiculeId: number): Promise<Trip[]> {
  await delay(500); // Simulate network latency
  
  // TODO: Replace with real API call
  const response = await fetch(API_BASE+"/api/trajets");
  if (!response.ok) throw new Error('Failed to fetch trips');
  const data = await response.json();
  // console.log(data);

  // console.log(vehiculeId);

  // console.log(data.filter(d => (vehiculeId).toString() === (d.vehicule_id).toString()));
  return data.filter(d => String(vehiculeId) === String(d.vehicule_id));
  
  // return MOCK_TRIPS.filter(trip => trip.vehicule_id === vehiculeId);
}

export async function createTrip(data: TripInput): Promise<Trip> {
  await delay(800); // Simulate network latency

  const response = await fetch(API_BASE + '/api/trajets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

// Si la requête échoue
if (!response.ok) {
  let errorMsg = 'Échec de la création du trajet';

  try {
    const err = await response.json();

    // On récupère le champ "error" si présent
    if (err?.error) {
      errorMsg = err.error;
    }

    // On ajoute les détails si disponibles
    if (err?.details) {
      if (typeof err.details === 'string') {
        // Cas simple : details est une chaîne
        errorMsg += ` — ${err.details}`;
      } else if (typeof err.details === 'object') {
        // Cas avancé : details est un objet avec des clés/valeurs
        const detailsStr = Object.entries(err.details)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        errorMsg += ` — ${detailsStr}`;
      }
    }
  } catch (parseError) {
    // Si le JSON n’est pas parsable, on garde le message par défaut
    console.warn("Impossible de parser la réponse d'erreur:", parseError);
  }

  throw new Error(errorMsg);
}


  return response.json();
}


/**
 * Update an existing trip
 * Future: PUT /api/trips/:id
 */
export async function updateTrip(id: number, data: TripInput): Promise<Trip> {
  await delay(800); // Simulate network latency
  
  // TODO: Replace with real API call
  const response = await fetch(`${API_BASE}/api/trajets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update trip');
  return response.json();
}

/**
 * Delete a trip
 * Future: DELETE /api/trips/:id
 */
export async function deleteTrip(id: number): Promise<void> {
  await delay(500); // Simulate network latency
  
  // TODO: Replace with real API call
  const response = await fetch(`${API_BASE}/api/trajets/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete trip');
}
