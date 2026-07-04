import express from 'express';
import db from '../config/database.js';

const router = express.Router();

const DOCUMENT_RULES = {
  assurance: { owner: 'vehicule', rappelJours: 30 },
  visite_technique: { owner: 'vehicule', rappelJours: 30 },
  vignette: { owner: 'vehicule', rappelJours: 15 },
  carte_grise: { owner: 'vehicule', rappelJours: 365 },
  permis: { owner: 'chauffeur', rappelJours: 60 },
  visite_medicale: { owner: 'chauffeur', rappelJours: 30 },
};

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT d.*, v.immatriculation, CONCAT(u.prenom, ' ', u.nom) AS chauffeur
       FROM documents_administratifs d
       LEFT JOIN vehicules v ON v.id = d.vehicule_id
       LEFT JOIN users u ON u.id = d.chauffeur_id
       ORDER BY d.expire_le ASC`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/rappels', async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT d.*, v.immatriculation, CONCAT(u.prenom, ' ', u.nom) AS chauffeur,
              CASE
                WHEN d.expire_le < CURDATE() THEN 'expire'
                WHEN d.expire_le <= DATE_ADD(CURDATE(), INTERVAL d.rappel_jours DAY) THEN 'bientot_expire'
                ELSE 'conforme'
              END AS etat_conformite
       FROM documents_administratifs d
       LEFT JOIN vehicules v ON v.id = d.vehicule_id
       LEFT JOIN users u ON u.id = d.chauffeur_id
       ORDER BY d.expire_le ASC`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  const {
    type,
    vehicule_id = null,
    chauffeur_id = null,
    reference = null,
    delivre_le = null,
    expire_le,
    fichier_url = null,
  } = req.body;

  try {
    const rule = DOCUMENT_RULES[type];
    if (!rule) {
      return res.status(400).json({ error: 'Type de document invalide' });
    }

    if (rule.owner === 'vehicule' && !vehicule_id) {
      return res.status(400).json({ error: 'Ce type de document doit etre lie a un vehicule' });
    }

    if (rule.owner === 'chauffeur' && !chauffeur_id) {
      return res.status(400).json({ error: 'Ce type de document doit etre lie a un conducteur' });
    }

    const [result] = await db.execute(
      `INSERT INTO documents_administratifs
        (type, vehicule_id, chauffeur_id, reference, delivre_le, expire_le, rappel_jours, fichier_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        type,
        rule.owner === 'vehicule' ? vehicule_id : null,
        rule.owner === 'chauffeur' ? chauffeur_id : null,
        reference,
        delivre_le,
        expire_le,
        rule.rappelJours,
        fichier_url,
      ]
    );
    const [rows] = await db.execute('SELECT * FROM documents_administratifs WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
