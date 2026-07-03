import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import db from '../config/database.js';

const router = express.Router();

const CONFIG_KEY = 'is_configured';

const ensureConfigurationTable = async (connection) => {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS app_configuration (
      \`key\` VARCHAR(100) PRIMARY KEY,
      \`value\` VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const bootstrapAdmin = async () => {
  const connection = await db.getConnection();

  try {
    await ensureConfigurationTable(connection);
    await connection.beginTransaction();

    const [configuredRows] = await connection.execute(
      'SELECT `value` FROM app_configuration WHERE `key` = ? FOR UPDATE',
      [CONFIG_KEY]
    );

    if (configuredRows.length > 0) {
      await connection.rollback();
      return null;
    }

    await connection.execute(
      'INSERT INTO app_configuration (`key`, `value`) VALUES (?, ?)',
      [CONFIG_KEY, 'in_progress']
    );

    const suffix = crypto.randomBytes(4).toString('hex');
    const email = `admin-${suffix}@trackfuel360.local`;
    const matricule = `ADM-${suffix.toUpperCase()}`;
    const password = crypto.randomBytes(14).toString('base64url');
    const passwordHash = await bcrypt.hash(password, 10);

    await connection.execute(
      `INSERT INTO users (email, matricule, nom, prenom, role, site_id, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [email, matricule, 'Administrateur', 'TrackFuel360', 'admin', null, passwordHash]
    );

    await connection.execute(
      'UPDATE app_configuration SET `value` = ? WHERE `key` = ?',
      ['true', CONFIG_KEY]
    );

    await connection.commit();

    return { email, password };
  } catch (error) {
    await connection.rollback();

    if (error?.code === 'ER_DUP_ENTRY') {
      return null;
    }

    throw error;
  } finally {
    connection.release();
  }
};

router.get('/', async (req, res, next) => {
  try {
    const credentials = await bootstrapAdmin();

    if (!credentials) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.status(201).json({
      status: 'configured',
      message: 'Compte administrateur cree. Ces identifiants ne seront plus affiches.',
      credentials,
    });
  } catch (error) {
    next(error);
  }
});

export { bootstrapAdmin };
export default router;
