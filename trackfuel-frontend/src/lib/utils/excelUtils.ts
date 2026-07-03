import * as XLSX from 'xlsx';
import { DATA_TYPES } from '@/types';

export interface ExportHistory {
  id: string;
  types: string[];
  format: string;
  date: string;
  filename: string;
  rowCount: number;
}

// Normalise les noms de colonnes Excel (trim, toLowerCase, espaces → _)
export const normalizeKey = (key: string): string => {
  return key.trim().toLowerCase().replace(/\s+/g, '_');
};

const TYPE_ALIASES: Record<string, string> = {
  site: 'Site',
  sites: 'Site',
  user: 'User',
  users: 'User',
  vehicule: 'Vehicule',
  vehicules: 'Vehicule',
  trip: 'Trip',
  trips: 'Trip',
  tracegps: 'TraceGps',
  affectation: 'Affectation',
  geofence: 'Geofence',
  correction: 'Correction',
  plein: 'Plein',
  boncarburantscanne: 'BonCarburantScanne',
  pleinexifmetadata: 'PleinExifMetadata',
  niveaucarburant: 'NiveauCarburant',
  parametre: 'Parametre',
  client: 'Client',
  module: 'Module',
  clientmodule: 'ClientModule',
  appconfiguration: 'AppConfiguration',
  rolemodulepermission: 'RoleModulePermission',
  driverprofile: 'DriverProfile',
  ordremission: 'OrdreMission',
  maintenanceintervention: 'MaintenanceIntervention',
  documentadministratif: 'DocumentAdministratif',
  vehiclereservation: 'VehicleReservation',
  budgetcout: 'BudgetCout',
  stockpiece: 'StockPiece',
  piecesortie: 'PieceSortie',
  rapportgenere: 'RapportGenere',
  rapportsharetoken: 'RapportShareToken',
};

const DOCUMENT_RULES: Record<string, { owner: 'vehicule' | 'chauffeur'; rappelJours: number }> = {
  assurance: { owner: 'vehicule', rappelJours: 30 },
  visite_technique: { owner: 'vehicule', rappelJours: 30 },
  vignette: { owner: 'vehicule', rappelJours: 15 },
  carte_grise: { owner: 'vehicule', rappelJours: 365 },
  permis: { owner: 'chauffeur', rappelJours: 60 },
  visite_medicale: { owner: 'chauffeur', rappelJours: 30 },
};

// Normalise les noms de types (capitalize first letter)
export const normalizeTypeName = (type: string): string => {
  const key = type.trim().replace(/[\s_-]+/g, '').toLowerCase();
  return TYPE_ALIASES[key] || type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
};

// Mapping des clés Excel vers les clés attendues
export const normalizeRowKeys = (row: Record<string, any>): Record<string, any> => {
  const normalized: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[normalizeKey(key)] = value;
  }
  return normalized;
};

/**
 * Génère un fichier Excel template PRÊT À L'IMPORT
 * Contient les feuilles des tables applicatives avec des données cohérentes entre elles
 */
