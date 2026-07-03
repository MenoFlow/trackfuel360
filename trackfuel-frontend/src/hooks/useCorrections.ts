import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Correction, CorrectionStatus } from '@/types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const API_BASE_URL = API_BASE+'/api/corrections';

export const useCorrections = (status?: CorrectionStatus) => {
  return useQuery({
    queryKey: status ? ['corrections', status] : ['corrections'],
    queryFn: async (): Promise<Correction[]> => {
      // await delay(300);
      const response = await fetch(`${API_BASE_URL}`);
      if (!response.ok) throw new Error('Erreur lors de la récupération des utilisateurs');
      const data = await response.json();
      return status 
        ? data.filter(c => c.status === status)
        : data;
    },
  });
};

// Format MySQL : YYYY-MM-DD HH:mm:ss
const formatMySQLDate = (date: Date = new Date()): string => {
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

export const useCreateCorrection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      table: 'pleins' | 'trips';
      record_id: number;
      champ: 'litres' | 'odometre' | 'distance_km';
      old_value: string | number;
      new_value: string | number;
      comment?: string;
      requested_by: number;
    }): Promise<Correction> => {
      const payload = {
        ...data,
        old_value: data.old_value,
        new_value: data.new_value,
        comment: data.comment || null,
        requested_at: formatMySQLDate(),
      };

      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Erreur ${response.status}`);
      }

      return response.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corrections'] });
      queryClient.invalidateQueries({ queryKey: ['corrections', 'pending'] });
    },

    onError: (error: Error) => {
      console.error('Erreur création correction:', error);
    },
  });
};

export const useValidateCorrection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      validated_by,
    }: {
      id: number;
      validated_by: number;
    }): Promise<Correction> => {
      const response = await fetch(`${API_BASE_URL}/${id}/validate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          validated_by,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Erreur ${response.status}`);
      }

      return response.json();
    },

    onSuccess: () => {
      // Invalide TOUT : corrections + données sources
      queryClient.invalidateQueries({ queryKey: ['corrections'] });
      queryClient.invalidateQueries({ queryKey: ['corrections', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['pleins'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },

    onError: (error: Error) => {
      console.error('Erreur validation correction:', error);
    },
  });
};

// hooks/useCorrections.ts (ajoute ce hook à côté de useCreateCorrection)

export const useRejectCorrection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      validated_by,
      rejection_reason,
    }: {
      id: number;
      validated_by: number;
      rejection_reason?: string;
    }): Promise<Correction> => {
      const response = await fetch(`${API_BASE_URL}/${id}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          validated_by,
          rejection_reason: rejection_reason?.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Erreur ${response.status}`);
      }

      return response.json();
    },

    onSuccess: () => {
      // Invalide toutes les listes de corrections
      queryClient.invalidateQueries({ queryKey: ['corrections'] });
      queryClient.invalidateQueries({ queryKey: ['corrections', 'pending'] });
    },

    onError: (error: Error) => {
      console.error('Erreur rejet correction:', error);
    },
  });
};