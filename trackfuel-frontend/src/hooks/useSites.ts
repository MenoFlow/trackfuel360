import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Site } from '@/types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const API_BASE_URL = API_BASE+'/api/sites';


export const useSites = () => {
  return useQuery({
    queryKey: ['sites'],
    queryFn: async (): Promise<Site[]> => {
      const response = await fetch(`${API_BASE_URL}`);
      if (!response.ok) throw new Error('Erreur lors de la récupération des sites');
      const data = await response.json();
      return data;
    },
  });
};

// CREATE
export const useCreateSite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newSite: Omit<Site, 'id'>): Promise<Site> => {
      const res = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSite),
      });
      if (!res.ok) throw new Error('Échec création');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sites'] }),
  });
};

// UPDATE
export const useUpdateSite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Site> }): Promise<Site> => {
      const res = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Échec mise à jour');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sites'] }),
  });
};

// DELETE
export const useDeleteSite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const res = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) throw new Error('Échec suppression');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sites'] }),
  });
};