import express from 'express';
import db from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT *,
              quantite <= seuil_critique AS niveau_critique,
              quantite * cout_unitaire AS valeur_stock
       FROM stock_pieces
       ORDER BY niveau_critique DESC, designation ASC`
    );
    res.json(rows.map(row => ({
      ...row,
      niveau_critique: Boolean(row.niveau_critique),
    })));
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  const {
    reference,
    designation,
    categorie = null,
    quantite = 0,
    seuil_critique = 0,
    cout_unitaire = 0,
    fournisseur = null,
  } = req.body;

  if (!reference || !designation) {
    return res.status(400).json({ error: 'reference et designation sont requises' });
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO stock_pieces
        (reference, designation, categorie, quantite, seuil_critique, cout_unitaire, fournisseur)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [reference, designation, categorie, quantite, seuil_critique, cout_unitaire, fournisseur]
    );
    const [rows] = await db.execute('SELECT * FROM stock_pieces WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

router.get('/sorties', async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT ps.*, sp.reference, sp.designation, v.immatriculation
       FROM piece_sorties ps
       JOIN stock_pieces sp ON sp.id = ps.piece_id
       LEFT JOIN vehicules v ON v.id = ps.vehicule_id
       ORDER BY ps.date_sortie DESC, ps.id DESC`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post('/sorties', async (req, res, next) => {
  const {
    piece_id,
    vehicule_id = null,
    maintenance_id = null,
    quantite,
    commentaire = null,
  } = req.body;

  if (!piece_id || !quantite || Number(quantite) <= 0) {
    return res.status(400).json({ error: 'piece_id et quantite positive sont requis' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [pieces] = await connection.execute(
      'SELECT id, quantite FROM stock_pieces WHERE id = ? FOR UPDATE',
      [piece_id]
    );

    if (pieces.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Piece introuvable' });
    }

    if (Number(pieces[0].quantite) < Number(quantite)) {
      await connection.rollback();
      return res.status(409).json({ error: 'Stock insuffisant' });
    }

    const [result] = await connection.execute(
      `INSERT INTO piece_sorties
        (piece_id, vehicule_id, maintenance_id, quantite, commentaire)
       VALUES (?, ?, ?, ?, ?)`,
      [piece_id, vehicule_id, maintenance_id, quantite, commentaire]
    );

    await connection.execute(
      'UPDATE stock_pieces SET quantite = quantite - ? WHERE id = ?',
      [quantite, piece_id]
    );

    await connection.commit();

    const [rows] = await db.execute('SELECT * FROM piece_sorties WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

export default router;
