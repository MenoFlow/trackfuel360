import express from 'express';
import db from '../config/database.js';

const router = express.Router();
const STATUTS = ['planifie', 'en_cours', 'termine', 'annule'];
const TRANSITIONS = {
  planifie: ['en_cours', 'termine', 'annule'],
  en_cours: ['termine', 'annule'],
  termine: [],
  annule: [],
};

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT m.*, v.immatriculation
       FROM maintenance_interventions m
       LEFT JOIN vehicules v ON v.id = m.vehicule_id
       ORDER BY m.date_prevue ASC, m.id DESC`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  const {
    vehicule_id,
    type,
    description,
    date_prevue = null,
    kilometrage_prevu = null,
    date_realisation = null,
    cout = 0,
    prestataire = null,
    statut = 'planifie',
  } = req.body;

  if (!vehicule_id || !type || !description) {
    return res.status(400).json({ error: 'vehicule_id, type et description sont requis' });
  }

  if (!STATUTS.includes(statut)) {
    return res.status(400).json({ error: 'Statut maintenance invalide' });
  }

  if (statut === 'termine' && !date_realisation) {
    return res.status(400).json({ error: 'La date de réalisation est requise pour terminer une maintenance' });
  }

  try {
    const [vehicules] = await db.execute('SELECT id FROM vehicules WHERE id = ?', [vehicule_id]);
    if (!vehicules.length) {
      return res.status(400).json({ error: 'Véhicule introuvable' });
    }

    if (statut === 'en_cours') {
      const [active] = await db.execute(
        `SELECT id
         FROM maintenance_interventions
         WHERE vehicule_id = ? AND statut = 'en_cours'
         LIMIT 1`,
        [vehicule_id]
      );
      if (active.length) {
        return res.status(409).json({
          error: 'Une maintenance est déjà en cours pour ce véhicule',
          code: 'MAINTENANCE_ALREADY_ACTIVE',
          maintenance_id: active[0].id,
        });
      }
    }

    const [result] = await db.execute(
      `INSERT INTO maintenance_interventions
        (vehicule_id, type, description, date_prevue, kilometrage_prevu, date_realisation, cout, prestataire, statut)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [vehicule_id, type, description, date_prevue, kilometrage_prevu, date_realisation, cout, prestataire, statut]
    );

    const [rows] = await db.execute('SELECT * FROM maintenance_interventions WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const { statut, date_realisation = null } = req.body;
    if (!STATUTS.includes(statut)) {
      return res.status(400).json({ error: 'Statut maintenance invalide' });
    }

    const [existing] = await db.execute(
      'SELECT id, vehicule_id, statut FROM maintenance_interventions WHERE id = ?',
      [req.params.id]
    );
    if (!existing.length) {
      return res.status(404).json({ error: 'Maintenance introuvable' });
    }

    const current = existing[0];
    if (!(TRANSITIONS[current.statut] || []).includes(statut)) {
      return res.status(409).json({
        error: 'Transition de maintenance non autorisée',
        code: 'MAINTENANCE_STATUS_TRANSITION_INVALID',
        statut_actuel: current.statut,
        statut_demande: statut,
        transitions_autorisees: TRANSITIONS[current.statut] || [],
      });
    }

    if (statut === 'en_cours') {
      const [active] = await db.execute(
        `SELECT id
         FROM maintenance_interventions
         WHERE vehicule_id = ? AND statut = 'en_cours' AND id <> ?
         LIMIT 1`,
        [current.vehicule_id, req.params.id]
      );
      if (active.length) {
        return res.status(409).json({
          error: 'Une maintenance est déjà en cours pour ce véhicule',
          code: 'MAINTENANCE_ALREADY_ACTIVE',
          maintenance_id: active[0].id,
        });
      }
    }

    if (statut === 'termine' && !date_realisation) {
      return res.status(400).json({ error: 'La date de réalisation est requise pour terminer une maintenance' });
    }

    await db.execute(
      'UPDATE maintenance_interventions SET statut = ?, date_realisation = COALESCE(?, date_realisation) WHERE id = ?',
      [statut, date_realisation || null, req.params.id]
    );
    const [rows] = await db.execute('SELECT * FROM maintenance_interventions WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
