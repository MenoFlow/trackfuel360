import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plein } from '@/types';
import { OfflineService } from '@/lib/services/offlineService';
import { useOnlineStatus } from './useOnlineStatus';

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const API_BASE_URL = API_BASE+'/api/pleins';

export const usePleins = (vehiculeId?: number) => {
  // const isOnline = useOnlineStatus();

  return useQuery({
    queryKey: vehiculeId ? ['pleins', vehiculeId] : ['pleins'],
    queryFn: async (): Promise<Plein[]> => {
      // Combiner les données du backend (mockées) avec les données locales
      const response = await fetch(`${API_BASE_URL}`);
      if (!response.ok) throw new Error('Erreur lors de la récupération des utilisateurs');

      const data = await response.json();
      const serverPleins = vehiculeId 
        ? data.filter(p => p.vehicule_id === vehiculeId)
        : data;
      
      // Ajouter les pleins stockés localement (hors-ligne)
      const offlinePleins = OfflineService.getPleinsOffline();
      const filteredOfflinePleins = vehiculeId
        ? offlinePleins.filter(p => p.vehicule_id === vehiculeId)
        : offlinePleins;
      
      return [...serverPleins, ...filteredOfflinePleins];
    },
  });
};

// src/hooks/usePleins.ts

export const useCreatePlein = () => {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();

  return useMutation({
    mutationFn: async ({ pleinData, ocrData, photoFile }: {
      pleinData: Omit<Plein, 'id'>;
      ocrData?: any;
      photoFile?: File;
    }): Promise<number> => {
      if (!isOnline) {
        return OfflineService.savePleinOffline(pleinData, ocrData, photoFile);
      }

      const formData = new FormData();

      // Plein
      Object.entries(pleinData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      // OCR
      if (ocrData) {
        if (ocrData.station) formData.append('ocr_station', ocrData.station);
        if (ocrData.date_bon) formData.append('ocr_date_bon', ocrData.date_bon);
        if (ocrData.litres) formData.append('ocr_litres', ocrData.litres.toString());
        if (ocrData.prix_total) formData.append('ocr_prix_total', ocrData.prix_total.toString());
        if (ocrData.chauffeur_matricule) formData.append('ocr_chauffeur_matricule', ocrData.chauffeur_matricule);
        if (ocrData.chauffeur_nom) formData.append('ocr_chauffeur_nom', ocrData.chauffeur_nom);
        if (ocrData.chauffeur_prenom) formData.append('ocr_chauffeur_prenom', ocrData.chauffeur_prenom);
        if (ocrData.vehicule_immatriculation) formData.append('ocr_vehicule_immatriculation', ocrData.vehicule_immatriculation);
        if (ocrData.vehicule_marque) formData.append('ocr_vehicule_marque', ocrData.vehicule_marque);
      }

      if (photoFile) {
        formData.append('photo_bon', photoFile);
      }

      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');

      if (!response.ok) {
        let errorData: any = { error: 'Erreur serveur' };

        if (isJson) {
          try {
            errorData = await response.json();
          } catch {
            // JSON corrompu → on garde le message générique
          }
        }

        const err = new Error(errorData.error || 'Erreur inconnue');
        (err as any).details = errorData; // On garde tout (dernier_odometre, espaceDisponible, etc.)
        (err as any).status = response.status;
        throw err;
      }

      const data = await response.json();
      return data.pleinId;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pleins'] });
      queryClient.invalidateQueries({ queryKey: ['niveaux-carburant'] });
    },

    onError: (error: any) => {
      // Optionnel : log centralisé
      console.error('Erreur création plein:', error);
    },
  });
};