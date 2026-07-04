export const MODULE_CATALOG = [
  { code: 'fuel', label: 'Carburant', phase: 'MVP', enabledByDefault: true },
  { code: 'fleet', label: 'Parc roulant', phase: 'MVP', enabledByDefault: true },
  { code: 'drivers', label: 'Conducteurs', phase: 'MVP', enabledByDefault: true },
  { code: 'missions', label: 'Ordres de mission', phase: 'MVP', enabledByDefault: true },
  { code: 'maintenance', label: 'Maintenance de base', phase: 'MVP', enabledByDefault: true },
  { code: 'documents', label: 'Documents et rappels', phase: 'MVP', enabledByDefault: true },
  { code: 'reporting', label: 'Reporting essentiel', phase: 'MVP', enabledByDefault: true },
  { code: 'gps', label: 'GPS / geofence', phase: 'V2', enabledByDefault: false },
  { code: 'planning', label: 'Planning / reservation', phase: 'V2', enabledByDefault: false },
  { code: 'budgets', label: 'Budgets / couts', phase: 'V2', enabledByDefault: false },
  { code: 'workshop_stock', label: 'Atelier / stock / pieces', phase: 'V3', enabledByDefault: false },
];

export const CONFIGURATION_PRESETS = {
  fuel_only: ['fuel', 'reporting'],
  fleet_only: ['fleet', 'maintenance', 'documents', 'reporting'],
  fuel_fleet_drivers: ['fuel', 'fleet', 'drivers', 'missions', 'maintenance', 'documents', 'reporting'],
  complete: MODULE_CATALOG.map(module => module.code),
};

export const DEFAULT_ROLE_MODULES = {
  admin: MODULE_CATALOG.map(module => module.code),
  manager: ['fuel', 'fleet', 'drivers', 'missions', 'maintenance', 'documents', 'reporting', 'gps', 'planning', 'budgets', 'workshop_stock'],
  supervisor: ['fuel', 'fleet', 'drivers', 'missions', 'maintenance', 'documents', 'reporting', 'gps', 'planning', 'budgets', 'workshop_stock'],
  auditor: ['fuel', 'fleet', 'documents', 'reporting', 'budgets'],
  conducteur: ['fuel', 'missions', 'maintenance'],
};

export const MVP_MODULE_CODES = MODULE_CATALOG
  .filter(module => module.phase === 'MVP')
  .map(module => module.code);
