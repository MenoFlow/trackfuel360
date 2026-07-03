import { useQuery } from '@tanstack/react-query';
import { PleinExifMetadata } from '@/types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const API_BASE_URL = API_BASE+'/api/plein-exif';

// hooks/usePleinMetadata.ts
export const usePleinMetadata = (pleinId?: number) => {
  const query = useQuery<PleinExifMetadata[]>({
    queryKey: pleinId ? ['plein-metadata', pleinId] : ['plein-metadata'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}`);
      if (!res.ok) throw new Error('Métadonnées indisponibles');
      const data: PleinExifMetadata[] = await res.json();

      if (pleinId) {
        const found = data.find(m => m.plein_id === pleinId);
        return found ? [found] : []; // ← TOUJOURS TABLEAU
      }
      return data;
    },
    enabled: true,
  });

  // Tu peux retourner directement l'objet complet
  return {
    ...query,
    // ou bien sélectionner ce que tu veux exposer :
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
};

// export const useAllPleinMetadata = () => {
//   return useQuery({
//     queryKey: ['plein-metadata'],
//     queryFn: async (): Promise<PleinExifMetadata[]> => {
//       // await delay(200);
          // const response = await fetch(`${API_BASE_URL}`);
          // if (!response.ok) throw new Error('Erreur lors de la récupération des utilisateurs');
          // const data = await response.json();
//       return data;
//     },
//   });
// };
