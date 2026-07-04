import express from 'express';
const router = express.Router();
import db from '../config/database.js';
import { createAffectationSchema, updateAffectationSchema } from '../validators/affectation.validator.js';
import {
  buildConflictResponse,
  buildDriverIneligibleResponse,
  getAvailabilityConflicts,
  getDriverEligibility,
  toMysqlDateTime,
} from '../services/availabilityService.js';

// GET /api/affectations
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.execute(`
      SELECT a.*, om.destination AS mission_destination, om.motif AS mission_motif, om.statut AS mission_statut
      FROM affectations a
      LEFT JOIN ordres_mission om ON om.id = a.mission_id
      ORDER BY a.date_debut DESC
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/affectations/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute('SELECT * FROM affectations WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Affectation non trouvée' });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

// POST /api/affectations
router.post('/', async (req, res, next) => {
  try {
    const data = await createAffectationSchema.validateAsync(req.body);

    if (data.source === 'mission' || data.mission_id) {
      return res.status(400).json({
        error: 'Les affectations de mission sont créées uniquement après acceptation de la mission.',
        code: 'MISSION_ASSIGNMENT_MANAGED_BY_MISSION',
      });
    }

    const driverEligibility = await getDriverEligibility(db, data.chauffeur_id);
    if (driverEligibility) {
      return res.status(driverEligibility.code === 'DRIVER_NOT_FOUND' ? 400 : 409).json(buildDriverIneligibleResponse(driverEligibility));
    }

    const availability = await getAvailabilityConflicts(db, {
      chauffeurId: data.chauffeur_id,
      vehiculeId: data.vehicule_id,
      start: data.date_debut,
      end: data.date_fin,
    });

    if (availability.hasConflict) {
      return res.status(409).json(buildConflictResponse(availability));
    }

    const [result] = await db.execute(`
      INSERT INTO affectations (vehicule_id, chauffeur_id, mission_id, source, date_debut, date_fin)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      data.vehicule_id,
      data.chauffeur_id,
      null,
      'manuelle',
      toMysqlDateTime(data.date_debut),
      toMysqlDateTime(data.date_fin),
    ]);

    const [newRow] = await db.execute('SELECT * FROM affectations WHERE id = ?', [result.insertId]);
    res.status(201).json(newRow[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/affectations/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await updateAffectationSchema.validateAsync(req.body);

    const [existing] = await db.execute('SELECT * FROM affectations WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Affectation non trouvée' });
    }

    if (existing[0].source === 'mission' || existing[0].mission_id) {
      return res.status(409).json({
        error: 'Cette affectation est gérée par une mission et ne peut pas être modifiée directement.',
        code: 'MISSION_ASSIGNMENT_MANAGED_BY_MISSION',
      });
    }

    if (data.source === 'mission' || data.mission_id) {
      return res.status(400).json({
        error: 'Une affectation manuelle ne peut pas être convertie en affectation de mission.',
        code: 'MISSION_ASSIGNMENT_MANAGED_BY_MISSION',
      });
    }

    const nextData = {
      ...existing[0],
      ...data,
    };

    const driverEligibility = await getDriverEligibility(db, nextData.chauffeur_id);
    if (driverEligibility) {
      return res.status(driverEligibility.code === 'DRIVER_NOT_FOUND' ? 400 : 409).json(buildDriverIneligibleResponse(driverEligibility));
    }

    const availability = await getAvailabilityConflicts(db, {
      chauffeurId: nextData.chauffeur_id,
      vehiculeId: nextData.vehicule_id,
      start: nextData.date_debut,
      end: nextData.date_fin,
      excludeAffectationId: id,
    });

    if (availability.hasConflict) {
      return res.status(409).json(buildConflictResponse(availability));
    }

    const normalizedData = { ...data };
    if (normalizedData.date_debut) normalizedData.date_debut = toMysqlDateTime(normalizedData.date_debut);
    if (normalizedData.date_fin) normalizedData.date_fin = toMysqlDateTime(normalizedData.date_fin);

    const fields = Object.keys(normalizedData);
    const values = Object.values(normalizedData);
    const setClause = fields.map(f => `${f} = ?`).join(', ');

    await db.execute(`UPDATE affectations SET ${setClause} WHERE id = ?`, [...values, id]);

    const [updated] = await db.execute('SELECT * FROM affectations WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/affectations/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db.execute('SELECT id, source, mission_id FROM affectations WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Affectation non trouvée' });
    }

    if (existing[0].source === 'mission' || existing[0].mission_id) {
      return res.status(409).json({
        error: 'Cette affectation est gérée par une mission et doit être supprimée depuis la mission associée.',
        code: 'MISSION_ASSIGNMENT_MANAGED_BY_MISSION',
      });
    }

    await db.execute('DELETE FROM affectations WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
