import express from 'express';
import db from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT om.*, v.immatriculation, CONCAT(u.prenom, ' ', u.nom) AS chauffeur
       FROM ordres_mission om
       LEFT JOIN vehicules v ON v.id = om.vehicule_id
       LEFT JOIN users u ON u.id = om.chauffeur_id
       ORDER BY om.date_depart DESC, om.id DESC`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  const {
    vehicule_id,
    chauffeur_id,
    destination,
    motif,
    date_depart,
    date_retour_prevue = null,
    kilometrage_depart = null,
  } = req.body;

  try {
    const [result] = await db.execute(
      `INSERT INTO ordres_mission
        (vehicule_id, chauffeur_id, destination, motif, date_depart, date_retour_prevue, kilometrage_depart)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [vehicule_id, chauffeur_id, destination, motif, date_depart, date_retour_prevue, kilometrage_depart]
    );
    const [rows] = await db.execute('SELECT * FROM ordres_mission WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  const { id } = req.params;
  const {
    statut,
    motif_rejet = null,
    kilometrage_retour = null,
    date_retour_reelle = null,
    rapport = null,
  } = req.body;

  try {
    await db.execute(
      `UPDATE ordres_mission
       SET statut = ?, motif_rejet = ?, kilometrage_retour = ?, date_retour_reelle = ?, rapport = ?
       WHERE id = ?`,
      [statut, motif_rejet, kilometrage_retour, date_retour_reelle, rapport, id]
    );

    const [rows] = await db.execute('SELECT * FROM ordres_mission WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
