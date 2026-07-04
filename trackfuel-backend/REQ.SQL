-- Table Sites
CREATE TABLE IF NOT EXISTS sites (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    nom VARCHAR(255) NOT NULL,
    ville VARCHAR(255) NOT NULL,
    pays VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table Users
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    matricule VARCHAR(50) UNIQUE NOT NULL,
    nom VARCHAR(255) NOT NULL,
    prenom VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'supervisor', 'driver', 'auditor') NOT NULL,
    site_id BIGINT,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    INDEX idx_role (role),
    INDEX idx_site (site_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table Véhicules
CREATE TABLE IF NOT EXISTS vehicules (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    immatriculation VARCHAR(36) UNIQUE NOT NULL,
    marque VARCHAR(100) NOT NULL,
    modele VARCHAR(100) NOT NULL,
    type ENUM('essence', 'diesel', 'hybride', 'gpl') NOT NULL DEFAULT 'essence',
    capacite_reservoir DECIMAL(8,2) NOT NULL,
    consommation_nominale DECIMAL(8,2) NOT NULL COMMENT 'L/100km',
    carburant_initial DECIMAL(8,2) DEFAULT 0,
    kilometrage_initial DECIMAL(12,2) UNSIGNED NOT NULL DEFAULT 0,
    actif BOOLEAN DEFAULT TRUE, 
    site_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id),
    INDEX idx_immatriculation (immatriculation),
    INDEX idx_site (site_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Stores all trip information including GPS traces
CREATE TABLE IF NOT EXISTS trips (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    vehicule_id BIGINT NOT NULL,
    chauffeur_id BIGINT NOT NULL,
    date_debut DATETIME NOT NULL,
    date_fin DATETIME NOT NULL,
    distance_km FLOAT NOT NULL,
    type_saisie ENUM('auto', 'manuelle') NOT NULL DEFAULT 'manuelle',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Clés étrangères
    FOREIGN KEY (vehicule_id) REFERENCES vehicules(id) ON DELETE CASCADE,
    FOREIGN KEY (chauffeur_id) REFERENCES users(id) ON DELETE CASCADE,

    -- Index pour performance
    INDEX idx_vehicule_id (vehicule_id),
    INDEX idx_chauffeur_id (chauffeur_id),
    INDEX idx_date_debut (date_debut),
    INDEX idx_date_fin (date_fin),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS traceGps (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  trajet_id BIGINT NOT NULL,
  sequence INT NOT NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  timestamp DATETIME NOT NULL,
  
  FOREIGN KEY (trajet_id) REFERENCES trips(id) ON DELETE CASCADE,
  INDEX idx_sequence (sequence)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table Affectations
CREATE TABLE affectations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    vehicule_id BIGINT NOT NULL,
    chauffeur_id BIGINT NOT NULL,
    mission_id BIGINT NULL,
    source ENUM('manuelle', 'mission') NOT NULL DEFAULT 'manuelle',
    date_debut DATETIME NOT NULL,
    date_fin DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicule_id) REFERENCES vehicules(id) ON DELETE CASCADE,
    FOREIGN KEY (chauffeur_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_vehicule (vehicule_id),
    INDEX idx_affectation_mission (mission_id),
    INDEX idx_date_debut (date_debut),
    INDEX idx_date_fin (date_fin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE geofences (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    nom VARCHAR(255) NOT NULL,
    type ENUM('depot', 'station', 'zone_risque') NOT NULL,
    lat DECIMAL(10, 6) NOT NULL,
    lon DECIMAL(10, 6) NOT NULL,
    rayon_metres DECIMAL(18,6) NOT NULL,
    INDEX idx_location (lat, lon),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE corrections (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    `table` VARCHAR(50) NOT NULL,
    record_id VARCHAR(50) NOT NULL,
    champ VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    status ENUM('pending', 'validated', 'rejected') NOT NULL DEFAULT 'pending',
    comment TEXT,
    requested_by VARCHAR(50) NOT NULL,
    requested_at DATETIME NOT NULL,
    validated_by BIGINT NULL,
    validated_at DATETIME,
    -- Clé étrangère vers users(id)
    CONSTRAINT fk_corrections_validated_by FOREIGN KEY (validated_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    
    -- Index pour accélérer les recherches par validateur
    INDEX idx_validated_by (validated_by)    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table Pleins (remplissage carburant)
CREATE TABLE IF NOT EXISTS pleins (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    vehicule_id BIGINT NOT NULL,
    chauffeur_id BIGINT NOT NULL,
    date DATETIME NOT NULL,
    litres DECIMAL(10,2) NOT NULL,
    prix_unitaire DECIMAL(10,4) NOT NULL,
    montant_total DECIMAL(12,4) GENERATED ALWAYS AS (litres * prix_unitaire) STORED,
    odometre INT NOT NULL,
    station VARCHAR(255) NOT NULL,
    type_saisie ENUM('manuelle', 'auto') NOT NULL,
    photo_bon VARCHAR(255),
    latitude DECIMAL(10,8),
    longitude DECIMAL(10,8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Clés étrangères
    FOREIGN KEY (vehicule_id) REFERENCES vehicules(id) ON DELETE CASCADE,
    FOREIGN KEY (chauffeur_id) REFERENCES users(id) ON DELETE CASCADE,

    -- Index pour performances
    INDEX idx_date (date),
    INDEX idx_vehicule (vehicule_id),
    INDEX idx_chauffeur (chauffeur_id),
    INDEX idx_station (station),
    INDEX idx_type_saisie (type_saisie)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE bons_carburant_scannes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  plein_id BIGINT NOT NULL,
  
  -- Données extraites par OCR
  station VARCHAR(255),
  date_bon DATE,
  litres DECIMAL(10,3),
  prix_total DECIMAL(15,2),
  
  -- Chauffeur sur le bon
  chauffeur_matricule VARCHAR(50),
  chauffeur_nom VARCHAR(100),
  chauffeur_prenom VARCHAR(100),
  
  -- Véhicule sur le bon
  vehicule_immatriculation VARCHAR(20),
  vehicule_marque VARCHAR(100),
  
  -- Métadonnées
  photo_path VARCHAR(500), -- Chemin ou URL de la photo
  ocr_confidence DECIMAL(5,2) DEFAULT NULL, -- Si Tesseract le fournit
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Index pour recherche rapide
  INDEX idx_plein_id (plein_id),
  INDEX idx_chauffeur_matricule (chauffeur_matricule),
  INDEX idx_vehicule_immat (vehicule_immatriculation)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Table PleinExifMetadata (métadonnées EXIF des photos de bons)
CREATE TABLE IF NOT EXISTS plein_exif_metadata (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    plein_id BIGINT NOT NULL,
    
    date DATE NULL COMMENT 'Date du cliché (YYYY-MM-DD)',
    heure TIME NULL COMMENT 'Heure du cliché (HH:MM:SS)',
    
    latitude DECIMAL(10,8) NULL COMMENT 'Latitude GPS',
    longitude DECIMAL(10,8) NULL COMMENT 'Longitude GPS',
    
    modele_telephone VARCHAR(100) NULL COMMENT 'Modèle du téléphone',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Clé étrangère vers la table pleins
    CONSTRAINT fk_plein_exif_plein
        FOREIGN KEY (plein_id) REFERENCES pleins(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    -- Index pour performances
    INDEX idx_plein_id (plein_id),
    INDEX idx_date_heure (date, heure),
    INDEX idx_coords (latitude, longitude),
    INDEX idx_modele (modele_telephone)
) 
ENGINE=InnoDB 
DEFAULT CHARSET=utf8mb4 
COLLATE=utf8mb4_unicode_ci 
COMMENT='Métadonnées EXIF extraites des photos de bons de carburant';

CREATE TABLE IF NOT EXISTS niveaux_carburant (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    vehicule_id BIGINT NOT NULL,
    timestamp DATETIME NOT NULL,
    niveau DECIMAL(5,2) NOT NULL COMMENT 'Litres dans le réservoir',
    type ENUM('avant_trajet', 'avant_plein', 'apres_plein', 'apres_trajet') NOT NULL,
    trajet_id VARCHAR(50) NULL,
    plein_id BIGINT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Clés étrangères
    FOREIGN KEY (vehicule_id) REFERENCES vehicules(id) ON DELETE CASCADE,
    FOREIGN KEY (plein_id) REFERENCES pleins(id) ON DELETE SET NULL,

    -- Index pour performance
    INDEX idx_vehicule_time (vehicule_id, timestamp),
    INDEX idx_plein (plein_id),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE parametres (
    id VARCHAR(50) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    valeur INT NOT NULL,
    unite VARCHAR(10) NOT NULL,
    min INT NOT NULL,
    max INT NOT NULL,
    
    -- Contraintes de cohérence
    CONSTRAINT chk_valeur_in_range 
        CHECK (valeur >= min AND valeur <= max),
    
    CONSTRAINT chk_min_max_order 
        CHECK (min <= max),
    
    -- Index pour accélérer les recherches par label
    INDEX idx_label (label)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO parametres (id, label, description, valeur, unite, min, max) VALUES
('seuil_surconsommation_pct', 'Seuil de surconsommation', 'Pourcentage au-dessus de la consommation nominale', 30, '%', 0, 100),
('seuil_ecart_gps_pct', 'Écart GPS vs odomètre', 'Écart maximal entre GPS et odomètre', 20, '%', 0, 100),
('seuil_carburant_disparu_litres', 'Carburant disparu', 'Seuil minimal de carburant manquant', 5, 'L', 0, 1000),
('seuil_exif_heures', 'Écart EXIF temporel', 'Écart maximal entre heure EXIF et heure réelle', 2, 'h', 0, 48),
('seuil_exif_distance_km', 'Écart EXIF géographique', 'Écart maximal entre position EXIF et position réelle', 1, 'km', 0, 100),
('seuil_immobilisation_heures', 'Durée d''immobilisation', 'Temps d''immobilisation hors dépôt déclenchant une alerte', 12, 'h', 0, 168),
('periode_consommation_jours', 'Période d''analyse', 'Durée d''analyse de la consommation moyenne', 7, 'jours', 1, 365);

INSERT IGNORE INTO users (
    email,
    matricule,
    nom,
    prenom,
    role,
    site_id,
    password_hash
) VALUES (
    'admin@example.com',
    'ADM001',
    'Dupont',
    'Jean',
    'admin',
    1,
    '$2b$10$eImiTXuWVxfM37uY4JANjQ=='
);

INSERT IGNORE INTO users (
    email, matricule, nom, prenom, role, site_id, password_hash
) VALUES (
    'driver@example.com', 'DRV001', 'Chauffeur', 'Jean', 'driver', 1, 'hashed_password_driver'
);

-- MVP TrackFuel360 modulaire
CREATE TABLE IF NOT EXISTS clients (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    nom VARCHAR(255) NOT NULL,
    configuration ENUM('fuel_only', 'fleet_only', 'fuel_fleet_drivers', 'complete') NOT NULL DEFAULT 'fuel_fleet_drivers',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO clients (id, nom, configuration) VALUES (1, 'Client par defaut', 'fuel_fleet_drivers');

CREATE TABLE IF NOT EXISTS modules (
    code VARCHAR(50) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    phase ENUM('MVP', 'V2', 'V3') NOT NULL,
    enabled_by_default BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO modules (code, label, phase, enabled_by_default) VALUES
('fuel', 'Carburant', 'MVP', TRUE),
('fleet', 'Parc roulant', 'MVP', TRUE),
('drivers', 'Chauffeurs', 'MVP', TRUE),
('missions', 'Ordres de mission', 'MVP', TRUE),
('maintenance', 'Maintenance de base', 'MVP', TRUE),
('documents', 'Documents et rappels', 'MVP', TRUE),
('reporting', 'Reporting essentiel', 'MVP', TRUE),
('gps', 'GPS / geofence', 'V2', FALSE),
('planning', 'Planning / reservation', 'V2', FALSE),
('budgets', 'Budgets / couts', 'V2', FALSE),
('workshop_stock', 'Atelier / stock / pieces', 'V3', FALSE);

CREATE TABLE IF NOT EXISTS client_modules (
    client_id BIGINT NOT NULL,
    module_code VARCHAR(50) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (client_id, module_code),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (module_code) REFERENCES modules(code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO client_modules (client_id, module_code, enabled)
SELECT 1, code, enabled_by_default FROM modules WHERE phase = 'MVP';

CREATE TABLE IF NOT EXISTS app_configuration (
    `key` VARCHAR(100) PRIMARY KEY,
    `value` VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_module_permissions (
    role ENUM('admin', 'manager', 'supervisor', 'driver', 'auditor') NOT NULL,
    module_code VARCHAR(50) NOT NULL,
    can_view BOOLEAN NOT NULL DEFAULT TRUE,
    can_manage BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (role, module_code),
    FOREIGN KEY (module_code) REFERENCES modules(code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO role_module_permissions (role, module_code, can_view, can_manage) VALUES
('admin', 'fuel', TRUE, TRUE),
('admin', 'fleet', TRUE, TRUE),
('admin', 'drivers', TRUE, TRUE),
('admin', 'missions', TRUE, TRUE),
('admin', 'maintenance', TRUE, TRUE),
('admin', 'documents', TRUE, TRUE),
('admin', 'reporting', TRUE, TRUE),
('admin', 'gps', TRUE, TRUE),
('admin', 'planning', TRUE, TRUE),
('admin', 'budgets', TRUE, TRUE),
('admin', 'workshop_stock', TRUE, TRUE),
('manager', 'fuel', TRUE, TRUE),
('manager', 'fleet', TRUE, TRUE),
('manager', 'drivers', TRUE, TRUE),
('manager', 'missions', TRUE, TRUE),
('manager', 'maintenance', TRUE, TRUE),
('manager', 'documents', TRUE, TRUE),
('manager', 'reporting', TRUE, FALSE),
('manager', 'gps', TRUE, TRUE),
('manager', 'planning', TRUE, TRUE),
('manager', 'budgets', TRUE, TRUE),
('manager', 'workshop_stock', TRUE, TRUE),
('supervisor', 'fuel', TRUE, FALSE),
('supervisor', 'fleet', TRUE, FALSE),
('supervisor', 'drivers', TRUE, FALSE),
('supervisor', 'missions', TRUE, TRUE),
('supervisor', 'maintenance', TRUE, TRUE),
('supervisor', 'documents', TRUE, FALSE),
('supervisor', 'reporting', TRUE, FALSE),
('supervisor', 'gps', TRUE, FALSE),
('supervisor', 'planning', TRUE, FALSE),
('supervisor', 'budgets', TRUE, FALSE),
('supervisor', 'workshop_stock', TRUE, FALSE),
('auditor', 'fuel', TRUE, FALSE),
('auditor', 'fleet', TRUE, FALSE),
('auditor', 'documents', TRUE, FALSE),
('auditor', 'reporting', TRUE, FALSE),
('auditor', 'budgets', TRUE, FALSE),
('driver', 'fuel', TRUE, FALSE),
('driver', 'missions', TRUE, FALSE);

CREATE TABLE IF NOT EXISTS driver_profiles (
    user_id BIGINT PRIMARY KEY,
    telephone VARCHAR(50),
    permis_numero VARCHAR(100),
    permis_categorie VARCHAR(50),
    permis_expire_le DATE,
    visite_medicale_expire_le DATE,
    statut ENUM('actif', 'suspendu', 'inactif') NOT NULL DEFAULT 'actif',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ordres_mission (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    vehicule_id BIGINT NOT NULL,
    chauffeur_id BIGINT NOT NULL,
    destination VARCHAR(255) NOT NULL,
    motif TEXT NOT NULL,
    statut ENUM('demande', 'validee', 'rejetee', 'en_cours', 'terminee') NOT NULL DEFAULT 'demande',
    motif_rejet TEXT,
    date_depart DATETIME NOT NULL,
    date_retour_prevue DATETIME,
    date_retour_reelle DATETIME,
    kilometrage_depart DECIMAL(12,2),
    kilometrage_retour DECIMAL(12,2),
    rapport TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicule_id) REFERENCES vehicules(id) ON DELETE CASCADE,
    FOREIGN KEY (chauffeur_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_mission_statut (statut),
    INDEX idx_mission_dates (date_depart, date_retour_prevue)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS maintenance_interventions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    vehicule_id BIGINT NOT NULL,
    type ENUM('vidange', 'pneus', 'freins', 'batterie', 'filtres', 'revision', 'reparation', 'panne', 'accident') NOT NULL,
    description TEXT NOT NULL,
    date_prevue DATE,
    kilometrage_prevu DECIMAL(12,2),
    date_realisation DATE,
    cout DECIMAL(12,2) DEFAULT 0,
    prestataire VARCHAR(255),
    statut ENUM('planifie', 'en_cours', 'termine', 'annule') NOT NULL DEFAULT 'planifie',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicule_id) REFERENCES vehicules(id) ON DELETE CASCADE,
    INDEX idx_maintenance_statut (statut),
    INDEX idx_maintenance_date (date_prevue)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS documents_administratifs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    type ENUM('assurance', 'visite_technique', 'vignette', 'carte_grise', 'permis', 'visite_medicale') NOT NULL,
    vehicule_id BIGINT NULL,
    chauffeur_id BIGINT NULL,
    reference VARCHAR(255),
    delivre_le DATE,
    expire_le DATE NOT NULL,
    rappel_jours INT NOT NULL DEFAULT 30,
    fichier_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicule_id) REFERENCES vehicules(id) ON DELETE CASCADE,
    FOREIGN KEY (chauffeur_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_documents_type (type),
    INDEX idx_documents_expire (expire_le)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vehicle_reservations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    vehicule_id BIGINT NOT NULL,
    chauffeur_id BIGINT NULL,
    mission_id BIGINT NULL,
    motif VARCHAR(255) NOT NULL,
    date_debut DATETIME NOT NULL,
    date_fin DATETIME NOT NULL,
    statut ENUM('demandee', 'confirmee', 'annulee', 'terminee') NOT NULL DEFAULT 'demandee',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicule_id) REFERENCES vehicules(id) ON DELETE CASCADE,
    FOREIGN KEY (chauffeur_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (mission_id) REFERENCES ordres_mission(id) ON DELETE SET NULL,
    INDEX idx_reservation_vehicule_dates (vehicule_id, date_debut, date_fin),
    INDEX idx_reservation_statut (statut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS budgets_couts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    module_type ENUM('carburant', 'maintenance', 'global') NOT NULL DEFAULT 'global',
    scope_type ENUM('global', 'site', 'direction', 'vehicule', 'periode') NOT NULL DEFAULT 'global',
    site_id BIGINT NULL,
    vehicule_id BIGINT NULL,
    direction VARCHAR(255) NULL,
    libelle VARCHAR(255) NOT NULL,
    periode_debut DATE NOT NULL,
    periode_fin DATE NOT NULL,
    montant_prevu DECIMAL(14,2) NOT NULL DEFAULT 0,
    montant_reel DECIMAL(14,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL,
    FOREIGN KEY (vehicule_id) REFERENCES vehicules(id) ON DELETE SET NULL,
    INDEX idx_budgets_periode (periode_debut, periode_fin),
    INDEX idx_budgets_scope (scope_type, module_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_pieces (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    reference VARCHAR(100) UNIQUE NOT NULL,
    designation VARCHAR(255) NOT NULL,
    categorie VARCHAR(100),
    quantite DECIMAL(12,2) NOT NULL DEFAULT 0,
    seuil_critique DECIMAL(12,2) NOT NULL DEFAULT 0,
    cout_unitaire DECIMAL(12,2) NOT NULL DEFAULT 0,
    fournisseur VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_stock_reference (reference),
    INDEX idx_stock_categorie (categorie)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS piece_sorties (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    piece_id BIGINT NOT NULL,
    vehicule_id BIGINT NULL,
    maintenance_id BIGINT NULL,
    quantite DECIMAL(12,2) NOT NULL,
    date_sortie DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    commentaire TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (piece_id) REFERENCES stock_pieces(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicule_id) REFERENCES vehicules(id) ON DELETE SET NULL,
    FOREIGN KEY (maintenance_id) REFERENCES maintenance_interventions(id) ON DELETE SET NULL,
    INDEX idx_piece_sorties_piece (piece_id),
    INDEX idx_piece_sorties_vehicule (vehicule_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
