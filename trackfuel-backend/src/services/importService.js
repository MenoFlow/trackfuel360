/**
 * Service d'importation de données TrackFuel360
 * Gère le parsing Excel, la validation et l'insertion ordonnée en base de données
 */

import XLSX from 'xlsx';

const DOCUMENT_RULES = {
  assurance: { owner: 'vehicule', rappelJours: 30 },
  visite_technique: { owner: 'vehicule', rappelJours: 30 },
  vignette: { owner: 'vehicule', rappelJours: 15 },
  carte_grise: { owner: 'vehicule', rappelJours: 365 },
  permis: { owner: 'chauffeur', rappelJours: 60 },
  visite_medicale: { owner: 'chauffeur', rappelJours: 30 },
};

const typeAliases = {
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
  affectations: 'Affectation',
  geofence: 'Geofence',
  geofences: 'Geofence',
  correction: 'Correction',
  corrections: 'Correction',
  plein: 'Plein',
  pleins: 'Plein',
  boncarburantscanne: 'BonCarburantScanne',
  bonscarburantscannes: 'BonCarburantScanne',
  pleinexifmetadata: 'PleinExifMetadata',
  niveaucarburant: 'NiveauCarburant',
  niveauxcarburant: 'NiveauCarburant',
  parametre: 'Parametre',
  parametres: 'Parametre',
  client: 'Client',
  clients: 'Client',
  module: 'Module',
  modules: 'Module',
  clientmodule: 'ClientModule',
  clientmodules: 'ClientModule',
  appconfiguration: 'AppConfiguration',
  rolemodulepermission: 'RoleModulePermission',
  driverprofile: 'DriverProfile',
  ordreMission: 'OrdreMission',
  ordremission: 'OrdreMission',
  ordresmission: 'OrdreMission',
  maintenanceintervention: 'MaintenanceIntervention',
  documentadministratif: 'DocumentAdministratif',
  vehiclereservation: 'VehicleReservation',
  budgetcout: 'BudgetCout',
  stockpiece: 'StockPiece',
  piecesortie: 'PieceSortie',
  rapportgenere: 'RapportGenere',
  rapportsharetoken: 'RapportShareToken',
};

const normalizeTypeName = (sheetName) => {
  const key = sheetName.trim().replace(/[\s_-]+/g, '').toLowerCase();
  return typeAliases[key] || sheetName.charAt(0).toUpperCase() + sheetName.slice(1).toLowerCase();
};

/**
 * Parse un fichier Excel et retourne les données structurées par onglet
 * @param {Buffer} fileBuffer - Buffer du fichier Excel
 * @returns {Object} Données parsées par type (clé = nom de l'onglet)
 */
const parseExcelFile = (fileBuffer) => {
  try {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const result = {};

    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      // Normaliser les clés (trim, toLowerCase, espaces → _)
      const normalizedData = jsonData.map((row) => {
        const normalized = {};
        for (const [key, value] of Object.entries(row)) {
          const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
          normalized[normalizedKey] = value;
        }
        return normalized;
      });

      // Normaliser le nom du type en conservant les noms composes utilises par l'import/export.
      const typeName = normalizeTypeName(sheetName);
      result[typeName] = normalizedData;
    });

    return result;
  } catch (error) {
    throw new Error(`Erreur lors du parsing du fichier Excel: ${error.message}`);
  }
};

