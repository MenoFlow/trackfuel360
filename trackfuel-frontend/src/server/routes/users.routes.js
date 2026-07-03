const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createUserSchema, updateUserSchema, loginSchema } = require('../validators/user.validator');

const JWT_SECRET = process.env.JWT_SECRET || 'change-in-production';

router.get('/', async (req, res, next) => {
  try {
    const [users] = await db.execute('SELECT id, email, matricule, nom, prenom, role, site_id FROM users');
    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const data = await createUserSchema.validateAsync(req.body);
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const [result] = await db.execute(
      'INSERT INTO users (email, matricule, nom, prenom, role, site_id, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.email, data.matricule, data.nom, data.prenom, data.role, data.site_id, hashedPassword]
    );
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = await loginSchema.validateAsync(req.body);
    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(401).json({ error: 'Identifiants invalides' });
    
    const user = users[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Identifiants invalides' });
    
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    const { password_hash, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
