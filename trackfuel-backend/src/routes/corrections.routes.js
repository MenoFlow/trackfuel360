/**
 * Routes API – Corrections
 * Base URL : /api/corrections
 */

import express from 'express';
const router = express.Router();
import db from '../config/database.js';

import {
  createCorrectionSchema,
  validateCorrectionSchema,
  rejectCorrectionSchema,
} from '../validators/correction.validator.js';

/* -------------------------------------------------------------------------- */
/*                               HELPERS                                      */
/* -------------------------------------------------------------------------- */
const nowMysql = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

/* -------------------------------------------------------------------------- */
/*  GET /api/corrections  – Liste (filtres optionnels)                        */
/* -------------------------------------------------------------------------- */
router.get('/', async (req, res, next) => {
  try {
    const { status, requested_by, table } = req.query;

    let sql = `SELECT c.*, u.nom AS validator_name
               FROM corrections c
               LEFT JOIN users u ON c.validated_by = u.id`;
    const params = [];
    const where = [];

    if (status) {
      where.push('c.status = ?');
      params.push(status);
    }
    if (requested_by) {
      where.push('c.requested_by = ?');
      params.push(requested_by);
    }
    if (table) {
      where.push('c.\`table\` = ?');
      params.push(table);
    }

    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY c.requested_at DESC';

    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------- */
/*  GET /api/corrections/:id  – Détail                                        */
/* -------------------------------------------------------------------------- */
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT c.*, u.nom AS validator_name
       FROM corrections c
       LEFT JOIN users u ON c.validated_by = u.id
       WHERE c.id = ?`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Correction non trouvée' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------- */
/*  POST /api/corrections  – Créer une demande                               */
/* -------------------------------------------------------------------------- */
router.post('/', async (req, res, next) => {
  try {
    const data = await createCorrectionSchema.validateAsync(req.body);

    // 1. Vérifier que l’enregistrement cible existe
    const [exists] = await db.execute(
      `SELECT 1 FROM \`${data.table}\` WHERE id = ? LIMIT 1`,
      [data.record_id]
    );
    if (!exists.length) {
      return res.status(404).json({
        error: `Enregistrement introuvable dans ${data.table} (id=${data.record_id})`,
      });
    }

    // 2. Insertion
    const [result] = await db.execute(
      `INSERT INTO corrections
         (\`table\`, record_id, champ, old_value, new_value,
          comment, requested_by, requested_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        data.table,
        data.record_id,
        data.champ,
        JSON.stringify(data.old_value),
        JSON.stringify(data.new_value),
        data.comment ?? null,
        data.requested_by,
        data.requested_at ?? nowMysql(),
      ]
    );

    // 3. Retourner l’objet créé (avec le nom du validateur éventuel)
    const [rows] = await db.execute(
      `SELECT c.*, NULL AS validator_name
       FROM corrections c
       WHERE c.id = ?`,
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------- */
/*  PATCH /api/corrections/:id/validate  – Valider                           */
/* -------------------------------------------------------------------------- */
router.patch('/:id/validate', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { validated_by } = await validateCorrectionSchema.validateAsync(req.body);

    // 1. Récupérer la correction (pending uniquement)
    const [rows] = await db.execute(
      `SELECT * FROM corrections WHERE id = ? AND status = 'pending' FOR UPDATE`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ 
        error: 'Correction non trouvée ou déjà traitée' 
      });
    }
    const corr = rows[0];

    // 2. Parser la nouvelle valeur
    let newVal;
    try {
      newVal = JSON.parse(corr.new_value);
    } catch {
      newVal = corr.new_value;
    }

    // CORRIGÉ : ?? → backticks + ? simple
    const [upd] = await db.execute(
      `UPDATE \`${corr.table}\` 
       SET \`${corr.champ}\` = ? 
       WHERE id = ?`,
      [newVal, corr.record_id]
    );

    if (upd.affectedRows === 0) {
      return res.status(400).json({ 
        error: `Aucun enregistrement mis à jour dans la table \`${corr.table}\`` 
      });
    }

    // 3. Valider la correction
    const now = nowMysql();
    await db.execute(
      `UPDATE corrections
       SET status = 'validated',
           validated_by = ?,
           validated_at = ?
       WHERE id = ?`,
      [validated_by, now, id]
    );

    // 4. Retourner la correction avec le nom du validateur
    const [final] = await db.execute(
      `SELECT c.*, u.nom AS validator_name
       FROM corrections c
       LEFT JOIN users u ON c.validated_by = u.id
       WHERE c.id = ?`,
      [id]
    );

    res.json(final[0]);

  } catch (err) {
    // Erreurs Joi → message clair
    if (err.isJoi) {
      return res.status(400).json({ 
        error: 'Données invalides', 
        details: err.details[0].message 
      });
    }
    next(err);
  }
});

/* -------------------------------------------------------------------------- */
/*  PATCH /api/corrections/:id/reject  – Rejeter                             */
/* -------------------------------------------------------------------------- */
router.patch('/:id/reject', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { validated_by, rejection_reason } =
      await rejectCorrectionSchema.validateAsync(req.body);

    const [rows] = await db.execute(
      `SELECT * FROM corrections WHERE id = ? AND status = 'pending' FOR UPDATE`,
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Correction non trouvée ou déjà traitée' });
    }

    const reason = rejection_reason?.trim()
      ? rejection_reason.trim()
      : 'Rejetée sans motif précisé';

    const now = nowMysql();

    await db.execute(
      `UPDATE corrections
         SET status = 'rejected',
             validated_by = ?,
             validated_at = ?,
             comment = CONCAT(IFNULL(comment,''), '\n[REJET] ', ?)
       WHERE id = ?`,
      [validated_by, now, reason, id]
    );

    const [final] = await db.execute(
      `SELECT c.*, u.nom AS validator_name
       FROM corrections c
       LEFT JOIN users u ON c.validated_by = u.id
       WHERE c.id = ?`,
      [id]
    );
    res.json(final[0]);
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------- */
/*  DELETE /api/corrections/:id  – Supprimer (seulement pending)             */
/* -------------------------------------------------------------------------- */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute(
      `SELECT id FROM corrections WHERE id = ? AND status = 'pending'`,
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Correction non trouvée ou déjà traitée' });
    }

    await db.execute(`DELETE FROM corrections WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;