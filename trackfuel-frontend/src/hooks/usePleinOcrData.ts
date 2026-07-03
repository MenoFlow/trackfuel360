import { useQuery } from '@tanstack/react-query';
import { BonCarburantScanne } from '@/types';

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const API_BASE_URL = API_BASE+'/api/plein-ocr';

// hooks/usePleinMetadata.ts
export const usePleinOcrData = (pleinId?: number) => {
  const query = useQuery<BonCarburantScanne[]>({
    queryKey: pleinId ? ['plein-ocr-data', pleinId] : ['plein-ocr-data'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}`);
      if (!res.ok) throw new Error('Données OCR indisponibles');
      const data: BonCarburantScanne[] = await res.json();

      if (pleinId) {
        const found = data.find(d => (d.plein_id).toString() === pleinId.toString());

        return found ? [found] : [];
      }
      return data;
    },
    enabled: true,
  });

  // Tu peux retourner directement l'objet complet
  return {
    ...query,
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
};
