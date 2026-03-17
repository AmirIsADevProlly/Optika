const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID: uuid } = require('crypto');
const db = require('../db.cjs');
const { auth } = require('../middleware.cjs');

const router = express.Router();

router.post('/register', (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: 'Email, username, and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
  if (existing) {
    return res.status(409).json({ error: 'Email or username already taken' });
  }

  const id = uuid();
  const passwordHash = bcrypt.hashSync(password, 10);

  db.prepare('INSERT INTO users (id, email, username, password_hash) VALUES (?, ?, ?, ?)').run(id, email, username, passwordHash);

  const token = jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: '30d' });

  res.status(201).json({
    token,
    user: { id, email, username },
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

  res.json({
    token,
    user: { id: user.id, email: user.email, username: user.username },
  });
});

router.get('/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, email, username, anthropic_key, openrouter_key, api_provider, created_at FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({
    ...user,
    anthropic_key: user.anthropic_key ? '••••' + user.anthropic_key.slice(-4) : null,
    openrouter_key: user.openrouter_key ? '••••' + user.openrouter_key.slice(-4) : null,
    has_api_key: !!(user.api_provider === 'openrouter' ? user.openrouter_key : user.anthropic_key),
    api_provider: user.api_provider || 'anthropic',
  });
});

router.put('/api-key', auth, (req, res) => {
  const { apiKey, provider } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'API key required' });

  const p = provider || 'anthropic';
  if (p === 'openrouter') {
    db.prepare('UPDATE users SET openrouter_key = ?, api_provider = ? WHERE id = ?').run(apiKey, p, req.userId);
  } else {
    db.prepare('UPDATE users SET anthropic_key = ?, api_provider = ? WHERE id = ?').run(apiKey, p, req.userId);
  }
  res.json({ success: true });
});

router.put('/api-provider', auth, (req, res) => {
  const { provider } = req.body;
  if (!['anthropic', 'openrouter'].includes(provider)) {
    return res.status(400).json({ error: 'Invalid provider' });
  }
  db.prepare('UPDATE users SET api_provider = ? WHERE id = ?').run(provider, req.userId);
  res.json({ success: true });
});

module.exports = router;
