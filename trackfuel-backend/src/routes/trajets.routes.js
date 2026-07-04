import express from 'express';
const router = express.Router();
import db from '../config/database.js';
import { createTripSchema, updateTripSchema } from '../validators/trajet.validator.js';
import {
  buildAssignmentCoverageResponse,
  buildConflictResponse,
  buildDriverIneligibleResponse,
  buildVehicleUnavailableResponse,
  getAssignmentCoverage,
  getAvailabilityConflicts,
  getDriverEligibility,
  getVehicleUnavailability,
  toMysqlDateTime,
} from '../services/availabilityService.js';

const getFuelContext = async (connection, vehiculeId, beforeDate, excludeTripId = null) => {
  let excludeSql = '';
  const params = [vehiculeId, toMysqlDateTime(beforeDate)];
  if (excludeTripId) {
    excludeSql = 'AND (trajet_id IS NULL OR trajet_id <> ?)';
    params.push(String(excludeTripId));
  }

  const [niveauRow] = await connection.execute(`
    SELECT niveau, timestamp
    FROM niveaux_carburant
    WHERE vehicule_id = ?
      AND timestamp <= ?
      ${excludeSql}
    ORDER BY timestamp DESC
    LIMIT 1
  `, params);

  return niveauRow[0] || null;
};

/**
 * GET /trips
 * Fetch all trips, optionally filtered by vehicule_id
 * Query params: ?vehicule_id=CGO-123-AA
 */
router.get('/', async (req, res) => {
  try {
    const { vehicule_id } = req.query;
    let sql = 'SELECT * FROM trips';
    const params = [];

    if (vehicule_id) {
      sql += ' WHERE vehicule_id = ?';
      params.push(vehicule_id);
    }

    sql += ' ORDER BY date_debut DESC';
    const [trips] = await db.execute(sql, params);

    // Pour chaque trip, on ajoute ses points GPS
    for (const trip of trips) {
      const [points] = await db.execute(
        'SELECT id, sequence, latitude, longitude, timestamp FROM traceGps WHERE trajet_id = ? ORDER BY sequence ASC',
        [trip.id]
      );
      trip.traceGps = points;
    }

    res.json(trips);
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({
      error: 'Failed to fetch trips',
      message: error.message
    });
  }
});

