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

const allowedTransitions = {
  demande: ['validee', 'rejetee'],
  validee: ['en_cours', 'rejetee'],
  en_cours: ['terminee'],
  rejetee: [],
  terminee: [],
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
    return res.status(400).json({ error: 'Véhicule, conducteur, destination, motif, date de départ et date retour prévue sont requis' });
  }

  if (new Date(date_retour_prevue) <= new Date(date_depart)) {
    return res.status(400).json({ error: 'La date retour prévue doit être après la date de départ' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const unavailability = await getVehicleUnavailability(connection, vehicule_id);
    if (unavailability) {
      await connection.rollback();
      return res.status(unavailability.code === 'VEHICLE_NOT_FOUND' ? 400 : 409).json(buildVehicleUnavailableResponse(unavailability));
    }

    const driverEligibility = await getDriverEligibility(connection, chauffeur_id);
    if (driverEligibility) {
      await connection.rollback();
      return res.status(driverEligibility.code === 'DRIVER_NOT_FOUND' ? 400 : 409).json(buildDriverIneligibleResponse(driverEligibility));
    }

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

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [missionRows] = await connection.execute(
      'SELECT * FROM ordres_mission WHERE id = ? FOR UPDATE',
      [id]
    );

    if (!missionRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Mission introuvable' });
    }

    const mission = missionRows[0];
    const nextAllowed = allowedTransitions[mission.statut] || [];
    if (!nextAllowed.includes(statut)) {
      await connection.rollback();
      return res.status(409).json({
        error: 'Transition de mission non autorisée',
        code: 'MISSION_STATUS_TRANSITION_INVALID',
        statut_actuel: mission.statut,
        statut_demande: statut,
        transitions_autorisees: nextAllowed,
      });
    }

    if (statut === 'rejetee' && !motif_rejet) {
      await connection.rollback();
      return res.status(400).json({ error: 'La justification du refus est requise' });
    }

    if (statut === 'validee') {
      const unavailability = await getVehicleUnavailability(connection, mission.vehicule_id);
      if (unavailability) {
        await connection.rollback();
        return res.status(unavailability.code === 'VEHICLE_NOT_FOUND' ? 400 : 409).json(buildVehicleUnavailableResponse(unavailability));
      }

      const driverEligibility = await getDriverEligibility(connection, mission.chauffeur_id);
      if (driverEligibility) {
        await connection.rollback();
        return res.status(driverEligibility.code === 'DRIVER_NOT_FOUND' ? 400 : 409).json(buildDriverIneligibleResponse(driverEligibility));
      }

      const availability = await getAvailabilityConflicts(connection, {
        chauffeurId: mission.chauffeur_id,
        vehiculeId: mission.vehicule_id,
        start: mission.date_depart,
        end: mission.date_retour_prevue,
        excludeMissionId: id,
      });

      if (availability.hasConflict) {
        await connection.rollback();
        return res.status(409).json({
          ...buildConflictResponse(availability),
          code: 'MISSION_ACCEPTANCE_RECHECK_FAILED',
          message: 'La disponibilité a changé depuis la demande. La mission doit être replanifiée.',
        });
      }

      await connection.execute('DELETE FROM affectations WHERE mission_id = ?', [id]);
      await connection.execute(
        `INSERT INTO affectations
          (vehicule_id, chauffeur_id, date_debut, date_fin, mission_id, source)
         VALUES (?, ?, ?, ?, ?, 'mission')`,
        [
          mission.vehicule_id,
          mission.chauffeur_id,
          toMysqlDateTime(mission.date_depart),
          toMysqlDateTime(mission.date_retour_prevue),
          id,
        ]
      );
    }

    if (statut === 'terminee') {
      if (!date_retour_reelle || kilometrage_retour === null || kilometrage_retour === undefined) {
        await connection.rollback();
        return res.status(400).json({
          error: 'La date retour réelle et le kilométrage retour sont requis pour terminer la mission',
        });
      }

      if (mission.kilometrage_depart !== null && Number(kilometrage_retour) < Number(mission.kilometrage_depart)) {
        await connection.rollback();
        return res.status(400).json({
          error: 'Le kilométrage retour doit être supérieur ou égal au kilométrage départ',
          code: 'ODOMETER_INVALID',
          kilometrage_depart: mission.kilometrage_depart,
        });
      }
    }

    if (statut === 'rejetee') {
      await connection.execute('DELETE FROM affectations WHERE mission_id = ?', [id]);
    }

    await connection.execute(
      `UPDATE ordres_mission
       SET statut = ?, motif_rejet = ?, kilometrage_retour = ?, date_retour_reelle = ?, rapport = ?
       WHERE id = ?`,
      [
        statut,
        statut === 'rejetee' ? motif_rejet : null,
        statut === 'terminee' ? kilometrage_retour : mission.kilometrage_retour,
        statut === 'terminee' ? toMysqlDateTime(date_retour_reelle) : mission.date_retour_reelle,
        rapport ?? mission.rapport,
        id,
      ]
    );

    const updatedMission = await getMissionById(connection, id);
    await connection.commit();
    res.json(updatedMission);
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

router.delete('/:id', async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const { id } = req.params;
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      'SELECT id, statut FROM ordres_mission WHERE id = ? FOR UPDATE',
      [id]
    );

    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Mission introuvable' });
    }

    if (rows[0].statut === 'en_cours') {
      await connection.rollback();
      return res.status(409).json({
        error: 'Impossible de supprimer une mission en cours. Terminez-la ou rejetez-la selon le processus.',
        code: 'DELETE_HAS_IMPACTS',
      });
    }

    await connection.execute('DELETE FROM affectations WHERE mission_id = ?', [id]);
    await connection.execute('DELETE FROM vehicle_reservations WHERE mission_id = ?', [id]);
    await connection.execute('DELETE FROM ordres_mission WHERE id = ?', [id]);

    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

export default router;
