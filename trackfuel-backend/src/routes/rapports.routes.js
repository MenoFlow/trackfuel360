import crypto from 'crypto';
import express from 'express';
import db from '../config/database.js';

const router = express.Router();
const MAX_HISTORY_LIMIT = 20;

const normalizeLimit = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 5;
  return Math.min(parsed, MAX_HISTORY_LIMIT);
};

const parseRapport = (row) => {
  const rapport = typeof row.rapport_json === 'string'
    ? JSON.parse(row.rapport_json)
    : row.rapport_json;

  return rapport;
};

router.post('/', async (req, res, next) => {
  try {
    const { rapport, format } = req.body;

    if (!rapport?.metadata?.id || !rapport?.metadata?.type || !rapport?.metadata?.titre) {
      return res.status(400).json({ error: 'Rapport invalide: metadata.id, type et titre sont requis' });
    }

    await db.execute(
      `INSERT INTO rapports_generes
        (id, type, titre, utilisateur_id, utilisateur_nom, format_prefere, rapport_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        type = VALUES(type),
        titre = VALUES(titre),
        utilisateur_id = VALUES(utilisateur_id),
        utilisateur_nom = VALUES(utilisateur_nom),
        format_prefere = VALUES(format_prefere),
        rapport_json = VALUES(rapport_json)`,
      [
        rapport.metadata.id,
        rapport.metadata.type,
        rapport.metadata.titre,
        rapport.metadata.utilisateur_id || null,
        rapport.metadata.utilisateur_nom || null,
        format || rapport.metadata.format || null,
        JSON.stringify(rapport),
      ]
    );

    res.status(201).json({ success: true, rapport });
  } catch (error) {
    next(error);
  }
});

router.get('/history', async (req, res, next) => {
  try {
    const limit = normalizeLimit(req.query.limit);
    const [rows] = await db.execute(
      `SELECT id, type, titre, utilisateur_id, utilisateur_nom, format_prefere, created_at
       FROM rapports_generes
       ORDER BY created_at DESC
       LIMIT ${limit}`
    );

    res.json(rows.map((row) => ({
      id: row.id,
      type: row.type,
      titre: row.titre,
      utilisateur_id: row.utilisateur_id,
      utilisateur_nom: row.utilisateur_nom,
      format: row.format_prefere,
      date_generation: row.created_at,
      nb_lignes: 0,
    })));
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      'SELECT rapport_json FROM rapports_generes WHERE id = ? LIMIT 1',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Rapport introuvable' });
    }

    res.json(parseRapport(rows[0]));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/share', async (req, res, next) => {
  try {
    const { format = 'pdf', expiration_minutes = 24 * 60 } = req.body;
    const [rows] = await db.execute('SELECT id FROM rapports_generes WHERE id = ? LIMIT 1', [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Rapport introuvable' });
    }

    const minutes = Math.min(Math.max(Number(expiration_minutes) || 60, 5), 7 * 24 * 60);
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

    await db.execute(
      `INSERT INTO rapport_share_tokens (token, rapport_id, format_export, expires_at)
       VALUES (?, ?, ?, ?)`,
      [token, req.params.id, format, expiresAt]
    );

    res.status(201).json({
      token,
      format,
      expires_at: expiresAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/share/:token', async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT s.format_export, s.expires_at, r.rapport_json
       FROM rapport_share_tokens s
       JOIN rapports_generes r ON r.id = s.rapport_id
       WHERE s.token = ?
       LIMIT 1`,
      [req.params.token]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Lien introuvable' });
    }

    const row = rows[0];
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return res.status(410).json({ error: 'Lien expire' });
    }

    res.json({
      rapport: parseRapport(row),
      format: row.format_export,
      expires_at: new Date(row.expires_at).toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