/**
 * GET /trips/:id
 * Fetch a single trip by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [trips] = await db.execute('SELECT * FROM trips WHERE id = ?', [id]);
    if (trips.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const trip = trips[0];

    const [gpsPoints] = await db.execute(
      'SELECT id, sequence, latitude, longitude, timestamp FROM traceGps WHERE trajet_id = ? ORDER BY sequence ASC',
      [id]
    );
    trip.traceGps = gpsPoints;

    res.json(trip);
  } catch (error) {
    console.error('Error fetching trip:', error);
    res.status(500).json({
      error: 'Failed to fetch trip',
      message: error.message
    });
  }
});

router.post('/', async (req, res) => {
  let connection = null;
  try {
    const {
      vehicule_id,
      chauffeur_id,
      date_debut,
      date_fin,
      distance_km,
      type_saisie = 'manuelle',
      traceGps = []
    } = await createTripSchema.validateAsync(req.body);

    // Vérification véhicule et chauffeur
    const [veh] = await db.execute(`
      SELECT id, capacite_reservoir, consommation_nominale 
      FROM vehicules 
      WHERE id = ?
    `, [vehicule_id]);
    if (!veh.length) return res.status(400).json({ error: 'Véhicule introuvable' });

    const unavailability = await getVehicleUnavailability(db, vehicule_id);
    if (unavailability) {
      return res.status(unavailability.code === 'VEHICLE_NOT_FOUND' ? 400 : 409).json(buildVehicleUnavailableResponse(unavailability));
    }

    const driverEligibility = await getDriverEligibility(db, chauffeur_id);
    if (driverEligibility) {
      return res.status(driverEligibility.code === 'DRIVER_NOT_FOUND' ? 400 : 409).json(buildDriverIneligibleResponse(driverEligibility));
    }

    const coverage = await getAssignmentCoverage(db, {
      chauffeurId: chauffeur_id,
      vehiculeId: vehicule_id,
      start: date_debut,
      end: date_fin,
    });
    if (coverage) {
      return res.status(409).json(buildAssignmentCoverageResponse(coverage));
    }

    const availability = await getAvailabilityConflicts(db, {
      chauffeurId: chauffeur_id,
      vehiculeId: vehicule_id,
      start: date_debut,
      end: date_fin,
      includeAffectations: false,
      includeMissions: false,
      includeReservations: false,
    });
    if (availability.hasConflict) {
      return res.status(409).json(buildConflictResponse(availability));
    }

    const capacite = parseFloat(veh[0].capacite_reservoir) || 60;
    const consoNominale = parseFloat(veh[0].consommation_nominale) || 8;

    // Récupérer le dernier niveau de carburant connu avant le début du trajet
    const niveauRow = await getFuelContext(db, vehicule_id, date_debut);

    const niveauDernier = niveauRow
      ? parseFloat(niveauRow.niveau)
      : capacite * 0.6; // Valeur par défaut si aucune donnée existante

    // Calcul de la consommation estimée pour ce trajet
    const consoEstimee = (distance_km * consoNominale) / 100;

    // Vérification: consommation ne doit pas excéder le niveau de carburant actuel
    if (consoEstimee > niveauDernier) {
      const distancePossible = (niveauDernier / consoNominale) * 100;
      return res.status(400).json({
        error: `Carburant insuffisant pour ce trajet.`,
        details: {
          niveau_actuel: `${niveauDernier.toFixed(1)} L`,
          consommation_estimee: `${consoEstimee.toFixed(1)} L`,
          distance_possible: `${distancePossible.toFixed(1)} km`
        }
      });
    }

    // --- Transaction de création du trajet ---
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Création du trajet
    const [tripResult] = await connection.execute(`
      INSERT INTO trips 
        (vehicule_id, chauffeur_id, date_debut, date_fin, distance_km, type_saisie)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [vehicule_id, chauffeur_id, toMysqlDateTime(date_debut), toMysqlDateTime(date_fin), distance_km, type_saisie]);

    const tripId = tripResult.insertId;

    // 2. Niveau avant trajet (le dernier connu)
    const niveauAvant = niveauDernier;

    await connection.execute(`
      INSERT INTO niveaux_carburant 
        (vehicule_id, timestamp, niveau, type, trajet_id)
      VALUES (?, ?, ?, 'avant_trajet', ?)
    `, [vehicule_id, date_debut, niveauAvant, tripId]);

    // 3. Calcul niveau après trajet
    const niveauApres = Math.max(niveauAvant - consoEstimee, 0);

    await connection.execute(`
      INSERT INTO niveaux_carburant 
        (vehicule_id, timestamp, niveau, type, trajet_id)
      VALUES (?, ?, ?, 'apres_trajet', ?)
    `, [vehicule_id, date_fin, niveauApres, tripId]);

    // 4. GPS
    if (traceGps.length > 0) {
      const values = traceGps.map((p) => [tripId, p.sequence, p.latitude, p.longitude, p.timestamp]);
      await connection.query(`
        INSERT INTO traceGps (trajet_id, sequence, latitude, longitude, timestamp)
        VALUES ?
      `, [values]);
    }

    // 5. Détection vol (baisse anormale)
    const chuteReelle = niveauAvant - niveauApres;
    const volDetecte = chuteReelle > consoEstimee + 5;

    const [createdRows] = await connection.execute('SELECT * FROM trips WHERE id = ?', [tripId]);
    await connection.commit();

    res.status(201).json({
      ...createdRows[0],
      conso_estimee: `${consoEstimee.toFixed(1)} L`,
      niveau_avant: `${niveauAvant.toFixed(1)} L`,
      niveau_apres: `${niveauApres.toFixed(1)} L`,
      vol_detecte: volDetecte,
      traceGps,
    });

  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (e) {}
    }
    console.error('Erreur trajet:', error);
    res.status(500).json({ error: 'Échec création trajet', details: error.message });
  } finally {
    if (connection) connection.release();
  }
});


/**
 * PUT /trips/:id
 * Update an existing trip
 */