const tableConfigByType = {
  Site: { table: 'sites', keyFields: ['id'], columns: ['id', 'nom', 'ville', 'pays', 'created_at', 'updated_at'] },
  User: { table: 'users', keyFields: ['id'], columns: ['id', 'email', 'matricule', 'nom', 'prenom', 'role', 'site_id', 'password_hash', 'created_at', 'updated_at'] },
  Vehicule: { table: 'vehicules', keyFields: ['id'], columns: ['id', 'immatriculation', 'marque', 'modele', 'type', 'capacite_reservoir', 'consommation_nominale', 'carburant_initial', 'kilometrage_initial', 'actif', 'site_id', 'created_at', 'updated_at'] },
  Trip: { table: 'trips', keyFields: ['id'], columns: ['id', 'vehicule_id', 'chauffeur_id', 'date_debut', 'date_fin', 'distance_km', 'type_saisie', 'created_at', 'updated_at'] },
  TraceGps: { table: 'traceGps', keyFields: ['id'], columns: ['id', 'trajet_id', 'sequence', 'latitude', 'longitude', 'timestamp'] },
  Affectation: { table: 'affectations', keyFields: ['id'], columns: ['id', 'vehicule_id', 'chauffeur_id', 'date_debut', 'date_fin', 'created_at'] },
  Geofence: { table: 'geofences', keyFields: ['id'], columns: ['id', 'nom', 'type', 'lat', 'lon', 'rayon_metres'] },
  Correction: { table: 'corrections', keyFields: ['id'], columns: ['id', 'table', 'record_id', 'champ', 'old_value', 'new_value', 'status', 'comment', 'requested_by', 'requested_at', 'validated_by', 'validated_at'] },
  Plein: { table: 'pleins', keyFields: ['id'], columns: ['id', 'vehicule_id', 'chauffeur_id', 'date', 'litres', 'prix_unitaire', 'odometre', 'station', 'type_saisie', 'photo_bon', 'latitude', 'longitude', 'created_at', 'updated_at'] },
  BonCarburantScanne: { table: 'bons_carburant_scannes', keyFields: ['id'], columns: ['id', 'plein_id', 'station', 'date_bon', 'litres', 'prix_total', 'chauffeur_matricule', 'chauffeur_nom', 'chauffeur_prenom', 'vehicule_immatriculation', 'vehicule_marque', 'photo_path', 'ocr_confidence', 'created_at'] },
  PleinExifMetadata: { table: 'plein_exif_metadata', keyFields: ['id'], columns: ['id', 'plein_id', 'date', 'heure', 'latitude', 'longitude', 'modele_telephone', 'created_at', 'updated_at'] },
  NiveauCarburant: { table: 'niveaux_carburant', keyFields: ['id'], columns: ['id', 'vehicule_id', 'timestamp', 'niveau', 'type', 'trajet_id', 'plein_id', 'created_at', 'updated_at'] },
  Parametre: { table: 'parametres', keyFields: ['id'], columns: ['id', 'label', 'description', 'valeur', 'unite', 'min', 'max'] },
  Client: { table: 'clients', keyFields: ['id'], columns: ['id', 'nom', 'configuration', 'created_at', 'updated_at'] },
  Module: { table: 'modules', keyFields: ['code'], columns: ['code', 'label', 'phase', 'enabled_by_default'] },
  ClientModule: { table: 'client_modules', keyFields: ['client_id', 'module_code'], columns: ['client_id', 'module_code', 'enabled', 'activated_at'] },
  AppConfiguration: { table: 'app_configuration', keyFields: ['key'], columns: ['key', 'value', 'created_at', 'updated_at'] },
  RoleModulePermission: { table: 'role_module_permissions', keyFields: ['role', 'module_code'], columns: ['role', 'module_code', 'can_view', 'can_manage'] },
  DriverProfile: { table: 'driver_profiles', keyFields: ['user_id'], columns: ['user_id', 'telephone', 'permis_numero', 'permis_categorie', 'statut', 'updated_at'] },
  OrdreMission: { table: 'ordres_mission', keyFields: ['id'], columns: ['id', 'vehicule_id', 'chauffeur_id', 'destination', 'motif', 'statut', 'motif_rejet', 'date_depart', 'date_retour_prevue', 'date_retour_reelle', 'kilometrage_depart', 'kilometrage_retour', 'rapport', 'created_at', 'updated_at'] },
  MaintenanceIntervention: { table: 'maintenance_interventions', keyFields: ['id'], columns: ['id', 'vehicule_id', 'type', 'description', 'date_prevue', 'kilometrage_prevu', 'date_realisation', 'cout', 'prestataire', 'statut', 'created_at', 'updated_at'] },
  DocumentAdministratif: { table: 'documents_administratifs', keyFields: ['id'], columns: ['id', 'type', 'vehicule_id', 'chauffeur_id', 'reference', 'delivre_le', 'expire_le', 'rappel_jours', 'fichier_url', 'created_at', 'updated_at'] },
  VehicleReservation: { table: 'vehicle_reservations', keyFields: ['id'], columns: ['id', 'vehicule_id', 'chauffeur_id', 'mission_id', 'motif', 'date_debut', 'date_fin', 'statut', 'notes', 'created_at', 'updated_at'] },
  BudgetCout: { table: 'budgets_couts', keyFields: ['id'], columns: ['id', 'module_type', 'scope_type', 'site_id', 'vehicule_id', 'direction', 'libelle', 'periode_debut', 'periode_fin', 'montant_prevu', 'montant_reel', 'created_at', 'updated_at'] },
  StockPiece: { table: 'stock_pieces', keyFields: ['id'], columns: ['id', 'reference', 'designation', 'categorie', 'quantite', 'seuil_critique', 'cout_unitaire', 'fournisseur', 'created_at', 'updated_at'] },
  PieceSortie: { table: 'piece_sorties', keyFields: ['id'], columns: ['id', 'piece_id', 'vehicule_id', 'maintenance_id', 'quantite', 'date_sortie', 'commentaire', 'created_at'] },
  RapportGenere: { table: 'rapports_generes', keyFields: ['id'], columns: ['id', 'type', 'titre', 'utilisateur_id', 'utilisateur_nom', 'format_prefere', 'rapport_json', 'created_at'] },
  RapportShareToken: { table: 'rapport_share_tokens', keyFields: ['token'], columns: ['token', 'rapport_id', 'format_export', 'expires_at', 'created_at'] },
};

