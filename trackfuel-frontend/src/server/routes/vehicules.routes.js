/**
 * Routes API pour la gestion des véhicules
 * Base URL: /api/vehicules
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { createVehiculeSchema, updateVehiculeSchema } = require('../validators/vehicule.validator');

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
    const { site_id, statut } = req.query;
    
    let query = `
      SELECT v.*, s.nom as site_nom, s.ville as site_ville
      FROM vehicules v
      LEFT JOIN sites s ON v.site_id = s.id
      WHERE 1=1
    `;
    const params = [];
    
    if (site_id) {
      query += ' AND v.site_id = ?';
      params.push(site_id);
    }
    
    if (statut) {
      query += ' AND v.statut = ?';
      params.push(statut);
    }
    
    query += ' ORDER BY v.immatriculation';
    
    const [vehicules] = await db.execute(query, params);
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
      SELECT v.*, s.nom as site_nom, s.ville as site_ville
      FROM vehicules v
      LEFT JOIN sites s ON v.site_id = s.id
      WHERE v.immatriculation = ?
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
 * Body: {
 *   immatriculation: string,
 *   marque: string,
 *   modele: string,
 *   type: string,
 *   capacite_reservoir: number,
 *   consommation_nominale: number,
 *   site_id?: string,
 *   actif: boolean,
 *   carburant_initial?: number
 * }
 * Response: Vehicule
 */
router.post('/', async (req, res, next) => {
  try {
    const vehiculeData = await createVehiculeSchema.validateAsync(req.body);
    
    const [existing] = await db.execute(
      'SELECT id FROM vehicules WHERE immatriculation = ?',
      [vehiculeData.immatriculation]
    );
    
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Cette immatriculation existe déjà' });
    }
    
    const [result] = await db.execute(`
      INSERT INTO vehicules (
        immatriculation, marque, modele, annee, type_carburant,
        capacite_reservoir, consommation_nominale, odometre_actuel,
        site_id, statut
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      vehiculeData.immatriculation,
      vehiculeData.marque,
      vehiculeData.modele,
      vehiculeData.annee,
      vehiculeData.type_carburant,
      vehiculeData.capacite_reservoir,
      vehiculeData.consommation_nominale,
      vehiculeData.odometre_actuel,
      vehiculeData.site_id || null,
      vehiculeData.statut || 'actif'
    ]);
    
    const [newVehicule] = await db.execute(
      'SELECT * FROM vehicules WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json(newVehicule[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/vehicules/:id
 * Description: Met à jour un véhicule existant
 * Params: id (string)
 * Body: Partial<Vehicule>
 * Response: Vehicule
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = await updateVehiculeSchema.validateAsync(req.body);
    
    const [existing] = await db.execute('SELECT id FROM vehicules WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Véhicule non trouvé' });
    }
    
    if (updateData.immatriculation) {
      const [duplicate] = await db.execute(
        'SELECT id FROM vehicules WHERE immatriculation = ? AND id != ?',
        [updateData.immatriculation, id]
      );
      if (duplicate.length > 0) {
        return res.status(409).json({ error: 'Cette immatriculation existe déjà' });
      }
    }
    
    const fields = Object.keys(updateData);
    const values = Object.values(updateData);
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    
    await db.execute(
      `UPDATE vehicules SET ${setClause} WHERE id = ?`,
      [...values, id]
    );
    
    const [updated] = await db.execute('SELECT * FROM vehicules WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (error) {
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
    
    const [pleins] = await db.execute('SELECT COUNT(*) as count FROM pleins WHERE vehicule_id = ?', [id]);
    const [trajets] = await db.execute('SELECT COUNT(*) as count FROM trajets WHERE vehicule_id = ?', [id]);
    
    if (pleins[0].count > 0 || trajets[0].count > 0) {
      return res.status(409).json({ 
        error: 'Impossible de supprimer ce véhicule car des pleins ou trajets y sont associés' 
      });
    }
    
    await db.execute('DELETE FROM vehicules WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