export const generateTemplateExcelFile = (): Blob => {
  const workbook = XLSX.utils.book_new();

// Fonction utilitaire pour formater une date en "YYYY-MM-DD HH:mm:ss"
function formatDate(date) {
  const pad = (n) => n.toString().padStart(2, '0');
  return (
    date.getFullYear() + '-' +
    pad(date.getMonth() + 1) + '-' +
    pad(date.getDate()) + ' ' +
    pad(date.getHours()) + ':' +
    pad(date.getMinutes()) + ':' +
    pad(date.getSeconds())
  );
}

// Générer les dates dynamiques
const now = new Date();
const dateDebut = new Date(now);
dateDebut.setDate(now.getDate() - 2);   // aujourd'hui - 2 jours

const dateFin = new Date(now);
dateFin.setDate(now.getDate() + 30);   // aujourd'hui + 30 jours

const templateData = {
  Client: [
    ['id', 'nom', 'configuration'],
    [1, 'Client démonstration', 'complete'],
  ],
  Module: [
    ['code', 'label', 'phase', 'enabled_by_default'],
    ['fuel', 'Carburant', 'MVP', true],
    ['fleet', 'Parc roulant', 'MVP', true],
    ['drivers', 'Chauffeurs', 'MVP', true],
    ['documents', 'Documents et rappels', 'MVP', true],
    ['reporting', 'Reporting essentiel', 'MVP', true],
  ],
  ClientModule: [
    ['client_id', 'module_code', 'enabled'],
    [1, 'fuel', true],
    [1, 'fleet', true],
    [1, 'drivers', true],
    [1, 'documents', true],
  ],
  AppConfiguration: [
    ['key', 'value'],
    ['installation_mode', 'complete'],
    ['default_locale', 'fr'],
  ],
  RoleModulePermission: [
    ['role', 'module_code', 'can_view', 'can_manage'],
    ['admin', 'fuel', true, true],
    ['manager', 'fleet', true, true],
    ['auditor', 'documents', true, false],
  ],
  Site: [
    ['id', 'nom', 'ville', 'pays'],
    [1, 'Site Antananarivo', 'Antananarivo', 'Madagascar'],
    [2, 'Site Toamasina', 'Toamasina', 'Madagascar'],
    [3, 'Site Mahajanga', 'Mahajanga', 'Madagascar'],
  ],
  User: [
    ['id', 'email', 'matricule', 'nom', 'prenom', 'role', 'site_id', 'password_hash'],
    [1, 'admin@trackfuel.mg', 'ADM001', 'Admin', 'Principal', 'admin', 1, 'password_hash'],
    [2, 'jean.rakoto@trackfuel.mg', 'DRV001', 'Rakoto', 'Jean', 'driver', 1, 'password_hash'],
    [3, 'maria.rabe@trackfuel.mg', 'DRV002', 'Rabe', 'Maria', 'driver', 2, 'password_hash'],
    [4, 'auditeur@trackfuel.mg', 'AUD001', 'Controle', 'Interne', 'auditor', 1, 'password_hash'],
  ],
  DriverProfile: [
    ['user_id', 'telephone', 'permis_numero', 'permis_categorie', 'statut'],
    [2, '+261 34 00 000 01', 'P-DRV001', 'B,C', 'actif'],
    [3, '+261 34 00 000 02', 'P-DRV002', 'B', 'actif'],
  ],
  Vehicule: [
    ['id', 'immatriculation', 'marque', 'modele', 'type', 'capacite_reservoir', 'consommation_nominale', 'carburant_initial', 'kilometrage_initial', 'actif', 'site_id'],
    [1, '1234 TAD', 'Toyota', 'Hilux', 'diesel', 80, 10.5, 40, 125000.5, true, 1],
    [2, '5678 TAD', 'Nissan', 'Navara', 'diesel', 80, 11.2, 60, 89000, true, 1],
    [3, '9012 TAE', 'Isuzu', 'D-Max', 'diesel', 76, 9.8, 30, 210000, true, 2],
  ],
  Geofence: [
    ['id', 'nom', 'type', 'lat', 'lon', 'rayon_metres'],
    [1, 'Dépôt Antananarivo', 'depot', -18.8792, 47.5079, 500],
    [2, 'Station partenaire', 'station', -18.885, 47.52, 250],
  ],
  Affectation: [
    ['id', 'vehicule_id', 'chauffeur_id', 'date_debut', 'date_fin'],
    [1, 1, 2, formatDate(dateDebut), formatDate(dateFin)],
    [2, 2, 3, formatDate(dateDebut), formatDate(dateFin)],
  ],
  Trip: [
    ['id', 'vehicule_id', 'chauffeur_id', 'date_debut', 'date_fin', 'distance_km', 'type_saisie'],
    [1, 1, 2, formatDate(dateDebut), formatDate(dateFin), 125.4, 'manuelle'],
    [2, 2, 3, formatDate(dateDebut), formatDate(dateFin), 88.7, 'manuelle'],
  ],
  TraceGps: [
    ['id', 'trajet_id', 'sequence', 'latitude', 'longitude', 'timestamp'],
    [1, 1, 1, -18.8792, 47.5079, formatDate(dateDebut)],
    [2, 1, 2, -18.91, 47.55, formatDate(dateFin)],
  ],
  Plein: [
    ['id', 'vehicule_id', 'chauffeur_id', 'date', 'litres', 'prix_unitaire', 'odometre', 'station', 'type_saisie', 'latitude', 'longitude'],
    [1, 1, 2, formatDate(dateDebut), 45, 6000, 125120, 'Station partenaire', 'manuelle', -18.885, 47.52],
    [2, 2, 3, formatDate(dateDebut), 38, 6000, 89120, 'Station partenaire', 'manuelle', -18.885, 47.52],
  ],
  BonCarburantScanne: [
    ['id', 'plein_id', 'station', 'date_bon', 'litres', 'prix_total', 'chauffeur_matricule', 'vehicule_immatriculation', 'ocr_confidence'],
    [1, 1, 'Station partenaire', dateDebut.toISOString().slice(0, 10), 45, 270000, 'DRV001', '1234 TAD', 96.5],
  ],
  PleinExifMetadata: [
    ['id', 'plein_id', 'date', 'heure', 'latitude', 'longitude', 'modele_telephone'],
    [1, 1, dateDebut.toISOString().slice(0, 10), '08:30:00', -18.885, 47.52, 'Android'],
  ],
  NiveauCarburant: [
    ['id', 'vehicule_id', 'timestamp', 'niveau', 'type', 'trajet_id', 'plein_id'],
    [1, 1, formatDate(dateDebut), 40, 'avant_plein', '', 1],
    [2, 1, formatDate(dateFin), 78, 'apres_plein', '', 1],
  ],
  Parametre: [
    ['id', 'label', 'description', 'valeur', 'unite', 'min', 'max'],
    ['seuil_surconsommation_pct', 'Seuil de surconsommation', 'Pourcentage au-dessus de la consommation nominale', 30, '%', 0, 100],
  ],
  Correction: [
    ['id', 'table', 'record_id', 'champ', 'old_value', 'new_value', 'status', 'comment', 'requested_by', 'requested_at'],
    [1, 'pleins', 1, 'litres', '40', '45', 'pending', 'Correction exemple', 2, formatDate(dateDebut)],
  ],
  OrdreMission: [
    ['id', 'vehicule_id', 'chauffeur_id', 'destination', 'motif', 'statut', 'date_depart', 'date_retour_prevue', 'kilometrage_depart'],
    [1, 1, 2, 'Toamasina', 'Livraison matériel', 'demande', formatDate(dateDebut), formatDate(dateFin), 125000],
  ],
  MaintenanceIntervention: [
    ['id', 'vehicule_id', 'type', 'description', 'date_prevue', 'kilometrage_prevu', 'cout', 'prestataire', 'statut'],
    [1, 1, 'vidange', 'Vidange périodique', dateFin.toISOString().slice(0, 10), 126000, 250000, 'Garage Central', 'planifie'],
  ],
  DocumentAdministratif: [
    ['id', 'type', 'vehicule_id', 'chauffeur_id', 'reference', 'delivre_le', 'expire_le', 'rappel_jours'],
    [1, 'assurance', 1, '', 'ASS-1234-TAD', dateDebut.toISOString().slice(0, 10), dateFin.toISOString().slice(0, 10), 30],
    [2, 'permis', '', 2, 'P-DRV001', dateDebut.toISOString().slice(0, 10), dateFin.toISOString().slice(0, 10), 60],
    [3, 'visite_medicale', '', 2, 'VM-DRV001', dateDebut.toISOString().slice(0, 10), dateFin.toISOString().slice(0, 10), 30],
  ],
  VehicleReservation: [
    ['id', 'vehicule_id', 'chauffeur_id', 'mission_id', 'motif', 'date_debut', 'date_fin', 'statut', 'notes'],
    [1, 1, 2, 1, 'Mission Toamasina', formatDate(dateDebut), formatDate(dateFin), 'confirmee', 'Réservation exemple'],
  ],
  BudgetCout: [
    ['id', 'module_type', 'scope_type', 'site_id', 'vehicule_id', 'direction', 'libelle', 'periode_debut', 'periode_fin', 'montant_prevu', 'montant_reel'],
    [1, 'carburant', 'vehicule', 1, 1, 'Logistique', 'Budget carburant Hilux', dateDebut.toISOString().slice(0, 10), dateFin.toISOString().slice(0, 10), 1500000, 540000],
  ],
  StockPiece: [
    ['id', 'reference', 'designation', 'categorie', 'quantite', 'seuil_critique', 'cout_unitaire', 'fournisseur'],
    [1, 'FLT-HLX-001', 'Filtre huile Hilux', 'Filtres', 12, 3, 35000, 'Garage Central'],
  ],
  PieceSortie: [
    ['id', 'piece_id', 'vehicule_id', 'maintenance_id', 'quantite', 'date_sortie', 'commentaire'],
    [1, 1, 1, 1, 1, formatDate(dateDebut), 'Sortie pour vidange'],
  ],
  RapportGenere: [
    ['id', 'type', 'titre', 'utilisateur_id', 'utilisateur_nom', 'format_prefere', 'rapport_json'],
    ['rapport_demo_1', 'kpi_global', 'Rapport démonstration', 1, 'Admin Principal', 'pdf', '{"metadata":{"id":"rapport_demo_1","type":"kpi_global","titre":"Rapport démonstration","description":"Exemple","date_generation":"2026-07-04T00:00:00.000Z","utilisateur_id":1,"utilisateur_nom":"Admin Principal","nb_lignes":0},"donnees":[]}'],
  ],
  RapportShareToken: [
    ['token', 'rapport_id', 'format_export', 'expires_at'],
    ['demo_token_rapport_1', 'rapport_demo_1', 'pdf', formatDate(dateFin)],
  ],
};

  // === Création des 4 feuilles avec style propre ===
  Object.entries(templateData).forEach(([sheetName, rows]) => {
    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    // Style des en-têtes (ligne 1)
    const headerRange = XLSX.utils.decode_range(worksheet['!ref']!);
    for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_col(C) + '1';
      if (!worksheet[cellAddress]) continue;
      worksheet[cellAddress].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4F46E5' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }

    // Ajustement automatique de la largeur des colonnes
    worksheet['!cols'] = rows[0].map((_, i) => {
      const values = rows.slice(1).map(row => row[i] ? String(row[i]) : '');
      const maxLength = Math.max(...values.map(v => v.length), String(rows[0][i]).length);
      return { wch: Math.min(Math.max(maxLength + 2, 12), 40) };
    });

    // Figer la première ligne
    worksheet['!freeze'] = { xSplit: '0', ySplit: '1', topLeftCell: 'A2', activePane: 'bottomLeft' };

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  // === Feuille d'instructions (optionnelle mais très utile pour l'utilisateur) ===
  const instructions = [
    ['INSTRUCTIONS D\'IMPORT'],
    [''],
    ['Cet fichier est prêt à être importé dans TrackFuel.'],
    ['Respectez l\'ordre des feuilles proposé dans le classeur.'],
    [''],
    ['Règles importantes :'],
    ['• Ne modifiez pas les en-têtes de colonnes'],
    ['• Les IDs doivent être uniques et cohérents entre les tables'],
    ['• Laissez la colonne "password_hash" vide (les mots de passe seront générés)'],
    ['• Les feuilles vides ou non utilisées peuvent rester présentes'],
    ['• Supprimez les lignes d\'exemple si vous ne voulez pas les importer'],
    [''],
    ['Bon import !']
  ];

  const instrWs = XLSX.utils.aoa_to_sheet(instructions);
  instrWs['!cols'] = [{ wch: 80 }];
  // Style du titre
  if (instrWs['A1']) {
    instrWs['A1'].s = { font: { bold: true, sz: 16, color: { rgb: '4F46E5' } } };
  }
  XLSX.utils.book_append_sheet(workbook, instrWs, 'Instructions');

  // Générer le fichier
  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
    compression: true
  });

  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
};
// Génère un fichier Excel stylisé
export const generateStyledExcelFile = (selectedTypes: string[], format: string, dataByType?: Record<string, any[]>): Blob => {
  const workbook = XLSX.utils.book_new();
  console.log(dataByType);

  selectedTypes.forEach((type) => {
    const data = dataByType[type as keyof typeof dataByType] || [];
    const worksheet = XLSX.utils.json_to_sheet(Array.isArray(data) ? data : [data]);

    // Style des en-têtes
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellAddress]) continue;
      worksheet[cellAddress].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4F46E5" } },
        alignment: { horizontal: "center", vertical: "center" }
      };
    }

    // Largeur des colonnes
    const cols = Object.keys(Array.isArray(data) && data[0] ? data[0] : {}).map(() => ({ wch: 20 }));
    worksheet['!cols'] = cols;

    XLSX.utils.book_append_sheet(workbook, worksheet, type);
  });

  if (format === 'excel') {
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  } else if (format === 'csv') {
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const csv = XLSX.utils.sheet_to_csv(firstSheet);
    return new Blob([csv], { type: 'text/csv' });
  } else {
    const json = selectedTypes.reduce((acc, type) => {
      acc[type] = dataByType[type as keyof typeof dataByType];
      return acc;
    }, {} as Record<string, any>);
    return new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
  }
};