// Champs requis par type de données
const requiredFieldsByType = {
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

/**
 * Valide les champs requis pour un type de données
 * @param {string} type - Type de données (Site, User, Vehicule, etc.)
 * @param {Object} data - Ligne de données à valider
 * @returns {Object} { valid: boolean, message?: string }
 */
const validateRequiredFields = (type, data) => {
  const requiredFields = requiredFieldsByType[type] || [];
  const missingFields = requiredFields.filter(
    (field) => !data[field] && data[field] !== false && data[field] !== 0
  );

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

// Formats de champs par type
const fieldFormatsByType = {
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

const allowNegativeFields = ['lat', 'lon', 'latitude', 'longitude'];

/**
 * Valide le format des données (nombres, dates, booléens)
 * @param {string} type - Type de données
 * @param {Object} data - Ligne de données à valider
 * @returns {Object} { valid: boolean, message?: string }
 */
const validateFieldFormats = (type, data) => {
  const formats = fieldFormatsByType[type] || {};
  
  for (const [field, format] of Object.entries(formats)) {
    const value = data[field];
    
    if (value === undefined || value === null || value === '') continue;
    
    if (format === 'number') {
      const num = Number(value);
      if (isNaN(num) || (num < 0 && !allowNegativeFields.includes(field))) {
        return {
          valid: false,
          message: `Le champ "${field}" doit être un nombre valide (valeur reçue: ${value})`,
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

// Dépendances entre types de données (4 tables principales)
const dependenciesByType = {
  Site: [],
  Client: [],
  Module: [],
  AppConfiguration: [],
  Parametre: [],
  User: ['Site'],
  Vehicule: ['Site'],
  Affectation: ['Vehicule', 'User'],
  Trip: ['Vehicule', 'User'],
  TraceGps: ['Trip'],
  Geofence: [],
  Correction: ['User'],
  Plein: ['Vehicule', 'User'],
  BonCarburantScanne: ['Plein'],
  PleinExifMetadata: ['Plein'],
  NiveauCarburant: ['Vehicule'],
  ClientModule: ['Client', 'Module'],
  RoleModulePermission: ['Module'],
  DriverProfile: ['User'],
  OrdreMission: ['Vehicule', 'User'],
  MaintenanceIntervention: ['Vehicule'],
  DocumentAdministratif: [],
  VehicleReservation: ['Vehicule'],
  BudgetCout: [],
  StockPiece: [],
  PieceSortie: ['StockPiece'],
  RapportGenere: [],
  RapportShareToken: ['RapportGenere'],
};

/**
 * Valide les dépendances entre entités
 * @param {string} type - Type de données
 * @param {Object} data - Ligne de données à valider
 * @param {Object} existingData - Données déjà existantes en base (par type)
 * @returns {Object} { valid: boolean, message?: string }
 */
const validateDependencies = (type, data, existingData) => {
  const deps = dependenciesByType[type] || [];

  for (const dep of deps) {
    const depField = `${dep.toLowerCase()}_id`;
    const depId = data[depField];

    if (!depId) continue;

    const depData = existingData[dep] || [];
    const exists = depData.some((item) => item.id === depId);

    if (!exists) {
      return {
        valid: false,
        message: `Dépendance manquante: ${dep} avec ID "${depId}" introuvable`,
      };
    }
  }

  return { valid: true };
};

/**
 * Insère un site dans la base de données
 */
async function insertSite(db, data) {
  const query = `
    INSERT IGNORE INTO sites (id, nom, ville, pays)
    VALUES (?, ?, ?, ?)
  `;
  const [result] = await db.execute(query, [data.id || null, data.nom, data.ville, data.pays]);
  return data.id || result.insertId;
}

/**
 * Insère un utilisateur dans la base de données
 */
async function insertUser(db, data) {
  const query = `
    INSERT IGNORE INTO users (id, email, matricule, nom, prenom, role, site_id, password_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const [result] = await db.execute(query, [
    data.id || null,
    data.email,
    data.matricule,
    data.nom,
    data.prenom,
    data.role,
    data.site_id || null,
    data.password_hash
  ]);
  return data.id || result.insertId;
}

/**
 * Insère un véhicule dans la base de données
 * @param {Object} db - Instance de connexion MySQL (mysql2/promise)
 * @param {Object} data - Données du véhicule validées au préalable
 * @returns {Promise<number>} insertId du véhicule créé
 */
/**
 * Insère un véhicule dans la base de données
 * @throws {Error} Si l'insertion échoue (ex: doublon immatriculation)
 */
async function insertVehicule(db, data) {
  const query = `
    INSERT IGNORE INTO vehicules (
      id, immatriculation, marque, modele, type,
      capacite_reservoir, consommation_nominale,
      carburant_initial, kilometrage_initial,
      actif, site_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  try {
    const [result] = await db.execute(query, [
      data.id || null,
      (data.immatriculation || '').trim().toUpperCase(),
      (data.marque || '').trim(),
      (data.modele || '').trim(),
      data.type,
      parseFloat(data.capacite_reservoir) || 0,
      parseFloat(data.consommation_nominale) || 0,
      parseFloat(data.carburant_initial) || 0,
      parseFloat(data.kilometrage_initial) || 0,   // Obligatoire maintenant
      data.actif ?? true,
      data.site_id ?? null
    ]);

    return data.id || result.insertId;
  } catch (error) {
    // Gestion spécifique du doublon d'immatriculation (erreur 1062)
    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error(`Un véhicule avec l'immatriculation ${data.immatriculation} existe déjà`);
    }
    // Relance l'erreur pour gestion centralisée
    throw error;
  }
}

/**
 * Insère une affectation dans la base de données
 */
async function insertAffectation(db, data) {
  const query = `
    INSERT IGNORE INTO affectations (id, vehicule_id, chauffeur_id, date_debut, date_fin)
    VALUES (?, ?, ?, ?, ?)
  `;
  const [result] = await db.execute(query, [
    data.id || null,
    data.vehicule_id,
    data.chauffeur_id,
    data.date_debut,
    data.date_fin
  ]);
  return data.id || result.insertId;
}

const normalizeImportValue = (value) => {
  if (value === undefined || value === '') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

async function insertGenericEntity(db, type, data) {
  const config = tableConfigByType[type];
  if (!config) {
    throw new Error(`Type d'import non supporte: ${type}`);
  }

  data = { ...data };

  if (type === 'User' && !data.password_hash) {
    data.password_hash = 'imported_user_change_me';
  }

  if (type === 'DocumentAdministratif') {
    const rule = DOCUMENT_RULES[data.type];
    if (!rule) {
      throw new Error(`Type de document invalide: ${data.type}`);
    }
    data.rappel_jours = rule.rappelJours;
    if (rule.owner === 'vehicule') {
      data.chauffeur_id = null;
    } else {
      data.vehicule_id = null;
    }
  }

  const columns = config.columns.filter((column) => data[column] !== undefined);
  if (columns.length === 0) {
    throw new Error(`Aucune colonne reconnue pour ${type}`);
  }

  const placeholders = columns.map(() => '?').join(', ');
  const escapedColumns = columns.map(column => `\`${column}\``).join(', ');
  const values = columns.map(column => normalizeImportValue(data[column]));
  const [result] = await db.execute(
    `INSERT IGNORE INTO \`${config.table}\` (${escapedColumns}) VALUES (${placeholders})`,
    values
  );

  return data.id || data.code || data.token || data.key || result.insertId;
}

/**
 * Insère les données dans l'ordre correct en respectant les dépendances
 * @param {Object} db - Instance de connexion MySQL (mysql2)
 * @param {Object} data - Données parsées par type
 * @returns {Promise<Object>} Résultat de l'insertion { success: boolean, inserted: number, errors: Array }
 */
async function insertEntitiesInOrder(db, data) {
  // Ordre d'insertion respectant les dépendances
  const insertionOrder = [
    'Client',
    'Module',
    'ClientModule',
    'AppConfiguration',
    'RoleModulePermission',
    'Site',
    'User',
    'DriverProfile',
    'Vehicule',
    'Geofence',
    'Affectation',
    'Trip',
    'TraceGps',
    'Plein',
    'BonCarburantScanne',
    'PleinExifMetadata',
    'NiveauCarburant',
    'Parametre',
    'Correction',
    'OrdreMission',
    'MaintenanceIntervention',
    'DocumentAdministratif',
    'VehicleReservation',
    'BudgetCout',
    'StockPiece',
    'PieceSortie',
    'RapportGenere',
    'RapportShareToken',
  ];

  const result = {
    success: true,
    inserted: 0,
    errors: [],
  };

  // Charger les données existantes pour la validation des dépendances
  const existingData = {};
  for (const type of insertionOrder) {
    try {
      const config = tableConfigByType[type];
      if (!config) continue;
      const selectFields = config.keyFields.map(field => `\`${field}\``).join(', ');
      const [rows] = await db.execute(`SELECT ${selectFields} FROM \`${config.table}\``);
      existingData[type] = rows;
    } catch (error) {
      console.error(`Erreur lors du chargement de ${type}:`, error);
      existingData[type] = [];
    }
  }

  // Insertion dans l'ordre
  for (const type of insertionOrder) {
    const rows = data[type] || [];

    for (const row of rows) {
      try {
        // Validation des champs requis
        const requiredValidation = validateRequiredFields(type, row);
        if (!requiredValidation.valid) {
          result.errors.push({ type, row, error: requiredValidation.message });
          continue;
        }

        // Validation des formats
        const formatValidation = validateFieldFormats(type, row);
        if (!formatValidation.valid) {
          result.errors.push({ type, row, error: formatValidation.message });
          continue;
        }

        // Validation des dépendances
        const depValidation = validateDependencies(type, row, existingData);
        if (!depValidation.valid) {
          result.errors.push({ type, row, error: depValidation.message });
          continue;
        }

        const insertId = await insertGenericEntity(db, type, row);
        
        result.inserted++;
        
        // Ajouter aux données existantes pour les prochaines validations
        existingData[type] = existingData[type] || [];
        existingData[type].push({ id: insertId, ...row });
      } catch (error) {
        result.errors.push({ type, row, error: error.message });
      }
    }
  }

  if (result.errors.length > 0) {
    result.success = false;
  }

  return result;
}

export {
  tableConfigByType,
  parseExcelFile,
  validateRequiredFields,
  validateFieldFormats,
  validateDependencies,
  insertEntitiesInOrder,
};
