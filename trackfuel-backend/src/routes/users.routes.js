import express from 'express';
const router = express.Router();
import db from '../config/database.js';
import bcrypt from 'bcrypt';
import { createUserSchema, updateUserSchema, loginSchema } from '../validators/user.validator.js';

router.get('/', async (req, res, next) => {
  try {
    const [users] = await db.execute('SELECT id, email, matricule, nom, prenom, role, fonction, site_id FROM users');
    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const [rows] = await db.execute(
      'SELECT id, email, password_hash, matricule, nom, prenom, role, fonction, site_id FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Utilisateur introuvable' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
    }

    // ✅ Authentification réussie
    res.json({
      success: true,
      user: {
        id: user.id,
        matricule: user.matricule,
        email: user.email,
        prenom: user.prenom,
        nom: user.nom,
        role: user.role,
        fonction: user.fonction,
      },
    });
  } catch (error) {
    next(error);
  }
});


router.post('/', async (req, res, next) => {
  try {
    const data = await createUserSchema.validateAsync(req.body);

    const [exist] = await db.execute(
      'SELECT id FROM users WHERE email = ? OR matricule = ?',
      [data.email, data.matricule]
    );
    if (exist.length > 0) return res.status(400).json({ error: 'Email ou matricule déjà utilisé' });

    const hash = await bcrypt.hash(data.password, 10);

    const [result] = await db.execute(
      `INSERT INTO users 
       (email, matricule, nom, prenom, role, fonction, site_id, password_hash) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.email, data.matricule, data.nom, data.prenom, data.role, data.fonction ?? 'conducteur', data.site_id ?? null, hash]
    );

    const [newUser] = await db.execute(
      'SELECT id, email, matricule, nom, prenom, role, fonction, site_id FROM users WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newUser[0]);
  } catch (error) {
    console.error('Erreur création user:', error);
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = await updateUserSchema.validateAsync(req.body);

    // Vérifie si l'utilisateur existe
    const [existing] = await db.execute('SELECT id FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Si mot de passe fourni, le hasher
    if (updateData.password) {
      const hash = await bcrypt.hash(updateData.password, 10);
      updateData.password_hash = hash;
      delete updateData.password;
    }

    const fields = Object.keys(updateData);
    const values = Object.values(updateData);
    const setClause = fields.map(f => `${f} = ?`).join(', ');

    await db.execute(
      `UPDATE users SET ${setClause} WHERE id = ?`,
      [...values, id]
    );

    const [updated] = await db.execute('SELECT id, email, matricule, nom, prenom, role, fonction, site_id FROM users WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (error) {
    next(error);
  }
});

// routes/users.routes.js
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await db.execute(
      'DELETE FROM users WHERE id = ?',
      [id]
    );

    // result.affectedRows === 0 → utilisateur non trouvé
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.status(204).send(); // No Content = succès
  } catch (error) {
    console.error('Erreur suppression user:', error);
    next(error);
  }
});

export default router;