// Télécharge un fichier
export const downloadFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Parse un fichier Excel avec normalisation des clés
export const parseExcelFile = async (file: File): Promise<Record<string, any[]>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const result: Record<string, any[]> = {};

        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          // Normaliser les clés de chaque ligne
          const normalizedData = jsonData.map((row: any) => normalizeRowKeys(row));
          result[normalizeTypeName(sheetName)] = normalizedData;
        });

        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsArrayBuffer(file);
  });
};

// Valide les dépendances
export const validateDependencies = (
  type: string, 
  data: Record<string, any>,
  existingData: Record<string, any[]>
): { valid: boolean; message?: string } => {
  const typeConfig = DATA_TYPES.find((t) => t.value === type);
  if (!typeConfig) return { valid: true };

  for (const dep of typeConfig.dependencies) {
    const depField = `${dep.toLowerCase()}_id`;
    const depId = data[depField];
    
    if (!depId) continue;

    const depData = existingData[dep] || [];
    const exists = depData.some((item: any) => item.id === depId);

    if (!exists) {
      return {
        valid: false,
        message: `Dépendance manquante: ${dep} avec ID "${depId}" introuvable`,
      };
    }
  }

  return { valid: true };
};

// Validation des champs requis par type de données
const requiredFieldsByType: Record<string, string[]> = {
  Site: ['nom', 'ville', 'pays'],
  Geofence: ['nom', 'type', 'lat', 'lon', 'rayon_metres'],
  User: ['email', 'matricule', 'nom', 'prenom', 'role'],
  Vehicule: ['immatriculation', 'marque', 'modele', 'type', 'capacite_reservoir', 'consommation_nominale'],
  Affectation: ['vehicule_id', 'chauffeur_id', 'date_debut', 'date_fin'],
  Trip: ['vehicule_id', 'chauffeur_id', 'date_debut', 'date_fin', 'distance_km', 'type_saisie'],
  TraceGps: ['trajet_id', 'sequence', 'latitude', 'longitude', 'timestamp'],
  Plein: ['vehicule_id', 'chauffeur_id', 'date', 'litres', 'prix_unitaire', 'odometre', 'station', 'type_saisie'],
  BonCarburantScanne: ['plein_id'],
  PleinExifMetadata: ['plein_id'],
  NiveauCarburant: ['vehicule_id', 'timestamp', 'niveau', 'type'],
  Parametre: ['id', 'label', 'description', 'valeur', 'unite', 'min', 'max'],
  Correction: ['table', 'record_id', 'champ', 'old_value', 'new_value', 'status', 'requested_by', 'requested_at'],
  Client: ['nom', 'configuration'],
  Module: ['code', 'label', 'phase', 'enabled_by_default'],
  ClientModule: ['client_id', 'module_code', 'enabled'],
  AppConfiguration: ['key', 'value'],
  RoleModulePermission: ['role', 'module_code'],
  DriverProfile: ['user_id', 'statut'],
  OrdreMission: ['vehicule_id', 'chauffeur_id', 'destination', 'motif', 'date_depart'],
  MaintenanceIntervention: ['vehicule_id', 'type', 'description'],
  DocumentAdministratif: ['type', 'expire_le'],
  VehicleReservation: ['vehicule_id', 'motif', 'date_debut', 'date_fin'],
  BudgetCout: ['module_type', 'scope_type', 'libelle', 'periode_debut', 'periode_fin'],
  StockPiece: ['reference', 'designation'],
  PieceSortie: ['piece_id', 'quantite'],
  RapportGenere: ['id', 'type', 'titre', 'rapport_json'],
  RapportShareToken: ['token', 'rapport_id', 'expires_at'],
};

