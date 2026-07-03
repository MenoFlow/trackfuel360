/**
 * Routes API pour la gestion des véhicules
 * Base URL: /api/vehicules
 */

import express from 'express';
const router = express.Router();
import db from '../config/database.js';
import { createVehiculeSchema, updateVehiculeSchema } from '../validators/vehicule.validator.js';

/**
 * GET /api/vehicules
 * Description: Récupère la liste de tous les véhicules
 * Query params:
 *   - site_id (optional): Filtrer par site
 *   - statut (optional): Filtrer par statut
 * Response: Array<Vehicule>
 */
router.get('/', async (req, res, next) => {
  try {    
    let query = `
      SELECT v.*
      FROM vehicules v
      ORDER BY v.id
    `;
    
    const [vehicules] = await db.execute(query);
    res.json(vehicules);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/vehicules/:id
 * Description: Récupère un véhicule spécifique par son ID
 * Params: id (string)
 * Response: Vehicule
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const [vehicules] = await db.execute(`
      SELECT *
      FROM vehicules
      WHERE id = ?
    `, [id]);
    
    if (vehicules.length === 0) {
      return res.status(404).json({ error: 'Véhicule non trouvé' });
    }
    
    res.json(vehicules[0]);
  } catch (error) {
    next(error);
  }
});
/**
 * POST /api/vehicules
 * Description: Crée un nouveau véhicule
 */
router.post('/', async (req, res, next) => {
  try {
    const vehiculeData = await createVehiculeSchema.validateAsync(req.body);

    // Vérification doublon immatriculation (UNIQUE en base, mais on anticipe l'erreur 409)
    const [existing] = await db.execute(
      'SELECT id FROM vehicules WHERE immatriculation = ?',
      [vehiculeData.immatriculation]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Cette immatriculation existe déjà' });
    }

    const [result] = await db.execute(`
      INSERT INTO vehicules (
        immatriculation, marque, modele, type,
        capacite_reservoir, consommation_nominale,
        carburant_initial, kilometrage_initial,
        site_id, actif
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      vehiculeData.immatriculation,
      vehiculeData.marque,
      vehiculeData.modele,
      vehiculeData.type,
      vehiculeData.capacite_reservoir,
      vehiculeData.consommation_nominale,
      vehiculeData.carburant_initial ?? 0,
      vehiculeData.kilometrage_initial ?? 0,   // Nouvelle colonne
      vehiculeData.site_id ?? null,
      vehiculeData.actif ?? true
    ]);

    // Récupération du véhicule créé (avec l'id auto-incrémenté)
    const [newVehicule] = await db.execute(
      'SELECT * FROM vehicules WHERE id = ?',
      [result.insertId]   // plus propre que re-chercher par immatriculation
    );

    res.status(201).json(newVehicule[0]);
  } catch (error) {
    next(error);
  }
});
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const updateData = await updateVehiculeSchema.validateAsync(req.body);

    const [existing] = await db.execute('SELECT id FROM vehicules WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Véhicule non trouvé' });
    }

    // Bloquer uniquement l'immatriculation (clé métier immuable)
    if ('immatriculation' in req.body) {
      return res.status(400).json({
        error: "La modification de l'immatriculation n'est pas autorisée",
      });
    }

    // Plus de blocage sur kilometrage_initial → on l'autorise maintenant !

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Aucun champ valide à mettre à jour' });
    }

    const fields = Object.keys(updateData);
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updateData[f]);

    await db.execute(
      `UPDATE vehicules SET ${setClause} WHERE id = ?`,
      [...values, id]
    );

    const [updated] = await db.execute('SELECT * FROM vehicules WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (error) {
    if (error.isJoi) {
      return res.status(400).json({
        error: 'Données invalides',
        details: error.details.map(d => d.message).join(', '),
      });
    }
    next(error);
  }
});

/**
 * DELETE /api/vehicules/:id
 * Description: Supprime un véhicule
 * Params: id (string)
 * Response: { success: boolean }
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db.execute('SELECT id FROM vehicules WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Véhicule non trouvé' });
    }

    await db.execute('DELETE FROM vehicules WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});


export default router;
