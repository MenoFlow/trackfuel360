/**
 * Routes API pour les niveaux de carburant
 * Base URL: /api/niveau-carbu
 */

import express from 'express';
const router = express.Router();
import db from '../config/database.js';
import { getNiveauxCarburantSchema } from '../validators/niveauCarburant.validator.js';

/**
 * GET /api/niveau-carbu
 * Description: Récupère tous les niveaux de carburant
 * Query params:
 *   - vehicule_id (optionnel): filtre par véhicule
 * Response: Liste des niveaux triés par timestamp DESC
 */
router.get('/', async (req, res, next) => {
  try {
    const { vehicule_id } = await getNiveauxCarburantSchema.validateAsync(req.query);

    let query = `
      SELECT 
        id,
        vehicule_id,
        timestamp,
        niveau,
        type,
        trajet_id,
        plein_id,
        created_at,
        updated_at
      FROM niveaux_carburant
    `;
    const params = [];

    if (vehicule_id) {
      query += ` WHERE vehicule_id = ?`;
      params.push(vehicule_id);
    }

    query += ` ORDER BY timestamp DESC`;

    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

export default router;