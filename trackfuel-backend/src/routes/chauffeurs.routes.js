import express from 'express';
import db from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT u.id, u.email, u.matricule, u.nom, u.prenom, u.role, u.site_id,
              dp.telephone, dp.permis_numero, dp.permis_categorie, dp.statut,
              permis.expire_le AS permis_expire_le,
              permis.reference AS permis_document_reference,
              visite.expire_le AS visite_medicale_expire_le,
              visite.reference AS visite_medicale_document_reference
       FROM users u
       LEFT JOIN driver_profiles dp ON dp.user_id = u.id
       LEFT JOIN documents_administratifs permis ON permis.id = (
         SELECT d.id
         FROM documents_administratifs d
         WHERE d.type = 'permis' AND d.chauffeur_id = u.id
         ORDER BY d.expire_le DESC, d.id DESC
         LIMIT 1
       )
       LEFT JOIN documents_administratifs visite ON visite.id = (
         SELECT d.id
         FROM documents_administratifs d
         WHERE d.type = 'visite_medicale' AND d.chauffeur_id = u.id
         ORDER BY d.expire_le DESC, d.id DESC
         LIMIT 1
       )
       WHERE u.role = 'driver'
       ORDER BY u.nom, u.prenom`
    );

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/profile', async (req, res, next) => {
  const { id } = req.params;
  const {
    telephone = null,
    permis_numero = null,
    permis_categorie = null,
    statut = 'actif',
  } = req.body;

  try {
    await db.execute(
      `INSERT INTO driver_profiles
        (user_id, telephone, permis_numero, permis_categorie, statut)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        telephone = VALUES(telephone),
        permis_numero = VALUES(permis_numero),
        permis_categorie = VALUES(permis_categorie),
        statut = VALUES(statut)`,
      [id, telephone, permis_numero, permis_categorie, statut]
    );

    const [rows] = await db.execute(
      `SELECT u.id, u.email, u.matricule, u.nom, u.prenom, u.role, u.site_id,
              dp.telephone, dp.permis_numero, dp.permis_categorie, dp.statut
       FROM users u
       LEFT JOIN driver_profiles dp ON dp.user_id = u.id
       WHERE u.id = ?`,
      [id]
    );

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
