import { useQuery } from '@tanstack/react-query';

export type TraceGps = {
  id: number;
  trajet_id: number;
  sequence: number;
  latitude: number;
  longitude: number;
  timestamp: string; // ISO string
};

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;
const API_BASE_URL = API_BASE+'/api/trace-gps';

export const useTraceGps = (trajetId?: number) => {
  return useQuery({
    queryKey: ['trace-gps', trajetId],
    queryFn: async (): Promise<TraceGps[]> => {
      const url = trajetId 
        ? `${API_BASE_URL}?trajet_id=${trajetId}` 
        : API_BASE_URL;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des traces GPS');
      }
      return response.json();
    },
    enabled: trajetId === undefined || trajetId > 0,
  });
};