/**
 * Routes API pour les traces GPS
 * Base URL: /api/trace-gps
 */

import express from 'express';
const router = express.Router();
import db from '../config/database.js';
import { getTraceGpsSchema } from '../validators/traceGps.validator.js';
// import { validate } from '../middleware/validate.js'; // optionnel si tu as un middleware

/**
 * GET /api/trace-gps
 * Description: Récupère toutes les traces GPS
 * Query params:
 *   - trajet_id (optionnel): filtre par trajet
 * Response: Liste des points GPS triés par sequence
 */
router.get('/', async (req, res, next) => {
  try {
    const { trajet_id } = await getTraceGpsSchema.validateAsync(req.query);

    let query = `
      SELECT 
        id, trajet_id, sequence, latitude, longitude, timestamp
      FROM traceGps
    `;
    const params = [];

    if (trajet_id) {
      query += ` WHERE trajet_id = ?`;
      params.push(trajet_id);
    }

    query += ` ORDER BY sequence ASC`;

    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

export default router;