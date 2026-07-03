import express from 'express';
import db from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT m.*, v.immatriculation
       FROM maintenance_interventions m
       LEFT JOIN vehicules v ON v.id = m.vehicule_id
       ORDER BY m.date_prevue ASC, m.id DESC`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  const {
    vehicule_id,
    type,
    description,
    date_prevue = null,
    kilometrage_prevu = null,
    date_realisation = null,
    cout = 0,
    prestataire = null,
    statut = 'planifie',
  } = req.body;

  try {
    const [result] = await db.execute(
      `INSERT INTO maintenance_interventions
        (vehicule_id, type, description, date_prevue, kilometrage_prevu, date_realisation, cout, prestataire, statut)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [vehicule_id, type, description, date_prevue, kilometrage_prevu, date_realisation, cout, prestataire, statut]
    );

    const [rows] = await db.execute('SELECT * FROM maintenance_interventions WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    await db.execute(
      'UPDATE maintenance_interventions SET statut = ?, date_realisation = COALESCE(?, date_realisation) WHERE id = ?',
      [req.body.statut, req.body.date_realisation || null, req.params.id]
    );
    const [rows] = await db.execute('SELECT * FROM maintenance_interventions WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