// Validation des formats de champs spécifiques
const fieldFormatsByType: Record<string, Record<string, 'number' | 'date' | 'boolean'>> = {
  Site: {},
  Geofence: { lat: 'number', lon: 'number', rayon_metres: 'number' },
  User: { site_id: 'number' },
  Vehicule: { site_id: 'number', capacite_reservoir: 'number', consommation_nominale: 'number', carburant_initial: 'number', actif: 'boolean' },
  Affectation: { vehicule_id: 'number', chauffeur_id: 'number', date_debut: 'date', date_fin: 'date' },
  Trip: { vehicule_id: 'number', chauffeur_id: 'number', date_debut: 'date', date_fin: 'date', distance_km: 'number' },
  TraceGps: { trajet_id: 'number', sequence: 'number', latitude: 'number', longitude: 'number', timestamp: 'date' },
  Plein: { vehicule_id: 'number', chauffeur_id: 'number', date: 'date', litres: 'number', prix_unitaire: 'number', montant_total: 'number', odometre: 'number', latitude: 'number', longitude: 'number' },
  BonCarburantScanne: { plein_id: 'number', date_bon: 'date', litres: 'number', prix_total: 'number', ocr_confidence: 'number' },
  PleinExifMetadata: { plein_id: 'number', date: 'date', latitude: 'number', longitude: 'number' },
  NiveauCarburant: { vehicule_id: 'number', plein_id: 'number', timestamp: 'date', niveau: 'number' },
  Parametre: { valeur: 'number', min: 'number', max: 'number' },
  Correction: { validated_by: 'number', requested_at: 'date', validated_at: 'date' },
  Client: {},
  Module: { enabled_by_default: 'boolean' },
  ClientModule: { client_id: 'number', enabled: 'boolean' },
  RoleModulePermission: { can_view: 'boolean', can_manage: 'boolean' },
  DriverProfile: { user_id: 'number' },
  OrdreMission: { vehicule_id: 'number', chauffeur_id: 'number', date_depart: 'date', date_retour_prevue: 'date', date_retour_reelle: 'date', kilometrage_depart: 'number', kilometrage_retour: 'number' },
  MaintenanceIntervention: { vehicule_id: 'number', date_prevue: 'date', kilometrage_prevu: 'number', date_realisation: 'date', cout: 'number' },
  DocumentAdministratif: { vehicule_id: 'number', chauffeur_id: 'number', delivre_le: 'date', expire_le: 'date', rappel_jours: 'number' },
  VehicleReservation: { vehicule_id: 'number', chauffeur_id: 'number', mission_id: 'number', date_debut: 'date', date_fin: 'date' },
  BudgetCout: { site_id: 'number', vehicule_id: 'number', periode_debut: 'date', periode_fin: 'date', montant_prevu: 'number', montant_reel: 'number' },
  StockPiece: { quantite: 'number', seuil_critique: 'number', cout_unitaire: 'number' },
  PieceSortie: { piece_id: 'number', vehicule_id: 'number', maintenance_id: 'number', quantite: 'number', date_sortie: 'date' },
  RapportGenere: { utilisateur_id: 'number' },
  RapportShareToken: { expires_at: 'date' },
};

