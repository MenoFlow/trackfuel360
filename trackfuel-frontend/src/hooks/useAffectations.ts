import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Affectation } from '@/types';

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const API_BASE_URL = API_BASE+'/api/affectations';

// GET ALL + FILTER
export const useAffectations = (chauffeurId?: number, vehiculeId?: number) => {
  return useQuery({
    queryKey: chauffeurId
      ? ['affectations', 'chauffeur', chauffeurId]
      : vehiculeId
      ? ['affectations', 'vehicule', vehiculeId]
      : ['affectations'],
    queryFn: async (): Promise<Affectation[]> => {
      const res = await fetch(API_BASE_URL);
      if (!res.ok) throw new Error('Erreur réseau');
      const data: Affectation[] = await res.json();

      if (chauffeurId) return data.filter(a => a.chauffeur_id === chauffeurId);
      if (vehiculeId) return data.filter(a => a.vehicule_id === vehiculeId);
      return data;
    },
  });
};

// GET ONE
export const useAffectation = (id: number) => {
  return useQuery({
    queryKey: ['affectations', id],
    queryFn: async (): Promise<Affectation> => {
      const res = await fetch(`${API_BASE_URL}/${id}`);
      if (!res.ok) throw new Error('Affectation non trouvée');
      return res.json();
    },
    enabled: !!id,
  });
};

// CREATE
export const useCreateAffectation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newAffectation: Omit<Affectation, 'id'>): Promise<Affectation> => {
      const res = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAffectation),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur serveur' }));
        throw new Error(err.error || 'Échec création');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affectations'] });
    },
  });
};

// UPDATE
export const useUpdateAffectation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Affectation> }): Promise<Affectation> => {
      const res = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur serveur' }));
        throw new Error(err.error || 'Échec mise à jour');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affectations'] });
    },
  });
};

// DELETE
export const useDeleteAffectation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const res = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 404) {
        const err = await res.json().catch(() => ({ error: 'Erreur serveur' }));
        throw new Error(err.error || 'Échec suppression');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affectations'] });
    },
  });
};