import express from 'express';
import db from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT b.*, s.nom AS site, v.immatriculation,
              (b.montant_reel - b.montant_prevu) AS ecart,
              CASE
                WHEN b.montant_prevu = 0 THEN NULL
                ELSE ROUND((b.montant_reel / b.montant_prevu) * 100, 2)
              END AS taux_execution
       FROM budgets_couts b
       LEFT JOIN sites s ON s.id = b.site_id
       LEFT JOIN vehicules v ON v.id = b.vehicule_id
       ORDER BY b.periode_debut DESC, b.id DESC`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  const {
    module_type = 'global',
    scope_type = 'global',
    site_id = null,
    vehicule_id = null,
    direction = null,
    libelle,
    periode_debut,
    periode_fin,
    montant_prevu = 0,
    montant_reel = 0,
  } = req.body;

  if (!libelle || !periode_debut || !periode_fin) {
    return res.status(400).json({ error: 'libelle, periode_debut et periode_fin sont requis' });
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO budgets_couts
        (module_type, scope_type, site_id, vehicule_id, direction, libelle, periode_debut, periode_fin, montant_prevu, montant_reel)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [module_type, scope_type, site_id, vehicule_id, direction, libelle, periode_debut, periode_fin, montant_prevu, montant_reel]
    );

    const [rows] = await db.execute('SELECT * FROM budgets_couts WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  const allowedFields = ['montant_prevu', 'montant_reel', 'libelle', 'periode_debut', 'periode_fin'];
  const fields = allowedFields.filter(field => Object.prototype.hasOwnProperty.call(req.body, field));

  if (fields.length === 0) {
    return res.status(400).json({ error: 'Aucun champ valide a mettre a jour' });
  }

  try {
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => req.body[field]);
    await db.execute(`UPDATE budgets_couts SET ${setClause} WHERE id = ?`, [...values, req.params.id]);

    const [rows] = await db.execute('SELECT * FROM budgets_couts WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
