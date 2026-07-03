import express from 'express';
const router = express.Router();
import db from '../config/database.js';
import { createTripSchema, updateTripSchema } from '../validators/trajet.validator.js';

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

    const [chauf] = await db.execute('SELECT id FROM users WHERE id = ?', [chauffeur_id]);
    if (!chauf.length) return res.status(400).json({ error: 'Chauffeur introuvable' });

    const capacite = parseFloat(veh[0].capacite_reservoir) || 60;
    const consoNominale = parseFloat(veh[0].consommation_nominale) || 8;

    // Récupérer le dernier niveau de carburant connu avant le début du trajet
    const [niveauRow] = await db.execute(`
      SELECT niveau, timestamp
      FROM niveaux_carburant
      WHERE vehicule_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 1
    `, [vehicule_id]);

    const niveauDernier = niveauRow.length 
      ? parseFloat(niveauRow[0].niveau)
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
    `, [vehicule_id, chauffeur_id, date_debut, date_fin, distance_km, type_saisie]);

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

    await connection.commit();

    res.status(201).json({
      message: 'Trajet créé avec succès',
      trip: {
        id: tripId,
        distance_km,
        conso_estimee: `${consoEstimee.toFixed(1)} L`,
        niveau_avant: `${niveauAvant.toFixed(1)} L`,
        niveau_apres: `${niveauApres.toFixed(1)} L`,
        vol_detecte: volDetecte ? 'OUI → ALERTE !' : 'Non',
        points_gps: traceGps.length
      }
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
  try {
    const { id } = req.params;
    const {
      vehicule_id,
      chauffeur_id,
      date_debut,
      date_fin,
      distance_km,
      type_saisie,
      traceGps = []
    } = await updateTripSchema.validateAsync(req.body);

    const [existing] = await db.execute('SELECT id FROM trips WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const sql = `
      UPDATE trips 
      SET vehicule_id = ?, chauffeur_id = ?, date_debut = ?, date_fin = ?, 
          distance_km = ?, type_saisie = ?
      WHERE id = ?
    `;
    await db.execute(sql, [
      vehicule_id,
      chauffeur_id,
      date_debut,
      date_fin,
      distance_km,
      type_saisie,
      id
    ]);

    // Supprimer anciens points GPS et réinsérer si fournis
    await db.execute('DELETE FROM traceGps WHERE trajet_id = ?', [id]);
    if (traceGps.length > 0) {
      const gpsSql = `
        INSERT INTO traceGps (trajet_id, sequence, latitude, longitude, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `;
      for (let i = 0; i < traceGps.length; i++) {
        const p = traceGps[i];
        await db.execute(gpsSql, [
          
          id,
          i + 1,
          p.latitude,
          p.longitude,
          p.timestamp
        ]);
      }
    }

    res.json({ message: 'Trip updated successfully', id });
  } catch (error) {
    console.error('Error updating trip:', error);
    res.status(500).json({
      error: 'Failed to update trip',
      message: error.message
    });
  }
});

/**
 * DELETE /trips/:id
 * Delete a trip by ID (and its GPS points)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await db.execute('SELECT id FROM trips WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    await db.execute('DELETE FROM traceGps WHERE trajet_id = ?', [id]);
    await db.execute('DELETE FROM trips WHERE id = ?', [id]);

    res.json({ message: 'Trip and GPS points deleted successfully', id });
  } catch (error) {
    console.error('Error deleting trip:', error);
    res.status(500).json({
      error: 'Failed to delete trip',
      message: error.message
    });
  }
});

export default router;
