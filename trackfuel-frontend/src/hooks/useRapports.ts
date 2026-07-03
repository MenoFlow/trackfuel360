import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RapportType, RapportFilters, RapportData, RapportMetadata } from '@/types';
import { genererRapport } from '@/lib/services/rapportService';
// import { allAlertes } from '@/lib/mockData';
import * as rapportStorage from '@/lib/services/rapportStorage';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

const apiUrl = (path: string) => `${API_BASE}${path}`;

async function saveRapportToBackend(rapport: RapportData): Promise<void> {
  if (!API_BASE) {
    await rapportStorage.storeRapport(rapport);
    return;
  }

  const response = await fetch(apiUrl('/api/rapports'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rapport }),
  });

  if (!response.ok) {
    throw new Error('Impossible de sauvegarder le rapport en base');
  }
}

/**
 * Hook pour générer un rapport
 */
export const useGenererRapport = (vehicules, sites, trajets, pleins, corrections, niveauxCarburant) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      type, 
      filtres, 
      currentUser 
    }: { 
      type: RapportType; 
      filtres: RapportFilters;
      currentUser: any;
    }): Promise<RapportData> => {
      console.log('[useRapports] Début génération rapport:', { type, filtres });
      await delay(800); // Simulation génération
      
      const rapport = genererRapport(
        type,
        filtres,
        vehicules,
        trajets,
        pleins,
        // allAlertes,
        corrections,
        sites,
        currentUser,
        niveauxCarburant
      );
      
      console.log('[useRapports] Rapport généré:', rapport.metadata.id);
      
      // Audit 2026-07-03 / Codex: sauvegarde serveur pour rendre l'historique et les liens partageables.
      try {
        await saveRapportToBackend(rapport);
      } catch (error) {
        console.warn('[useRapports] Sauvegarde serveur indisponible, fallback IndexedDB:', error);
        await rapportStorage.cleanupExpiredRapports();
        await rapportStorage.storeRapport(rapport);
      }
      
      return rapport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapports-historique'] });
    }
  });
};

/**
 * Hook pour récupérer l'historique des rapports générés
 */
export const useHistoriqueRapports = () => {
  return useQuery({
    queryKey: ['rapports-historique'],
    queryFn: async (): Promise<RapportMetadata[]> => {
      console.log('[useRapports] Récupération historique rapports');
      if (API_BASE) {
        const response = await fetch(apiUrl('/api/rapports/history?limit=5'));
        if (response.ok) return response.json();
      }

      await delay(300);
      const rapports = await rapportStorage.getAllRapports();
      return rapports
        .sort((a, b) => new Date(b.metadata.date_generation).getTime() - new Date(a.metadata.date_generation).getTime())
        .slice(0, 5)
        .map(r => r.metadata);
    },
  });
};

/**
 * Hook pour récupérer un rapport spécifique par ID
 */
export const useRapport = (rapportId: string) => {
  return useQuery({
    queryKey: ['rapport', rapportId],
    queryFn: async (): Promise<RapportData | null> => {
      console.log('[useRapports] Recherche rapport:', rapportId);
      if (API_BASE) {
        const response = await fetch(apiUrl(`/api/rapports/${encodeURIComponent(rapportId)}`));
        if (response.ok) return response.json();
      }

      await delay(200);
      const entry = await rapportStorage.getRapport(rapportId);
      
      if (entry) {
        console.log('[useRapports] Rapport trouvé:', entry.rapport.metadata.titre);
        return entry.rapport;
      } else {
        console.warn('[useRapports] Rapport introuvable:', rapportId);
        return null;
      }
    },
    enabled: !!rapportId
  });
};

export const useRapportShare = (token: string | undefined) => {
  return useQuery({
    queryKey: ['rapport-share', token],
    queryFn: async (): Promise<{ rapport: RapportData; format: any; expires_at: string } | null> => {
      if (!API_BASE || !token) return null;

      const response = await fetch(apiUrl(`/api/rapports/share/${encodeURIComponent(token)}`));
      if (response.status === 404 || response.status === 410) return null;
      if (!response.ok) throw new Error('Lien de rapport indisponible');
      return response.json();
    },
    enabled: Boolean(API_BASE && token),
    retry: false,
  });
};

export async function creerLienRapport(rapportId: string, format: string = 'pdf', expirationMinutes = 24 * 60) {
  if (!API_BASE) return null;

  const response = await fetch(apiUrl(`/api/rapports/${encodeURIComponent(rapportId)}/share`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format, expiration_minutes: expirationMinutes }),
  });

  if (!response.ok) throw new Error('Impossible de creer le lien de partage');
  const payload = await response.json();
  return `${window.location.origin}/rapports/export/${payload.token}`;
}

/**
 * Hook pour supprimer un rapport de l'historique
 */
export const useSupprimerRapport = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rapportId: string): Promise<void> => {
      console.log('[useRapports] Suppression rapport:', rapportId);
      await delay(200);
      await rapportStorage.deleteRapport(rapportId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapports-historique'] });
    }
  });
};

/**
 * Hook pour vider l'historique
 */
export const useViderHistorique = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (): Promise<void> => {
      console.log('[useRapports] Vidage historique');
      await delay(200);
      await rapportStorage.clearAllRapports();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapports-historique'] });
    }
  });
};
