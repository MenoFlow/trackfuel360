import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NiveauCarburant } from '@/types';
// import { mockNiveauxCarburant } from '@/lib/mockData';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const API_BASE_URL = API_BASE+'/api/niveau-carbu';

export const useNiveauxCarburant = (vehiculeId?: number) => {
  return useQuery({
    queryKey: vehiculeId ? ['niveaux-carburant', vehiculeId] : ['niveaux-carburant'],
    queryFn: async (): Promise<NiveauCarburant[]> => {
      const response = await fetch(`${API_BASE_URL}`);
      if (!response.ok) throw new Error('Erreur lors de la récupération des utilisateurs');
      const data = await response.json();
      return vehiculeId 
        ? data.filter(n => n.vehicule_id === vehiculeId)
        : data;
    },
  });
};

export const useCreateNiveauCarburant = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newNiveau: Omit<NiveauCarburant, 'id'>): Promise<NiveauCarburant> => {
      await delay(500);
      const niveau = { ...newNiveau, id: Date.now() };
      return niveau;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['niveaux-carburant'] });
    },
  });
};

// export const useNiveauxCarburantByTrajet = (trajetId: number) => {
//   return useQuery({
//     queryKey: ['niveaux-carburant', 'trajet', trajetId],
//     queryFn: async (): Promise<NiveauCarburant[]> => {
//       await delay(300);
//       return mockNiveauxCarburant.filter(n => n.trajet_id === trajetId);
//     },
//   });
// };

// export const useNiveauxCarburantByPlein = (pleinId: number) => {
//   return useQuery({
//     queryKey: ['niveaux-carburant', 'plein', pleinId],
//     queryFn: async (): Promise<NiveauCarburant[]> => {
//       await delay(300);
//       return mockNiveauxCarburant.filter(n => n.plein_id === pleinId);
//     },
//   });
// };
