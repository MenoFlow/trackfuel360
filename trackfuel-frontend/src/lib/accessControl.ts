import { AppRole, User } from '@/types';

export const APP_ROLES: AppRole[] = ['admin', 'manager', 'supervisor', 'driver', 'auditor'];

export const roleIncludes = (currentRole?: string, allowedRoles?: AppRole[]) => {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return Boolean(currentRole && allowedRoles.includes(currentRole as AppRole));
};

export const getCurrentUser = (): User | null => {
  try {
    return JSON.parse(localStorage.getItem('currentUser') || 'null');
  } catch {
    return null;
  }
};

export const getCurrentRole = (): AppRole | undefined => getCurrentUser()?.role;

export const getCurrentClientId = () => {
  const rawClientId = localStorage.getItem('currentClientId') || import.meta.env.VITE_DEFAULT_CLIENT_ID || '1';
  const clientId = Number(rawClientId);
  return Number.isFinite(clientId) && clientId > 0 ? clientId : 1;
};

export const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  admin: [
    'manage_users',
    'manage_sites',
    'manage_modules',
    'manage_notifications',
    'manage_import_export',
    'manage_corrections',
  ],
  manager: ['manage_users', 'manage_sites', 'manage_notifications', 'manage_corrections'],
  supervisor: ['manage_corrections'],
  auditor: ['manage_import_export'],
  driver: [],
};

export const hasPermission = (user: User | null | undefined, permission: string) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false;
};
