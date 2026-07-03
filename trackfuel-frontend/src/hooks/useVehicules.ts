import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Vehicule } from '@/types';
// import { mockVehicules } from '@/lib/mockData';

// Simulation d'API avec délai
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// API Configuration
const API_BASE = import.meta.env.VITE_API_BASE_URL as string;
const API_BASE_URL = API_BASE+'/api/vehicules';

/**
 * Hook: useVehicules
 * API Endpoint: GET /api/vehicules
 * Description: Récupère la liste de tous les véhicules
 * Params: Aucun
 * Response: Vehicule[]
 */
export const useVehicules = () => {
  return useQuery({
    queryKey: ['vehicules'],
    queryFn: async (): Promise<Vehicule[]> => {
      // TODO: Remplacer par un vrai appel API
      const response = await fetch(`${API_BASE_URL}`);
      if (!response.ok) throw new Error('Erreur lors de la récupération des véhicules');
      return response.json();
      
      // await delay(300);
      // return mockVehicules;
    },
  });
};

/**
 * Hook: useVehicule
 * API Endpoint: GET /api/vehicules/:id
 * Description: Récupère un véhicule spécifique par son ID
 * Params: id (string)
 * Response: Vehicule | undefined
 */
export const useVehicule = (id: number) => {
  return useQuery({
    queryKey: ['vehicules', id],
    queryFn: async (): Promise<Vehicule | undefined> => {
      // TODO: Remplacer par un vrai appel API
      const response = await fetch(`${API_BASE_URL}/${id}`);
      if (!response.ok) throw new Error('Véhicule non trouvé');
      const data = await response.json();
      return data;
    },
    enabled: !!id,
  });
};  

/**
 * Hook: useCreateVehicule
 * API Endpoint: POST /api/vehicules
 * Description: Crée un nouveau véhicule
 * Body: Omit<Vehicule, 'id'>
 * Response: Vehicule
 */
export const useCreateVehicule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newVehicule: Omit<Vehicule, 'id'>): Promise<Vehicule> => {
      console.log(newVehicule);

      // TODO: Remplacer par un vrai appel API
      const response = await fetch(`${API_BASE_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVehicule),
      });
      if (!response.ok) throw new Error('Erreur lors de la création du véhicule');
      return response.json();
      
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicules'] });
    },
  });
};

/**
 * Hook: useUpdateVehicule
 * API Endpoint: PUT /api/vehicules/:id
 * Description: Met à jour un véhicule existant
 * Params: id (string)
 * Body: Partial<Vehicule>
 * Response: Vehicule
 */
export const useUpdateVehicule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Vehicule> }): Promise<Vehicule> => {
      // TODO: Remplacer par un vrai appel API
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Erreur lors de la mise à jour du véhicule');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicules'] });
    },
  });
};

/**
 * Hook: useDeleteVehicule
 * API Endpoint: DELETE /api/vehicules/:id
 * Description: Supprime un véhicule existant
 * Params: id (string)
 * Response: void
 */
export const useDeleteVehicule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      // TODO: Remplacer par un vrai appel API
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Erreur lors de la suppression du véhicule');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicules'] });
    },
  });
};
