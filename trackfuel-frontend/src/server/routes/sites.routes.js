/**
 * Routes API pour la gestion des sites
 * Base URL: /api/sites
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { createSiteSchema, updateSiteSchema } = require('../validators/site.validator');

/**
 * GET /api/sites
 */
router.get('/', async (req, res, next) => {
  try {
    const [sites] = await db.execute(`
      SELECT s.*,
             COUNT(DISTINCT v.immatriculation) as nb_vehicules,
             COUNT(DISTINCT u.id) as nb_utilisateurs
      FROM sites s
      LEFT JOIN vehicules v ON s.id = v.site_id
      LEFT JOIN users u ON s.id = u.site_id
      GROUP BY s.id
      ORDER BY s.nom
    `);
    
    res.json(sites);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sites/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const [sites] = await db.execute(`
      SELECT s.*,
             COUNT(DISTINCT v.immatriculation) as nb_vehicules,
             COUNT(DISTINCT u.id) as nb_utilisateurs
      FROM sites s
      LEFT JOIN vehicules v ON s.id = v.site_id
      LEFT JOIN users u ON s.id = u.site_id
      WHERE s.id = ?
      GROUP BY s.id
    `, [id]);
    
    if (sites.length === 0) {
      return res.status(404).json({ error: 'Site non trouvé' });
    }
    
    res.json(sites[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sites
 */
router.post('/', async (req, res, next) => {
  try {
    const siteData = await createSiteSchema.validateAsync(req.body);
    
    const [result] = await db.execute(`
      INSERT INTO sites (nom, ville, pays)
      VALUES (?, ?, ?)
    `, [siteData.nom, siteData.ville, siteData.pays]);
    
    const [newSite] = await db.execute(
      'SELECT * FROM sites WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json(newSite[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/sites/:id
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = await updateSiteSchema.validateAsync(req.body);
    
    const [existing] = await db.execute('SELECT id FROM sites WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Site non trouvé' });
    }
    
    const fields = Object.keys(updateData);
    const values = Object.values(updateData);
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    
    await db.execute(
      `UPDATE sites SET ${setClause} WHERE id = ?`,
      [...values, id]
    );
    
    const [updated] = await db.execute('SELECT * FROM sites WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/sites/:id
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const [existing] = await db.execute('SELECT id FROM sites WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Site non trouvé' });
    }
    
    const [vehicules] = await db.execute(
      'SELECT COUNT(*) as count FROM vehicules WHERE site_id = ?',
      [id]
    );
    
    const [users] = await db.execute(
      'SELECT COUNT(*) as count FROM users WHERE site_id = ?',
      [id]
    );
    
    if (vehicules[0].count > 0 || users[0].count > 0) {
      return res.status(409).json({
        error: 'Impossible de supprimer ce site car des véhicules ou utilisateurs y sont associés'
      });
    }
    
    await db.execute('DELETE FROM sites WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
