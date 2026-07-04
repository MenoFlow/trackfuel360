import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCurrentClientId, getCurrentRole } from '@/lib/accessControl';

export type ModuleCode =
  | 'fuel'
  | 'fleet'
  | 'drivers'
  | 'missions'
  | 'maintenance'
  | 'documents'
  | 'reporting'
  | 'gps'
  | 'planning'
  | 'budgets'
  | 'workshop_stock';

export interface AppModule {
  code: ModuleCode;
  label: string;
  phase: 'MVP' | 'V2' | 'V3';
  enabled: boolean;
  allowed: boolean;
  can_manage?: boolean;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;
const FALLBACK_MVP: AppModule[] = [
  { code: 'fuel', label: 'Carburant', phase: 'MVP', enabled: true, allowed: true },
  { code: 'fleet', label: 'Parc roulant', phase: 'MVP', enabled: true, allowed: true },
  { code: 'drivers', label: 'Conducteurs', phase: 'MVP', enabled: true, allowed: true },
  { code: 'missions', label: 'Ordres de mission', phase: 'MVP', enabled: true, allowed: true },
  { code: 'maintenance', label: 'Maintenance de base', phase: 'MVP', enabled: true, allowed: true },
  { code: 'documents', label: 'Documents et rappels', phase: 'MVP', enabled: true, allowed: true },
  { code: 'reporting', label: 'Reporting essentiel', phase: 'MVP', enabled: true, allowed: true },
  { code: 'gps', label: 'GPS / geofence', phase: 'V2', enabled: false, allowed: true },
  { code: 'planning', label: 'Planning / reservation', phase: 'V2', enabled: false, allowed: true },
  { code: 'budgets', label: 'Budgets / couts', phase: 'V2', enabled: false, allowed: true },
  { code: 'workshop_stock', label: 'Atelier / stock / pieces', phase: 'V3', enabled: false, allowed: true },
];

const currentRole = () => getCurrentRole() || 'admin';

export const useModules = () => {
  return useQuery({
    queryKey: ['modules', currentRole()],
    queryFn: async (): Promise<AppModule[]> => {
      const response = await fetch(`${API_BASE}/api/modules?client_id=${getCurrentClientId()}&role=${currentRole()}`);
      if (!response.ok) return FALLBACK_MVP;
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useModuleEnabled = (code: ModuleCode) => {
  const { data } = useModules();
  const module = data?.find(item => item.code === code);
  return module ? module.enabled && module.allowed : FALLBACK_MVP.some(item => item.code === code && item.enabled);
};

export const useUpdateModule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ code, enabled, clientId = getCurrentClientId() }: { code: ModuleCode; enabled: boolean; clientId?: number }) => {
      const response = await fetch(`${API_BASE}/api/modules/${code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, enabled }),
      });

      if (!response.ok) throw new Error("Impossible de mettre a jour le module");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
    },
  });
};

export const useApplyModuleConfiguration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ configuration, clientId = getCurrentClientId() }: { configuration: string; clientId?: number }) => {
      const response = await fetch(`${API_BASE}/api/modules/configuration/${configuration}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
      });

      if (!response.ok) throw new Error("Impossible d'appliquer cette configuration");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
    },
  });
};
