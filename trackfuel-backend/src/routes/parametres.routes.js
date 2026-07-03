/**
 * Routes API pour la gestion des paramètres
 * Base URL: /api/parametres
 */

import express from 'express';
const router = express.Router();
import db from '../config/database.js';
import { updateParametreSchema, resetParametresSchema, bulkUpdateParametresSchema } from '../validators/parametre.validator.js';

/**
 * GET /api/parametres
 * Description: Récupère tous les paramètres
 * Response: Liste des paramètres avec leurs métadonnées
 */
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        id, label, description, valeur, unite, min, max
      FROM parametres
      ORDER BY label ASC
    `);

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/parametres
 * Description: Mise à jour en masse des paramètres
 */
router.put('/', async (req, res, next) => {
    try {
      const { parametres } = req.body;
  
      // Validation
      const { error } = (req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });
  
      if (parametres.length === 0) {
        return res.status(400).json({ error: 'Aucun paramètre fourni' });
      }
  
      const ids = parametres.map(p => p.id);
  
      // 1. Récupérer min/max pour tous les IDs
      const placeholders = ids.map(() => '?').join(',');
      const [rows] = await db.execute(
        `SELECT id, min, max FROM parametres WHERE id IN (${placeholders})`,
        ids
      );
  
      if (rows.length !== ids.length) {
        const found = rows.map(r => r.id);
        const missing = ids.find(id => !found.includes(id));
        return res.status(404).json({ error: `Paramètre inconnu: ${missing}` });
      }
  
      const bounds = {};
      rows.forEach(row => { bounds[row.id] = { min: row.min, max: row.max }; });
  
      // 2. Valider chaque valeur
      for (const p of parametres) {
        const { min, max } = bounds[p.id];
        if (p.valeur < min || p.valeur > max) {
          return res.status(400).json({
            error: `${p.id}: ${p.valeur} hors limites [${min} - ${max}]`
          });
        }
      }
  
      // 3. Construire la requête UPDATE avec CASE (ORDRE CORRIGÉ)
      const caseClauses = parametres
        .map(p => `WHEN ? THEN ?`)
        .join(' ');
      
      const caseValues = [];
      parametres.forEach(p => {
        caseValues.push(p.id);     // WHEN id = ?
        caseValues.push(p.valeur); // THEN valeur = ?
      });
  
      const sql = `
        UPDATE parametres 
        SET valeur = CASE id 
          ${caseClauses}
        END 
        WHERE id IN (${placeholders})
      `;
  
      // Ordre EXACT : [WHEN id, THEN valeur, ..., IN ids]
      const values = [...caseValues, ...ids];
  
      await db.execute(sql, values);
  
      res.json({
        message: 'Paramètres mis à jour en masse',
        updated: parametres.length
      });
  
    } catch (error) {
      next(error);
    }
  });
  
/**
 * POST /api/parametres/reset
 * Description: Réinitialise tous les paramètres aux valeurs par défaut
 * Body: {} → vide
 * Response: { message, count }
 */
router.post('/reset', async (req, res, next) => {
  try {
    // Validation (body vide)
    const { error } = resetParametresSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const defaultValues = [
      ['seuil_surconsommation_pct', 'Seuil de surconsommation', 'Pourcentage au-dessus de la consommation nominale', 30, '%', 0, 100],
      ['seuil_ecart_gps_pct', 'Écart GPS vs odomètre', 'Écart maximal entre GPS et odomètre', 20, '%', 0, 100],
      ['seuil_carburant_disparu_litres', 'Carburant disparu', 'Seuil minimal de carburant manquant', 5, 'L', 0, 1000],
      ['seuil_exif_heures', 'Écart EXIF temporel', 'Écart maximal entre heure EXIF et heure réelle', 2, 'h', 0, 48],
      ['seuil_exif_distance_km', 'Écart EXIF géographique', 'Écart maximal entre position EXIF et position réelle', 1, 'km', 0, 100],
      ['seuil_immobilisation_heures', 'Durée d\'immobilisation', 'Temps d\'immobilisation hors dépôt déclenchant une alerte', 12, 'h', 0, 168],
      ['periode_consommation_jours', 'Période d\'analyse', 'Durée d\'analyse de la consommation moyenne', 7, 'jours', 1, 365],
    ];

    // Utilise REPLACE INTO pour insérer ou remplacer
    const placeholders = defaultValues.map(() => `(?, ?, ?, ?, ?, ?, ?)`).join(', ');
    const values = defaultValues.flat();

    await db.execute(
      `REPLACE INTO parametres (id, label, description, valeur, unite, min, max) VALUES ${placeholders}`,
      values
    );

    const [rows] = await db.execute(`
      SELECT 
        id, label, description, valeur, unite, min, max
      FROM parametres
      ORDER BY label ASC
    `);

    // res.json({ message: 'Paramètres réinitialisés', count: defaultValues.length });
    return res.json(rows); 
  } catch (error) {
    next(error);
  }
});

export default router;