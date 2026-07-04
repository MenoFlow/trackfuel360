import express from 'express';
import db from '../config/database.js';
import {
  buildConflictResponse,
  buildDriverIneligibleResponse,
  buildVehicleUnavailableResponse,
  getAvailabilityConflicts,
  getDriverEligibility,
  getVehicleUnavailability,
  toMysqlDateTime,
} from '../services/availabilityService.js';

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
    const unavailability = await getVehicleUnavailability(db, vehicule_id);
    if (unavailability) {
      return res.status(unavailability.code === 'VEHICLE_NOT_FOUND' ? 400 : 409).json(buildVehicleUnavailableResponse(unavailability));
    }

    if (chauffeur_id) {
      const driverEligibility = await getDriverEligibility(db, chauffeur_id);
      if (driverEligibility) {
        return res.status(driverEligibility.code === 'DRIVER_NOT_FOUND' ? 400 : 409).json(buildDriverIneligibleResponse(driverEligibility));
      }
    }

    if (mission_id) {
      const [missions] = await db.execute(
        `SELECT id, vehicule_id, chauffeur_id, date_depart, date_retour_prevue
         FROM ordres_mission
         WHERE id = ?`,
        [mission_id]
      );

      if (!missions.length) {
        return res.status(400).json({ error: 'Mission introuvable' });
      }

      const mission = missions[0];
      if (
        Number(mission.vehicule_id) !== Number(vehicule_id) ||
        (chauffeur_id && Number(mission.chauffeur_id) !== Number(chauffeur_id)) ||
        new Date(date_debut) < new Date(mission.date_depart) ||
        new Date(date_fin) > new Date(mission.date_retour_prevue)
      ) {
        return res.status(400).json({
          error: 'La réservation doit correspondre au véhicule, au conducteur et à la période de la mission.',
          code: 'MISSION_RESERVATION_SCOPE_INVALID',
        });
      }
    }

    const availability = await getAvailabilityConflicts(db, {
      chauffeurId: chauffeur_id,
      vehiculeId: vehicule_id,
      start: date_debut,
      end: date_fin,
      excludeMissionId: mission_id,
    });

    if (availability.hasConflict) {
      return res.status(409).json(buildConflictResponse(availability));
    }

    const [result] = await db.execute(
      `INSERT INTO vehicle_reservations
        (vehicule_id, chauffeur_id, mission_id, motif, date_debut, date_fin, statut, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [vehicule_id, chauffeur_id, mission_id, motif, toMysqlDateTime(date_debut), toMysqlDateTime(date_fin), statut, notes]
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
