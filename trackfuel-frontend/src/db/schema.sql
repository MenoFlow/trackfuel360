-- Schéma de base de données MySQL pour TrackFuel360
-- Version: 1.0
-- Date: 2025-10-08

-- ============================================
-- TABLES DE RÉFÉRENCE
-- ============================================



-- ============================================
-- TABLES OPÉRATIONNELLES
-- ============================================



-- Table Pleins
CREATE TABLE pleins (
    id VARCHAR(36) PRIMARY KEY,
    vehicule_id VARCHAR(36) NOT NULL,
    chauffeur_id VARCHAR(36) NOT NULL,
    date DATETIME NOT NULL,
    litres DECIMAL(10,2) NOT NULL,
    prix_unitaire DECIMAL(10,2) NOT NULL,
    odometre DECIMAL(12,2) NOT NULL,
    station VARCHAR(255),
    photo_bon VARCHAR(500),
    ocr_data TEXT,
    hash_bon VARCHAR(255),
    type_saisie ENUM('auto', 'manuelle') NOT NULL,
    geofence_id VARCHAR(36),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicule_id) REFERENCES vehicules(immatriculation) ON DELETE CASCADE,
    FOREIGN KEY (chauffeur_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_vehicule (vehicule_id),
    INDEX idx_chauffeur (chauffeur_id),
    INDEX idx_date (date),
    INDEX idx_hash_bon (hash_bon),
    INDEX idx_coordinates (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table EXIF Metadata (normalized)
CREATE TABLE plein_exif_metadata (
    id VARCHAR(36) PRIMARY KEY,
    plein_id VARCHAR(36) NOT NULL,
    date DATE NOT NULL,
    heure TIME NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    modele_telephone VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plein_id) REFERENCES pleins(id) ON DELETE CASCADE,
    INDEX idx_plein (plein_id),
    INDEX idx_coordinates (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table Niveau Carburant
CREATE TABLE niveaux_carburant (
    id VARCHAR(36) PRIMARY KEY,
    vehicule_id VARCHAR(36) NOT NULL,
    timestamp DATETIME NOT NULL,
    niveau DECIMAL(10,2) NOT NULL COMMENT 'Litres',
    type ENUM('avant_trajet', 'apres_trajet', 'apres_plein') NOT NULL,
    trajet_id VARCHAR(36),
    plein_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicule_id) REFERENCES vehicules(immatriculation) ON DELETE CASCADE,
    FOREIGN KEY (trajet_id) REFERENCES trajets(id) ON DELETE SET NULL,
    FOREIGN KEY (plein_id) REFERENCES pleins(id) ON DELETE SET NULL,
    INDEX idx_vehicule (vehicule_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_type (type),
    INDEX idx_trajet (trajet_id),
    INDEX idx_plein (plein_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ALERTES ET ANOMALIES
-- ============================================

-- Table Alertes
CREATE TABLE alertes (
    id VARCHAR(36) PRIMARY KEY,
    vehicule_id VARCHAR(36) NOT NULL,
    chauffeur_id VARCHAR(36),
    type ENUM(
        'consommation_elevee', 
        'plein_hors_zone', 
        'doublon_bon', 
        'distance_gps_ecart',
        'immobilisation_anormale',
        'carburant_disparu',
        'plein_suspect'
    ) NOT NULL,
    titre VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    score INT NOT NULL COMMENT '0-100',
    severity ENUM('low', 'medium', 'high') NOT NULL,
    status ENUM('new', 'in_progress', 'resolved', 'dismissed') NOT NULL DEFAULT 'new',
    date_detection DATETIME NOT NULL,
    justification TEXT,
    resolved_by VARCHAR(36),
    resolved_at DATETIME,
    deviation_percent DECIMAL(10,2),
    litres_manquants DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicule_id) REFERENCES vehicules(immatriculation) ON DELETE CASCADE,
    FOREIGN KEY (chauffeur_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_vehicule (vehicule_id),
    INDEX idx_chauffeur (chauffeur_id),
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_severity (severity),
    INDEX idx_date_detection (date_detection),
    INDEX idx_score (score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table Alerte Metadata (normalized)
CREATE TABLE alerte_metadata (
    id VARCHAR(36) PRIMARY KEY,
    alerte_id VARCHAR(36) NOT NULL,
    key_name VARCHAR(255) NOT NULL,
    value_data TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alerte_id) REFERENCES alertes(id) ON DELETE CASCADE,
    INDEX idx_alerte (alerte_id),
    INDEX idx_key (key_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- CORRECTIONS ET AUDIT
-- ============================================

-- Table Corrections
CREATE TABLE corrections (
    id VARCHAR(36) PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(36) NOT NULL,
    champ VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    status ENUM('pending', 'validated', 'rejected') NOT NULL DEFAULT 'pending',
    comment TEXT,
    requested_by VARCHAR(36) NOT NULL,
    requested_at DATETIME NOT NULL,
    validated_by VARCHAR(36),
    validated_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (validated_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_table_record (table_name, record_id),
    INDEX idx_requested_by (requested_by),
    INDEX idx_requested_at (requested_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
