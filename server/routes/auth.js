const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { signToken, authRequired } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, password, student_id } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.status(400).json({ error: 'Email already registered' });
  }
  const role = 'student';
  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(
    `INSERT INTO users (name, email, password, role, student_id) VALUES (?,?,?,?,?)`
  ).run(name, email.toLowerCase().trim(), hash, role, student_id || null);

  const user = db.prepare('SELECT id, name, email, role, student_id FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = signToken(user);
  res.status(201).json({ token, user });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const ok = bcrypt.compareSync(password, user.password);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const safe = (({ id, name, email, role, student_id }) => ({ id, name, email, role, student_id }))(user);
  const token = signToken(safe);
  res.json({ token, user: safe });
});

// GET /api/auth/me
router.get('/me', authRequired, (req, res) => {
  const user = db.prepare(
    'SELECT id, name, email, role, student_id, created_at FROM users WHERE id = ?'
  ).get(req.user.id);
  res.json({ user });
});

module.exports = router;

