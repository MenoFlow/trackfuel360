/**
 * Routes API pour les métadonnées EXIF des photos de pleins
 * Base URL: /api/plein-exif
 */

import express from 'express';
const router = express.Router();
import db from '../config/database.js';

/**
 * GET /api/plein-exif
 * Description: Lister toutes les métadonnées EXIF
 * Query params:
 *   - plein_id (optionnel): filtrer par plein
 */
router.get('/', async (req, res, next) => {
  try {
    let query = `
      SELECT *
      FROM bons_carburant_scannes
    `;
    const params = [];

    const [exifs] = await db.execute(query, params);
    res.json(exifs);
  } catch (error) {
    next(error);
  }
});
/**
 * GET /api/plein-exif/:id
 * Description: Récupérer une métadonnée EXIF par ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [exifs] = await db.execute(
      `SELECT pem.*, p.date as plein_date
       FROM bons_carburant_scannes pem
       LEFT JOIN pleins p ON pem.plein_id = p.id
       WHERE pem.id = ?`,
      [id]
    );

    if (exifs.length === 0) {
      return res.status(404).json({ error: 'Métadonnée EXIF non trouvée' });
    }

    res.json(exifs[0]);
  } catch (error) {
    next(error);
  }
});


export default router;