router.put('/:id', async (req, res) => {
  let connection = null;
  try {
    const { id } = req.params;
    const updateData = await updateTripSchema.validateAsync(req.body);

    const [existing] = await db.execute('SELECT * FROM trips WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    const nextData = { ...existing[0], ...updateData };
    if (new Date(nextData.date_fin) <= new Date(nextData.date_debut)) {
      return res.status(400).json({ error: 'La date de fin doit être après la date de début' });
    }

    const [veh] = await db.execute(
      'SELECT id, capacite_reservoir, consommation_nominale FROM vehicules WHERE id = ?',
      [nextData.vehicule_id]
    );
    if (!veh.length) return res.status(400).json({ error: 'Véhicule introuvable' });

    const unavailability = await getVehicleUnavailability(db, nextData.vehicule_id);
    if (unavailability) {
      return res.status(unavailability.code === 'VEHICLE_NOT_FOUND' ? 400 : 409).json(buildVehicleUnavailableResponse(unavailability));
    }

    const driverEligibility = await getDriverEligibility(db, nextData.chauffeur_id);
    if (driverEligibility) {
      return res.status(driverEligibility.code === 'DRIVER_NOT_FOUND' ? 400 : 409).json(buildDriverIneligibleResponse(driverEligibility));
    }

    const coverage = await getAssignmentCoverage(db, {
      chauffeurId: nextData.chauffeur_id,
      vehiculeId: nextData.vehicule_id,
      start: nextData.date_debut,
      end: nextData.date_fin,
    });
    if (coverage) {
      return res.status(409).json(buildAssignmentCoverageResponse(coverage));
    }

    const availability = await getAvailabilityConflicts(db, {
      chauffeurId: nextData.chauffeur_id,
      vehiculeId: nextData.vehicule_id,
      start: nextData.date_debut,
      end: nextData.date_fin,
      excludeTripId: id,
      includeAffectations: false,
      includeMissions: false,
      includeReservations: false,
    });
    if (availability.hasConflict) {
      return res.status(409).json(buildConflictResponse(availability));
    }

    const capacite = parseFloat(veh[0].capacite_reservoir) || 60;
    const consoNominale = parseFloat(veh[0].consommation_nominale) || 8;
    const previousLevel = await getFuelContext(db, nextData.vehicule_id, nextData.date_debut, id);
    const niveauAvant = previousLevel ? parseFloat(previousLevel.niveau) : capacite * 0.6;
    const consoEstimee = (Number(nextData.distance_km) * consoNominale) / 100;

    if (consoEstimee > niveauAvant) {
      const distancePossible = (niveauAvant / consoNominale) * 100;
      return res.status(400).json({
        error: 'Carburant insuffisant pour ce trajet.',
        code: 'INSUFFICIENT_FUEL',
        details: {
          niveau_actuel: `${niveauAvant.toFixed(1)} L`,
          consommation_estimee: `${consoEstimee.toFixed(1)} L`,
          distance_possible: `${distancePossible.toFixed(1)} km`,
        },
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const sql = `
      UPDATE trips 
      SET vehicule_id = ?, chauffeur_id = ?, date_debut = ?, date_fin = ?, 
          distance_km = ?, type_saisie = ?
      WHERE id = ?
    `;
    await connection.execute(sql, [
      nextData.vehicule_id,
      nextData.chauffeur_id,
      toMysqlDateTime(nextData.date_debut),
      toMysqlDateTime(nextData.date_fin),
      nextData.distance_km,
      nextData.type_saisie,
      id
    ]);

    await connection.execute('DELETE FROM niveaux_carburant WHERE trajet_id = ?', [id]);
    const niveauApres = Math.max(niveauAvant - consoEstimee, 0);
    await connection.execute(`
      INSERT INTO niveaux_carburant 
        (vehicule_id, timestamp, niveau, type, trajet_id)
      VALUES
        (?, ?, ?, 'avant_trajet', ?),
        (?, ?, ?, 'apres_trajet', ?)
    `, [
      nextData.vehicule_id, toMysqlDateTime(nextData.date_debut), niveauAvant, id,
      nextData.vehicule_id, toMysqlDateTime(nextData.date_fin), niveauApres, id,
    ]);

    // Supprimer anciens points GPS et réinsérer si fournis
    await connection.execute('DELETE FROM traceGps WHERE trajet_id = ?', [id]);
    const traceGps = updateData.traceGps || [];
    if (traceGps.length > 0) {
      const gpsSql = `
        INSERT INTO traceGps (trajet_id, sequence, latitude, longitude, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `;
      for (let i = 0; i < traceGps.length; i++) {
        const p = traceGps[i];
        await connection.execute(gpsSql, [
          
          id,
          i + 1,
          p.latitude,
          p.longitude,
          p.timestamp
        ]);
      }
    }

    const [updatedRows] = await connection.execute('SELECT * FROM trips WHERE id = ?', [id]);
    await connection.commit();
    res.json(updatedRows[0]);
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (e) {}
    }
    console.error('Error updating trip:', error);
    const status = error.isJoi ? 400 : 500;
    res.status(status).json({
      error: 'Failed to update trip',
      message: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

/**
 * DELETE /trips/:id
 * Delete a trip by ID (and its GPS points)
 */
router.delete('/:id', async (req, res) => {
  let connection = null;
  try {
    const { id } = req.params;
    const [existing] = await db.execute('SELECT id FROM trips WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();
    await connection.execute('DELETE FROM niveaux_carburant WHERE trajet_id = ?', [id]);
    await connection.execute('DELETE FROM traceGps WHERE trajet_id = ?', [id]);
    await connection.execute('DELETE FROM trips WHERE id = ?', [id]);
    await connection.commit();

    res.json({ message: 'Trip and GPS points deleted successfully', id });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (e) {}
    }
    console.error('Error deleting trip:', error);
    res.status(500).json({
      error: 'Failed to delete trip',
      message: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

export default router;