// Champs qui acceptent les valeurs négatives (coordonnées géographiques)
const allowNegativeFields = ['lat', 'lon', 'latitude', 'longitude'];

// Valide le format des valeurs (nombres, dates, booléens)
export const validateFieldFormats = (type: string, data: Record<string, any>): { valid: boolean; message?: string } => {
  const formats = fieldFormatsByType[type] || {};
  
  for (const [field, format] of Object.entries(formats)) {
    const value = data[field];
    
    if (value === undefined || value === null || value === '') continue;
    
    if (format === 'number') {
      const num = Number(value);
      if (isNaN(num)) {
        return {
          valid: false,
          message: `Le champ "${field}" doit être un nombre (valeur reçue: ${value})`,
        };
      }
      // Vérifier si le champ accepte les valeurs négatives
      if (num < 0 && !allowNegativeFields.includes(field)) {
        return {
          valid: false,
          message: `Le champ "${field}" doit être un nombre positif (valeur reçue: ${value})`,
        };
      }
    } else if (format === 'date') {
      if (isNaN(Date.parse(value))) {
        return {
          valid: false,
          message: `Le champ "${field}" doit être une date valide (valeur reçue: ${value})`,
        };
      }
    } else if (format === 'boolean') {
      if (typeof value !== 'boolean' && value !== 'true' && value !== 'false' && value !== 0 && value !== 1) {
        return {
          valid: false,
          message: `Le champ "${field}" doit être un booléen (valeur reçue: ${value})`,
        };
      }
    }
  }

  return { valid: true };
};

// Valide les champs requis
export const validateRequiredFields = (type: string, data: Record<string, any>): { valid: boolean; message?: string } => {
  const requiredFields = requiredFieldsByType[type] || [];
  const missingFields = requiredFields.filter(field => !data[field] && data[field] !== false && data[field] !== 0);

  if (missingFields.length > 0) {
    return {
      valid: false,
      message: `Champs requis manquants: ${missingFields.join(', ')}`,
    };
  }

  if (type === 'DocumentAdministratif') {
    const rule = DOCUMENT_RULES[data.type];
    if (!rule) {
      return {
        valid: false,
        message: `Type de document invalide: ${data.type}`,
      };
    }

    const ownerField = rule.owner === 'vehicule' ? 'vehicule_id' : 'chauffeur_id';
    if (!data[ownerField] && data[ownerField] !== 0) {
      return {
        valid: false,
        message: `Le type "${data.type}" doit etre lie a un ${rule.owner}`,
      };
    }
  }

  return { valid: true };
};
