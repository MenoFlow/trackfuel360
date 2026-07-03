import express from 'express';
import db from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT r.*, v.immatriculation, CONCAT(u.prenom, ' ', u.nom) AS chauffeur
       FROM vehicle_reservations r
       LEFT JOIN vehicules v ON v.id = r.vehicule_id
       LEFT JOIN users u ON u.id = r.chauffeur_id
       ORDER BY r.date_debut ASC, r.id DESC`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  const {
    vehicule_id,
    chauffeur_id = null,
    mission_id = null,
    motif,
    date_debut,
    date_fin,
    statut = 'demandee',
    notes = null,
  } = req.body;

  if (!vehicule_id || !motif || !date_debut || !date_fin) {
    return res.status(400).json({ error: 'vehicule_id, motif, date_debut et date_fin sont requis' });
  }

  if (new Date(date_debut) >= new Date(date_fin)) {
    return res.status(400).json({ error: 'La date de fin doit etre apres la date de debut' });
  }

  try {
    const [conflicts] = await db.execute(
      `SELECT id
       FROM vehicle_reservations
       WHERE vehicule_id = ?
         AND statut IN ('demandee', 'confirmee')
         AND date_debut < ?
         AND date_fin > ?
       LIMIT 1`,
      [vehicule_id, date_fin, date_debut]
    );

    if (conflicts.length > 0) {
      return res.status(409).json({ error: 'Vehicule deja reserve sur cette periode' });
    }

    const [result] = await db.execute(
      `INSERT INTO vehicle_reservations
        (vehicule_id, chauffeur_id, mission_id, motif, date_debut, date_fin, statut, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [vehicule_id, chauffeur_id, mission_id, motif, date_debut, date_fin, statut, notes]
    );

    const [rows] = await db.execute('SELECT * FROM vehicle_reservations WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    await db.execute(
      'UPDATE vehicle_reservations SET statut = ? WHERE id = ?',
      [req.body.statut, req.params.id]
    );
    const [rows] = await db.execute('SELECT * FROM vehicle_reservations WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
