import express from 'express';
import db from '../config/database.js';
import { CONFIGURATION_PRESETS, DEFAULT_ROLE_MODULES, MODULE_CATALOG, MVP_MODULE_CODES } from '../services/moduleCatalog.js';

const router = express.Router();

const fallbackModules = (role = 'admin') => {
  const roleModules = DEFAULT_ROLE_MODULES[role] || DEFAULT_ROLE_MODULES.admin;
  return MODULE_CATALOG.map(module => ({
    ...module,
    enabled: MVP_MODULE_CODES.includes(module.code),
    allowed: roleModules.includes(module.code),
  }));
};

router.get('/', async (req, res) => {
  const clientId = Number(req.query.client_id || 1);
  const role = req.query.role || 'admin';

  try {
    const [rows] = await db.execute(
      `SELECT m.code, m.label, m.phase,
              COALESCE(cm.enabled, m.enabled_by_default) AS enabled,
              COALESCE(rmp.can_view, 0) AS allowed,
              COALESCE(rmp.can_manage, 0) AS can_manage
       FROM modules m
       LEFT JOIN client_modules cm
         ON cm.module_code = m.code AND cm.client_id = ?
       LEFT JOIN role_module_permissions rmp
         ON rmp.module_code = m.code AND rmp.role = ?
       ORDER BY FIELD(m.phase, 'MVP', 'V2', 'V3'), m.label`,
      [clientId, role]
    );

    res.json(rows.map(row => ({
      code: row.code,
      label: row.label,
      phase: row.phase,
      enabled: Boolean(row.enabled),
      allowed: Boolean(row.allowed),
      can_manage: Boolean(row.can_manage),
    })));
  } catch (error) {
    res.json(fallbackModules(role));
  }
});

router.put('/:code', async (req, res, next) => {
  const clientId = Number(req.body.client_id || 1);
  const enabled = Boolean(req.body.enabled);
  const { code } = req.params;

  try {
    await db.execute(
      `INSERT INTO client_modules (client_id, module_code, enabled)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)`,
      [clientId, code, enabled]
    );

    res.json({ client_id: clientId, code, enabled });
  } catch (error) {
    next(error);
  }
});

router.post('/configuration/:configuration', async (req, res, next) => {
  const clientId = Number(req.body.client_id || 1);
  const { configuration } = req.params;
  const enabledModules = CONFIGURATION_PRESETS[configuration];

  if (!enabledModules) {
    return res.status(400).json({ error: 'Configuration inconnue' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(
      'UPDATE clients SET configuration = ? WHERE id = ?',
      [configuration, clientId]
    );

    for (const module of MODULE_CATALOG) {
      await connection.execute(
        `INSERT INTO client_modules (client_id, module_code, enabled)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)`,
        [clientId, module.code, enabledModules.includes(module.code)]
      );
    }

    await connection.commit();
    res.json({ client_id: clientId, configuration, enabled_modules: enabledModules });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

export default router;
