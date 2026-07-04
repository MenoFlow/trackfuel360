import { AppRole, UserFonction } from '@/types';

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrateur',
  manager: 'Manager',
  supervisor: 'Superviseur',
  conducteur: 'Conducteur',
  auditor: 'Auditeur',
};

export const FONCTION_LABELS: Record<UserFonction, string> = {
  conducteur: 'Conducteur',
  directeur: 'Directeur',
  assistant: 'Assistant',
  responsable_flotte: 'Responsable flotte',
  mecanicien: 'Mécanicien',
  comptable: 'Comptable',
  autre: 'Autre',
};

export const USER_FONCTIONS = Object.keys(FONCTION_LABELS) as UserFonction[];
