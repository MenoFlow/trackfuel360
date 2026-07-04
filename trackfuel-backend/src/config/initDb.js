import db from './database.js';

export async function initDb() {
  const connection = await db.getConnection();
  try {
    console.log('⏳ Vérification et initialisation de la structure de la base de données...');

    // Harmonise les roles historiques avec le RBAC actuel.
    await connection.execute(`
      ALTER TABLE users
      MODIFY role ENUM('admin', 'manager', 'supervisor', 'driver', 'conducteur', 'auditor') NOT NULL;
    `);
    await connection.execute("UPDATE users SET role = 'conducteur' WHERE role = 'driver'");
    await connection.execute(`
      ALTER TABLE users
      MODIFY role ENUM('admin', 'manager', 'supervisor', 'conducteur', 'auditor') NOT NULL;
    `);

    const [userFunctionColumn] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'fonction'
    `);
    if (userFunctionColumn.length === 0) {
      await connection.execute(`
        ALTER TABLE users
        ADD COLUMN fonction ENUM('conducteur', 'directeur', 'assistant', 'responsable_flotte', 'mecanicien', 'comptable', 'autre') NOT NULL DEFAULT 'conducteur' AFTER role
      `);
      await connection.execute(`
        UPDATE users
        SET fonction = CASE role
          WHEN 'admin' THEN 'directeur'
          WHEN 'manager' THEN 'responsable_flotte'
          WHEN 'supervisor' THEN 'responsable_flotte'
          WHEN 'auditor' THEN 'assistant'
          ELSE 'conducteur'
        END
      `);
    }

    // 1. Table clients
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS clients (
          id BIGINT PRIMARY KEY AUTO_INCREMENT,
          nom VARCHAR(255) NOT NULL,
          configuration ENUM('fuel_only', 'fleet_only', 'fuel_fleet_drivers', 'complete') NOT NULL DEFAULT 'fuel_fleet_drivers',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed client par défaut
    const [clients] = await connection.execute('SELECT * FROM clients WHERE id = 1');
    if (clients.length === 0) {
      await connection.execute("INSERT IGNORE INTO clients (id, nom, configuration) VALUES (1, 'Client par defaut', 'fuel_fleet_drivers')");
    }

    // 2. Table modules
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS modules (
          code VARCHAR(50) PRIMARY KEY,
          label VARCHAR(100) NOT NULL,
          phase ENUM('MVP', 'V2', 'V3') NOT NULL,
          enabled_by_default BOOLEAN NOT NULL DEFAULT FALSE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed modules
    await connection.execute(`
      INSERT IGNORE INTO modules (code, label, phase, enabled_by_default) VALUES
      ('fuel', 'Carburant', 'MVP', TRUE),
      ('fleet', 'Parc roulant', 'MVP', TRUE),
      ('drivers', 'Conducteurs', 'MVP', TRUE),
      ('missions', 'Ordres de mission', 'MVP', TRUE),
      ('maintenance', 'Maintenance de base', 'MVP', TRUE),
      ('documents', 'Documents et rappels', 'MVP', TRUE),
      ('reporting', 'Reporting essentiel', 'MVP', TRUE),
      ('gps', 'GPS / geofence', 'V2', FALSE),
      ('planning', 'Planning / reservation', 'V2', FALSE),
      ('budgets', 'Budgets / couts', 'V2', FALSE),
      ('workshop_stock', 'Atelier / stock / pieces', 'V3', FALSE)
    `);
    await connection.execute("UPDATE modules SET label = 'Conducteurs' WHERE code = 'drivers'");

    // 3. Table client_modules
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS client_modules (
          client_id BIGINT NOT NULL,
          module_code VARCHAR(50) NOT NULL,
          enabled BOOLEAN NOT NULL DEFAULT TRUE,
          activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (client_id, module_code),
          FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
          FOREIGN KEY (module_code) REFERENCES modules(code) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed client_modules
    await connection.execute(`
      INSERT IGNORE INTO client_modules (client_id, module_code, enabled)
      SELECT 1, code, enabled_by_default FROM modules WHERE phase = 'MVP'
    `);

    // 4. Table app_configuration
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS app_configuration (
          \`key\` VARCHAR(100) PRIMARY KEY,
          \`value\` VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Table role_module_permissions
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS role_module_permissions (
          role ENUM('admin', 'manager', 'supervisor', 'conducteur', 'auditor') NOT NULL,
          module_code VARCHAR(50) NOT NULL,
          can_view BOOLEAN NOT NULL DEFAULT TRUE,
          can_manage BOOLEAN NOT NULL DEFAULT FALSE,
          PRIMARY KEY (role, module_code),
          FOREIGN KEY (module_code) REFERENCES modules(code) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.execute(`
      ALTER TABLE role_module_permissions
      MODIFY role ENUM('admin', 'manager', 'supervisor', 'driver', 'conducteur', 'auditor') NOT NULL;
    `);
    await connection.execute(`
      DELETE legacy
      FROM role_module_permissions legacy
      INNER JOIN role_module_permissions next_role
        ON next_role.module_code = legacy.module_code
       AND next_role.role = 'conducteur'
      WHERE legacy.role = 'driver'
    `);
    await connection.execute("UPDATE role_module_permissions SET role = 'conducteur' WHERE role = 'driver'");

    // Seed role_module_permissions
    await connection.execute(`
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
      ('conducteur', 'fuel', TRUE, FALSE),
      ('conducteur', 'missions', TRUE, FALSE),
      ('conducteur', 'maintenance', TRUE, FALSE)
    `);
    await connection.execute(`
      ALTER TABLE role_module_permissions
      MODIFY role ENUM('admin', 'manager', 'supervisor', 'conducteur', 'auditor') NOT NULL;
    `);

    // 6. Table driver_profiles
    await connection.execute(`
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
    `);

    // 7. Table ordres_mission
    await connection.execute(`
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
    `);

    const [affectationMissionColumn] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'affectations'
        AND COLUMN_NAME = 'mission_id'
    `);
    if (affectationMissionColumn.length === 0) {
      await connection.execute(`
        ALTER TABLE affectations
        ADD COLUMN mission_id BIGINT NULL AFTER chauffeur_id
      `);
    }

    const [affectationSourceColumn] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'affectations'
        AND COLUMN_NAME = 'source'
    `);
    if (affectationSourceColumn.length === 0) {
      await connection.execute(`
        ALTER TABLE affectations
        ADD COLUMN source ENUM('manuelle', 'mission') NOT NULL DEFAULT 'manuelle' AFTER mission_id
      `);
    }

    const [affectationMissionIndex] = await connection.execute(`
      SELECT INDEX_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'affectations'
        AND INDEX_NAME = 'idx_affectation_mission'
    `);
    if (affectationMissionIndex.length === 0) {
      await connection.execute('ALTER TABLE affectations ADD INDEX idx_affectation_mission (mission_id)');
    }

    const [affectationMissionFk] = await connection.execute(`
      SELECT CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'affectations'
        AND COLUMN_NAME = 'mission_id'
        AND REFERENCED_TABLE_NAME = 'ordres_mission'
    `);
    if (affectationMissionFk.length === 0) {
      await connection.execute(`
        ALTER TABLE affectations
        ADD CONSTRAINT fk_affectation_mission
          FOREIGN KEY (mission_id) REFERENCES ordres_mission(id) ON DELETE SET NULL
      `);
    }

    // 8. Table maintenance_interventions
    await connection.execute(`
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
    `);

    // 9. Table documents_administratifs
    await connection.execute(`
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
    `);

    // 10. V2 - Planning / disponibilite / reservation
    await connection.execute(`
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
    `);

    // 11. V2 - Budgets / couts
    await connection.execute(`
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
    `);

    // 12. V3 - Atelier / stock / pieces
    await connection.execute(`
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
    `);

    await connection.execute(`
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
    `);

    // Audit 2026-07-03 / Codex: persiste les rapports generes pour remplacer l'historique local IndexedDB non partageable.
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS rapports_generes (
          id VARCHAR(100) PRIMARY KEY,
          type VARCHAR(50) NOT NULL,
          titre VARCHAR(255) NOT NULL,
          utilisateur_id BIGINT NULL,
          utilisateur_nom VARCHAR(255),
          format_prefere ENUM('pdf', 'excel', 'csv', 'json') NULL,
          rapport_json JSON NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_rapports_created_at (created_at),
          INDEX idx_rapports_utilisateur (utilisateur_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Audit 2026-07-03 / Codex: token serveur pour que les liens de rapports restent accessibles hors navigateur d'origine.
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS rapport_share_tokens (
          token VARCHAR(128) PRIMARY KEY,
          rapport_id VARCHAR(100) NOT NULL,
          format_export ENUM('pdf', 'excel', 'csv', 'json') NOT NULL DEFAULT 'pdf',
          expires_at DATETIME NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (rapport_id) REFERENCES rapports_generes(id) ON DELETE CASCADE,
          INDEX idx_rapport_share_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ Initialisation de la base de données terminée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la base de données:', error.message);
  } finally {
    connection.release();
  }
}
