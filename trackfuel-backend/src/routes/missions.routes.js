import express from 'express';
import db from '../config/database.js';
import { buildConflictResponse, getAvailabilityConflicts, toMysqlDateTime } from '../services/availabilityService.js';

const router = express.Router();

const getMissionById = async (connection, id) => {
  const [rows] = await connection.execute(
    `SELECT om.*, v.immatriculation, CONCAT(u.prenom, ' ', u.nom) AS chauffeur
     FROM ordres_mission om
     LEFT JOIN vehicules v ON v.id = om.vehicule_id
     LEFT JOIN users u ON u.id = om.chauffeur_id
     WHERE om.id = ?`,
    [id]
  );
  return rows[0];
};

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

  if (!vehicule_id || !chauffeur_id || !destination || !motif || !date_depart || !date_retour_prevue) {
    return res.status(400).json({ error: 'Véhicule, chauffeur, destination, motif, date de départ et date retour prévue sont requis' });
  }

  if (new Date(date_retour_prevue) <= new Date(date_depart)) {
    return res.status(400).json({ error: 'La date retour prévue doit être après la date de départ' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const availability = await getAvailabilityConflicts(connection, {
      chauffeurId: chauffeur_id,
      vehiculeId: vehicule_id,
      start: date_depart,
      end: date_retour_prevue,
    });

    if (availability.hasConflict) {
      await connection.rollback();
      return res.status(409).json(buildConflictResponse(availability));
    }

    const [result] = await connection.execute(
      `INSERT INTO ordres_mission
        (vehicule_id, chauffeur_id, destination, motif, date_depart, date_retour_prevue, kilometrage_depart)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        vehicule_id,
        chauffeur_id,
        destination,
        motif,
        toMysqlDateTime(date_depart),
        toMysqlDateTime(date_retour_prevue),
        kilometrage_depart,
      ]
    );

    await connection.execute(
      `INSERT INTO affectations
        (vehicule_id, chauffeur_id, date_debut, date_fin, mission_id, source)
       VALUES (?, ?, ?, ?, ?, 'mission')`,
      [
        vehicule_id,
        chauffeur_id,
        toMysqlDateTime(date_depart),
        toMysqlDateTime(date_retour_prevue),
        result.insertId,
      ]
    );

    const mission = await getMissionById(connection, result.insertId);
    await connection.commit();
    res.status(201).json(mission);
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
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
    if (statut === 'rejetee' && !motif_rejet) {
      return res.status(400).json({ error: 'La justification du refus est requise' });
    }

    await db.execute(
      `UPDATE ordres_mission
       SET statut = ?, motif_rejet = ?, kilometrage_retour = ?, date_retour_reelle = ?, rapport = ?
       WHERE id = ?`,
      [statut, motif_rejet, kilometrage_retour, date_retour_reelle, rapport, id]
    );

    if (statut === 'rejetee') {
      await db.execute('DELETE FROM affectations WHERE mission_id = ?', [id]);
    }

    const mission = await getMissionById(db, id);
    res.json(mission);
  } catch (error) {
    next(error);
  }
});

export default router;
