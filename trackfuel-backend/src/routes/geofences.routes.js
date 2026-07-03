import express from 'express';
const router = express.Router();
import db from '../config/database.js';
import {
  createGeofenceSchema,
  updateGeofenceSchema,
  checkPointSchema
} from '../validators/geofence.validator.js';

/**
 * GET /geofences
 * Liste toutes les geofences, filtrable par type
 */
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    let sql = 'SELECT * FROM geofences';
    const params = [];

    if (type) {
      sql += ' WHERE type = ?';
      params.push(type);
    }

    sql += ' ORDER BY nom ASC';
    const [geofences] = await db.execute(sql, params);

    res.json(geofences);
  } catch (error) {
    console.error('Error fetching geofences:', error);
    res.status(500).json({
      error: 'Failed to fetch geofences',
      message: error.message
    });
  }
});

/**
 * GET /geofences/:id
 * Récupère une geofence par ID (auto-incrémenté)
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute(
      'SELECT * FROM geofences WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Geofence not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching geofence:', error);
    res.status(500).json({
      error: 'Failed to fetch geofence',
      message: error.message
    });
  }
});

/**
 * POST /geofences
 * Créer une nouvelle geofence
 */
router.post('/', async (req, res) => {
  try {
    const { nom, type, lat, lon, rayon_metres } = await createGeofenceSchema.validateAsync(req.body);
    console.log(rayon_metres);
    const sql = `
      INSERT INTO geofences (nom, type, lat, lon, rayon_metres)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(sql, [nom, type, lat, lon, rayon_metres]);
    const id = result.insertId;

    res.status(201).json({
      message: 'Geofence created successfully',
      id,
      nom,
      type,
      lat,
      lon,
      rayon_metres
    });
  } catch (error) {
    console.error('Error creating geofence:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }
    res.status(500).json({
      error: 'Failed to create geofence',
      message: error.message
    });
  }
});

/**
 * PUT /geofences/:id
 * Mettre à jour une geofence
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id);
    const updateData = await updateGeofenceSchema.validateAsync(req.body);

    const [existing] = await db.execute('SELECT id FROM geofences WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Geofence not found' });
    }

    const fields = Object.keys(updateData).map(key => `${key} = ?`);
    const values = Object.values(updateData);
    values.push(id);

    const sql = `UPDATE geofences SET ${fields.join(', ')} WHERE id = ?`;
    await db.execute(sql, values);

    res.json({ message: 'Geofence updated successfully', id });
  } catch (error) {
    console.error('Error updating geofence:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }
    res.status(500).json({
      error: 'Failed to update geofence',
      message: error.message
    });
  }
});

/**
 * DELETE /geofences/:id
 * Supprimer une geofence
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db.execute('SELECT id FROM geofences WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Geofence not found' });
    }

    await db.execute('DELETE FROM geofences WHERE id = ?', [id]);

    res.json({ message: 'Geofence deleted successfully', id });
  } catch (error) {
    console.error('Error deleting geofence:', error);
    res.status(500).json({
      error: 'Failed to delete geofence',
      message: error.message
    });
  }
});

/**
 * POST /geofences/check-point
 * Vérifie si un point est dans une geofence
 */
router.post('/check-point', async (req, res) => {
  try {
    const { latitude, longitude } = await checkPointSchema.validateAsync(req.body);

    const sql = `
      SELECT *,
             (6371000 * acos(cos(radians(?)) * cos(radians(lat)) * cos(radians(lon) - radians(?)) + 
              sin(radians(?)) * sin(radians(lat)))) AS distance_metres
      FROM geofences
      HAVING distance_metres <= rayon_metres
      ORDER BY distance_metres ASC
    `;

    const [results] = await db.execute(sql, [latitude, longitude, latitude]);

    if (results.length === 0) {
      return res.json({ inGeofence: false, message: 'Point hors de toute geofence' });
    }

    res.json({
      inGeofence: true,
      geofences: results.map(g => ({
        id: g.id,
        nom: g.nom,
        type: g.type,
        distance_metres: Math.round(g.distance_metres)
      }))
    });
  } catch (error) {
    console.error('Error checking point in geofence:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }
    res.status(500).json({
      error: 'Failed to check point',
      message: error.message
    });
  }
});

export default router;