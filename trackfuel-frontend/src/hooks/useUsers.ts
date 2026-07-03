import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User } from '@/types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const API_BASE = import.meta.env.VITE_API_BASE_URL as string;
const API_BASE_URL = API_BASE+'/api/users';

// Simulate current user (for demo purposes)
let currentUserId = 1; // Default admin

export const useCurrentUser = () => {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: async (): Promise<User> => {
      const response = await fetch(`${API_BASE_URL}`);
      if (!response.ok) throw new Error('Erreur lors de la récupération des utilisateurs');
      const data = await response.json();
      return data[0];
    },
  });
};

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<User[]> => {

      const response = await fetch(`${API_BASE_URL}`);
      if (!response.ok) throw new Error('Erreur lors de la récupération des utilisateurs');
      const data = await response.json();
      return data;
    },
  });
};


export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newUser: Omit<User, 'id'> & { password: string }): Promise<User> => {
      const res = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newUser,
          site_id: newUser.site_id ?? null,
          password: newUser.password,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Erreur serveur' }));
        throw new Error(error.error || 'Échec de la création');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<User> & { password?: string };
    }): Promise<User> => {
      const res = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => (console.log(333)));
        throw new Error(error.error );
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    },
    onError: (error: Error) => {
    },
  });
};

// src/hooks/useDeleteUser.ts
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const res = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 404) {
        throw new Error('Utilisateur non trouvé');
      }

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Erreur serveur' }));
        throw new Error(error.error || 'Échec de la suppression');
      }

      // 204 No Content = succès
      return;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] }); // si besoin
    },
    onError: (error: Error) => {
      // Tu peux ajouter un toast ici si tu veux
      console.error('Suppression échouée:', error.message);
    },
  });
};

// Helper function to check permissions
export const hasPermission = (user: User | undefined, permission: string): boolean => {
  if (!user) return false;
  
  const permissions: Record<string, string[]> = {
    admin: ['*'], // All permissions
    manager: ['view_dashboard', 'view_alerts', 'view_reports', 'manage_vehicles', 'manage_drivers'],
    supervisor: ['view_dashboard', 'view_alerts', 'view_reports', 'validate_corrections'],
    driver: ['create_plein', 'view_own_data'],
    auditor: ['view_dashboard', 'view_alerts', 'view_reports', 'export_reports'],
  };
  
  const userPermissions = permissions[user.role] || [];
  return userPermissions.includes('*') || userPermissions.includes(permission);
};

// Simulate login (for demo purposes)
export const login = (userId: number) => {
  currentUserId = userId;
};

export const logout = () => {
  currentUserId = null;
};
