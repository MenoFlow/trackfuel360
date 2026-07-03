/**
 * Routes API pour la gestion des pleins carburant
 * Base URL: /api/pleins
 */

import express from 'express';
const router = express.Router();
import db from '../config/database.js';
import { createPleinSchema, updatePleinSchema } from '../validators/plein.validator.js';
import { upload } from '../middleware/multer-middleware.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExifParser from 'exif-parser';

/**
 * GET /api/pleins
 * Description: Liste tous les pleins
 * Query params:
 *   - vehicule_id (optional)
 *   - chauffeur_id (optional)
 *   - date_debut (ISO)
 *   - date_fin (ISO)
 *   - type_saisie (manuelle|auto)
 */
router.get('/', async (req, res, next) => {
  try {
    const { vehicule_id, chauffeur_id, date_debut, date_fin, type_saisie } = req.query;

    let query = `
      SELECT p.*, 
             v.immatriculation, v.marque, v.modele,
             u.nom AS chauffeur_nom, u.prenom AS chauffeur_prenom
      FROM pleins p
      LEFT JOIN vehicules v ON p.vehicule_id = v.id
      LEFT JOIN users u ON p.chauffeur_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (vehicule_id) {
      query += ` AND p.vehicule_id = ?`;
      params.push(vehicule_id);
    }
    if (chauffeur_id) {
      query += ` AND p.chauffeur_id = ?`;
      params.push(chauffeur_id);
    }
    if (date_debut) {
      query += ` AND p.date >= ?`;
      params.push(date_debut);
    }
    if (date_fin) {
      query += ` AND p.date <= ?`;
      params.push(date_fin);
    }
    if (type_saisie) {
      query += ` AND p.type_saisie = ?`;
      params.push(type_saisie);
    }

    query += ` ORDER BY p.date DESC`;

    const [pleins] = await db.execute(query, params);
    res.json(pleins);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pleins/:id
 * Description: Récupère un plein par ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [pleins] = await db.execute(`
      SELECT p.*, 
             v.immatriculation, v.marque, v.modele,
             u.nom AS chauffeur_nom, u.prenom AS chauffeur_prenom
      FROM pleins p
      LEFT JOIN vehicules v ON p.vehicule_id = v.id
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// routes/pleins.ts ou controllers/pleins.ts

// controllers/pleins.controller.ts ou routes/pleins.ts
const PRIX_UNITAIRE_FIXE = 6000;

const createPlein = async (req, res) => {
  const photoPath = req.file?.path || null;
  let pleinId = null;

  // Variables pour les erreurs odomètre
  let kmInitial = 0;

  const deletePhoto = (photoAbsPath) => {
    if (!photoAbsPath) return;
    if (fs.existsSync(photoAbsPath)) {
      fs.unlink(photoAbsPath, (err) => {
        if (err) console.warn(`[DELETE] Échec suppression photo : ${photoAbsPath}`);
        else console.log(`[DELETE] Photo supprimée  : ${photoAbsPath}`);
      });
    } else {
      console.warn(`[DELETE] Fichier introuvable : ${photoAbsPath}`);
    }
  };  

  let connection;
  try {
    connection = await db.getConnection();

    const pleinData = req.body;

    console.log(pleinData);

    // === 1. Récupération précoce du véhicule (pour kmInitial et capacité) ===
    const [vehiculeRows] = await connection.execute(
      'SELECT id, capacite_reservoir, kilometrage_initial FROM vehicules WHERE id = ?',
      [pleinData.vehicule_id]
    );
    if (!vehiculeRows.length) {
      return res.status(400).json({ error: 'Véhicule non trouvé' });
    }
    const vehicule = vehiculeRows[0];
    kmInitial = parseFloat(vehicule.kilometrage_initial) || 0;

    // === 2. Vérification odomètre AVANT transaction ===
    // Check : odomètre < km initial
    if (pleinData.odometre < kmInitial - 1) {
      return res.status(400).json({
        error: 'Odomètre inférieur au kilométrage initial du véhicule',
        code: 'ODOMETRE_BELOW_INITIAL',
        kilometrage_initial: kmInitial,
      });
    }

    // Check : odomètre ≤ dernier odomètre connu
    const [lastOdo] = await connection.execute(
      'SELECT odometre FROM pleins WHERE vehicule_id = ? ORDER BY odometre DESC LIMIT 1',
      [pleinData.vehicule_id]
    );
    if (lastOdo.length && pleinData.odometre <= lastOdo[0].odometre) {
      return res.status(400).json({
        error: 'Odomètre invalide',
        code: 'ODOMETRE_INVALID',
        dernier_odometre: lastOdo[0].odometre,
      });
    }

    // === À partir d'ici, on commence la transaction ===
    await connection.beginTransaction();

    let capacite = parseFloat(vehicule.capacite_reservoir) || 60;
    let niveauAvant = 0;
    let espaceDisponible = 0;

    // === OCR (optionnel) ===
    const ocr = {
      station: req.body.ocr_station || null,
      date_bon: req.body.ocr_date_bon || null,
      litres: req.body.ocr_litres ? parseFloat(req.body.ocr_litres) : null,
      prix_total: req.body.ocr_prix_total ? parseFloat(req.body.ocr_prix_total) : null,
      chauffeur_matricule: req.body.ocr_chauffeur_matricule || null,
      chauffeur_nom: req.body.ocr_chauffeur_nom || null,
      chauffeur_prenom: req.body.ocr_chauffeur_prenom || null,
      vehicule_immatriculation: req.body.ocr_vehicule_immatriculation || null,
      vehicule_marque: req.body.ocr_vehicule_marque || null,
    };
    const hasOcrData = Object.values(ocr).some(v => v !== null);

    // === 3. Chauffeur ===
    const [chauffeurRows] = await connection.execute(
      'SELECT id FROM users WHERE id = ?',
      [pleinData.chauffeur_id]
    );
    if (!chauffeurRows.length) {
      throw new Error('Chauffeur non trouvé');
    }

    // === 4. Niveau carburant & capacité réservoir ===
    const [lastLevel] = await connection.execute(
      'SELECT niveau FROM niveaux_carburant WHERE vehicule_id = ? ORDER BY timestamp DESC LIMIT 1',
      [pleinData.vehicule_id]
    );
    niveauAvant = lastLevel.length ? parseFloat(lastLevel[0].niveau) : capacite * 0.3;
    const litresAjoutes = parseFloat(pleinData.litres);
    espaceDisponible = capacite - niveauAvant;

    if (litresAjoutes > espaceDisponible + 0.01) {
      throw {
        code: 'RESERVOIR_OVERFLOW',
        message: `Réservoir plein : seulement ${espaceDisponible.toFixed(2)} L disponibles`,
        capacite_reservoir: capacite,
        niveau_actuel: niveauAvant.toFixed(2),
        espaceDisponible: espaceDisponible.toFixed(2),
      };
    }

    // === 5. Insertion du plein ===
    const [result] = await connection.execute(
      `INSERT INTO pleins (
        vehicule_id, chauffeur_id, date, litres, prix_unitaire, odometre,
        station, type_saisie, photo_bon, latitude, longitude
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pleinData.vehicule_id,
        pleinData.chauffeur_id,
        pleinData.date,
        litresAjoutes,
        pleinData.prix_unitaire || PRIX_UNITAIRE_FIXE,
        pleinData.odometre,
        pleinData.station || null,
        pleinData.type_saisie || 'manuelle',
        photoPath,
        pleinData.latitude || null,
        pleinData.longitude || null,
      ]
    );
    pleinId = result.insertId;

    // === 6. Mise à jour niveaux carburant ===
    const niveauApres = Math.min(niveauAvant + litresAjoutes, capacite);
    await connection.execute(
      `INSERT INTO niveaux_carburant (vehicule_id, timestamp, niveau, type, plein_id)
       VALUES 
         (?, NOW(), ?, 'avant_plein', ?),
         (?, NOW(), ?, 'apres_plein', ?)`,
      [
        pleinData.vehicule_id, niveauAvant, pleinId,
        pleinData.vehicule_id, niveauApres, pleinId,
      ]
    );

    // === 7. Sauvegarde OCR (si présent) ===
    // BONNE VERSION : on retire created_at des colonnes
    if (hasOcrData && photoPath) {
      await connection.execute(
        `INSERT INTO bons_carburant_scannes (
          plein_id, station, date_bon, litres, prix_total,
          chauffeur_matricule, chauffeur_nom, chauffeur_prenom,
          vehicule_immatriculation, vehicule_marque, photo_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pleinId,
          ocr.station,
          ocr.date_bon,
          ocr.litres,
          ocr.prix_total,
          ocr.chauffeur_matricule,
          ocr.chauffeur_nom,
          ocr.chauffeur_prenom,
          ocr.vehicule_immatriculation,
          ocr.vehicule_marque,
          photoPath,
        ]
      );
    }

    // === 8. EXIF (optionnel, dans la transaction mais sans bloquer) ===
    if (photoPath) {
      try {
        const fullPath = path.join(__dirname, '..', '..', photoPath);
        console.log("fullPath exif :"+fullPath);
        const buffer = fs.readFileSync(fullPath);
        const parser = ExifParser.create(buffer.slice(0, 65536));
        const exif = parser.parse();
        const t = exif.tags;

        let date = null, heure = null, lat = null, lng = null, model = 'Inconnu';

        if (t.DateTimeOriginal || t.CreateDate || t.ModifyDate) {
          const ts = t.DateTimeOriginal || t.CreateDate || t.ModifyDate;
          const d = new Date(typeof ts === 'number' ? ts * 1000 : ts);
          if (!isNaN(d.getTime())) {
            date = d.toISOString().split('T')[0];
            heure = d.toISOString().split('T')[1].slice(0, 8);
          }
        }

        if (t.GPSLatitude && t.GPSLongitude) {
          if (typeof t.GPSLatitude === 'number') {
            lat = t.GPSLatitude;
            lng = t.GPSLongitude;
            if (t.GPSLatitudeRef === 'S') lat = -lat;
            if (t.GPSLongitudeRef === 'W') lng = -lng;
          } else if (Array.isArray(t.GPSLatitude)) {
            lat = convertDMSToDD(t.GPSLatitude, t.GPSLatitudeRef);
            lng = convertDMSToDD(t.GPSLongitude, t.GPSLongitudeRef);
          }
          if (lat !== null) lat = Number(lat.toFixed(8));
          if (lng !== null) lng = Number(lng.toFixed(8));
        }

        model = t.Model?.trim() || t.Make?.trim() || 'Inconnu';

        if (date || lat !== null) {
          await connection.execute(
            `INSERT INTO plein_exif_metadata (plein_id, date, heure, latitude, longitude, modele_telephone)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               date = VALUES(date), heure = VALUES(heure),
               latitude = VALUES(latitude), longitude = VALUES(longitude),
               modele_telephone = VALUES(modele_telephone)`,
            [pleinId, date, heure, lat, lng, model]
          );
        }
      } catch (exifErr) {
        console.warn(`[EXIF] Ignoré pour plein ${pleinId}:`, exifErr.message);
      }
    }

    // COMMIT
    await connection.commit();
    return res.status(201).json({ pleinId });

  } catch (error) {
    // ROLLBACK
    if (connection) {
      try {
        await connection.rollback();
        console.log('[TRANSACTION] Rollback effectué');
      } catch (e) {
        console.error('[TRANSACTION] Erreur rollback:', e);
      }
    }
    if (photoPath) deletePhoto(photoPath);

    console.error('Erreur création plein → rollback:', error);

    // ERREURS SPÉCIFIQUES (toutes les données sont accessibles)
    if (error.code === 'ODOMETRE_INVALID') {
      return res.status(400).json({
        error: error.message || 'Odomètre invalide',
        dernier_odometre: error.dernier_odometre,
      });
    }

    if (error.code === 'RESERVOIR_OVERFLOW') {
      return res.status(400).json({
        error: error.message,
        capacite_reservoir: error.capacite_reservoir,
        niveau_actuel: error.niveau_actuel,
        espaceDisponible: error.espaceDisponible,
      });
    }

    if (error.code === 'ODOMETRE_BELOW_INITIAL') {
      return res.status(400).json({
        error: error.message,
        kilometrage_initial: error.kilometrage_initial,
      });
    }

    if (error.message === 'Véhicule non trouvé' || error.message === 'Chauffeur non trouvé') {
      return res.status(400).json({ error: error.message });
    }

    // Erreur générique
    return res.status(500).json({
      error: 'Erreur serveur lors de la création du plein',
      message: error.message || 'Une erreur inconnue est survenue',
    });

  } finally {
    if (connection) connection.release();
  }
};
// Route
router.post('/', upload.single('photo_bon'), createPlein);

/**
 * PUT /api/pleins/:id
 * Description: Mettre à jour un plein
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = await updatePleinSchema.validateAsync(req.body);

    const [existing] = await db.execute('SELECT id FROM pleins WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Plein non trouvé' });
    }

    // Vérifier les FK si modifiées
    if (updateData.vehicule_id) {
      const [v] = await db.execute('SELECT id FROM vehicules WHERE id = ?', [updateData.vehicule_id]);
      if (v.length === 0) return res.status(400).json({ error: 'Véhicule non trouvé' });
    }
    if (updateData.chauffeur_id) {
      const [c] = await db.execute('SELECT id FROM users WHERE id = ?', [updateData.chauffeur_id]);
      if (c.length === 0) return res.status(400).json({ error: 'Chauffeur non trouvé' });
    }

    const fields = Object.keys(updateData);
    const values = Object.values(updateData);
    const setClause = fields.map(f => `${f} = ?`).join(', ');

    await db.execute(
      `UPDATE pleins SET ${setClause} WHERE id = ?`,
      [...values, id]
    );

    const [updated] = await db.execute(`
      SELECT p.*, 
             v.immatriculation, v.marque, v.modele,
             u.nom AS chauffeur_nom, u.prenom AS chauffeur_prenom
      FROM pleins p
      LEFT JOIN vehicules v ON p.vehicule_id = v.id
      LEFT JOIN users u ON p.chauffeur_id = u.id
      WHERE p.id = ?
    `, [id]);

    res.json(updated[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/pleins/:id
 * Description: Supprimer un plein
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

export default router;