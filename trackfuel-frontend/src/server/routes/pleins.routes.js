/**
 * Routes API pour la gestion des pleins de carburant
 * Base URL: /api/pleins
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { createPleinSchema, updatePleinSchema } = require('../validators/plein.validator');

/**
 * GET /api/pleins
 */
router.get('/', async (req, res, next) => {
  try {
    const { vehicule_id, chauffeur_id, date_debut, date_fin } = req.query;
    
    let query = `
      SELECT p.*, 
             v.immatriculation as vehicule_immatriculation,
             v.marque as vehicule_marque,
             v.modele as vehicule_modele,
             u.nom as chauffeur_nom,
             u.prenom as chauffeur_prenom
      FROM pleins p
      LEFT JOIN vehicules v ON p.vehicule_id = v.immatriculation
      LEFT JOIN users u ON p.chauffeur_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (vehicule_id) {
      query += ' AND p.vehicule_id = ?';
      params.push(vehicule_id);
    }
    
    if (chauffeur_id) {
      query += ' AND p.chauffeur_id = ?';
      params.push(chauffeur_id);
    }
    
    if (date_debut) {
      query += ' AND p.date >= ?';
      params.push(date_debut);
    }
    
    if (date_fin) {
      query += ' AND p.date <= ?';
      params.push(date_fin);
    }
    
    query += ' ORDER BY p.date DESC';
    
    const [pleins] = await db.execute(query, params);
    res.json(pleins);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pleins/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const [pleins] = await db.execute(`
      SELECT p.*,
             v.immatriculation as vehicule_immatriculation,
             v.marque as vehicule_marque,
             v.modele as vehicule_modele,
             u.nom as chauffeur_nom,
             u.prenom as chauffeur_prenom
      FROM pleins p
      LEFT JOIN vehicules v ON p.vehicule_id = v.immatriculation
      LEFT JOIN users u ON p.chauffeur_id = u.id
      WHERE p.id = ?
    `, [id]);
    
    if (pleins.length === 0) {
      return res.status(404).json({ error: 'Plein non trouvé' });
    }
    
    res.json(pleins[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/pleins
 */
router.post('/', async (req, res, next) => {
  try {
    const pleinData = await createPleinSchema.validateAsync(req.body);
    
    const [result] = await db.execute(`
      INSERT INTO pleins (
        vehicule_id, chauffeur_id, date, litres, prix_unitaire,
        odometre, station, photo_bon, type_saisie, latitude, longitude
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      pleinData.vehicule_id,
      pleinData.chauffeur_id,
      pleinData.date,
      pleinData.litres,
      pleinData.prix_unitaire,
      pleinData.odometre,
      pleinData.station || null,
      pleinData.photo_bon || null,
      pleinData.type_saisie,
      pleinData.latitude || null,
      pleinData.longitude || null
    ]);
    
    const [newPlein] = await db.execute(
      'SELECT * FROM pleins WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json(newPlein[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/pleins/:id
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = await updatePleinSchema.validateAsync(req.body);
    
    const [existing] = await db.execute('SELECT id FROM pleins WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Plein non trouvé' });
    }
    
    const fields = Object.keys(updateData);
    const values = Object.values(updateData);
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    
    await db.execute(
      `UPDATE pleins SET ${setClause} WHERE id = ?`,
      [...values, id]
    );
    
    const [updated] = await db.execute('SELECT * FROM pleins WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/pleins/:id
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const [existing] = await db.execute('SELECT id FROM pleins WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Plein non trouvé' });
    }
    
    await db.execute('DELETE FROM pleins WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
