import express from 'express';
const router = express.Router();
import db from '../config/database.js';
import { createAffectationSchema, updateAffectationSchema } from '../validators/affectation.validator.js';

// GET /api/affectations
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.execute(`
      SELECT * FROM affectations
      ORDER BY date_debut DESC
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/affectations/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute('SELECT * FROM affectations WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Affectation non trouvée' });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

// POST /api/affectations
router.post('/', async (req, res, next) => {
  try {
    const data = await createAffectationSchema.validateAsync(req.body);

    const [result] = await db.execute(`
      INSERT INTO affectations (vehicule_id, chauffeur_id, date_debut, date_fin)
      VALUES (?, ?, ?, ?)
    `, [data.vehicule_id, data.chauffeur_id, data.date_debut, data.date_fin]);

    const [newRow] = await db.execute('SELECT * FROM affectations WHERE id = ?', [result.insertId]);
    res.status(201).json(newRow[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/affectations/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await updateAffectationSchema.validateAsync(req.body);

    const [existing] = await db.execute('SELECT id FROM affectations WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Affectation non trouvée' });
    }

    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map(f => `${f} = ?`).join(', ');

    await db.execute(`UPDATE affectations SET ${setClause} WHERE id = ?`, [...values, id]);

    const [updated] = await db.execute('SELECT * FROM affectations WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/affectations/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db.execute('SELECT id FROM affectations WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Affectation non trouvée' });
    }

    await db.execute('DELETE FROM affectations WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
