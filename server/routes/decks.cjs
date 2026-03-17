const express = require('express');
const { randomUUID: uuid } = require('crypto');
const db = require('../db.cjs');
const { auth } = require('../middleware.cjs');

const router = express.Router();
router.use(auth);

// GET all decks for user
router.get('/', (req, res) => {
  const decks = db.prepare(`
    SELECT d.*,
      (SELECT COUNT(*) FROM cards WHERE deck_id = d.id) as card_count,
      (SELECT COALESCE(AVG(mastery), 0) FROM cards WHERE deck_id = d.id) as avg_mastery,
      (SELECT COUNT(*) FROM cards WHERE deck_id = d.id AND mastery >= 0.8) as mastered_count
    FROM decks d WHERE d.user_id = ? ORDER BY d.created_at DESC
  `).all(req.userId);

  res.json(decks);
});

// GET single deck with cards
router.get('/:id', (req, res) => {
  const deck = db.prepare('SELECT * FROM decks WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!deck) return res.status(404).json({ error: 'Deck not found' });

  const cards = db.prepare('SELECT * FROM cards WHERE deck_id = ? ORDER BY created_at ASC').all(deck.id);
  res.json({ ...deck, cards });
});

// CREATE deck
router.post('/', (req, res) => {
  const { name, description, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const id = uuid();
  db.prepare('INSERT INTO decks (id, user_id, name, description, color) VALUES (?, ?, ?, ?, ?)').run(
    id, req.userId, name, description || '', color || '#B45309'
  );

  const deck = db.prepare('SELECT * FROM decks WHERE id = ?').get(id);
  res.status(201).json(deck);
});

// UPDATE deck
router.put('/:id', (req, res) => {
  const deck = db.prepare('SELECT * FROM decks WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!deck) return res.status(404).json({ error: 'Deck not found' });

  const { name, description, color } = req.body;
  db.prepare('UPDATE decks SET name = COALESCE(?, name), description = COALESCE(?, description), color = COALESCE(?, color) WHERE id = ?').run(
    name, description, color, deck.id
  );

  res.json(db.prepare('SELECT * FROM decks WHERE id = ?').get(deck.id));
});

// DELETE deck
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM decks WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Deck not found' });
  res.json({ success: true });
});

// Record study session
router.post('/:id/study', (req, res) => {
  const deck = db.prepare('SELECT * FROM decks WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!deck) return res.status(404).json({ error: 'Deck not found' });

  db.prepare('UPDATE decks SET last_studied = ?, study_sessions = study_sessions + 1 WHERE id = ?').run(Date.now(), deck.id);
  res.json({ success: true });
});

// ─── CARD ROUTES ───

// ADD card
router.post('/:id/cards', (req, res) => {
  const deck = db.prepare('SELECT * FROM decks WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!deck) return res.status(404).json({ error: 'Deck not found' });

  const { front, back } = req.body;
  if (!front || !back) return res.status(400).json({ error: 'Front and back are required' });

  const id = uuid();
  db.prepare('INSERT INTO cards (id, deck_id, front, back) VALUES (?, ?, ?, ?)').run(id, deck.id, front, back);

  res.status(201).json(db.prepare('SELECT * FROM cards WHERE id = ?').get(id));
});

// ADD multiple cards (bulk)
router.post('/:id/cards/bulk', (req, res) => {
  const deck = db.prepare('SELECT * FROM decks WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!deck) return res.status(404).json({ error: 'Deck not found' });

  const { cards } = req.body;
  if (!Array.isArray(cards) || cards.length === 0) return res.status(400).json({ error: 'Cards array required' });

  const insert = db.prepare('INSERT INTO cards (id, deck_id, front, back) VALUES (?, ?, ?, ?)');
  const insertMany = db.transaction((items) => {
    const created = [];
    for (const c of items) {
      if (!c.front || !c.back) continue;
      const id = uuid();
      insert.run(id, deck.id, c.front, c.back);
      created.push(id);
    }
    return created;
  });

  const ids = insertMany(cards);
  res.status(201).json({ created: ids.length });
});

// UPDATE card
router.put('/:deckId/cards/:cardId', (req, res) => {
  const deck = db.prepare('SELECT * FROM decks WHERE id = ? AND user_id = ?').get(req.params.deckId, req.userId);
  if (!deck) return res.status(404).json({ error: 'Deck not found' });

  const card = db.prepare('SELECT * FROM cards WHERE id = ? AND deck_id = ?').get(req.params.cardId, deck.id);
  if (!card) return res.status(404).json({ error: 'Card not found' });

  const { front, back } = req.body;
  db.prepare('UPDATE cards SET front = COALESCE(?, front), back = COALESCE(?, back) WHERE id = ?').run(front, back, card.id);

  res.json(db.prepare('SELECT * FROM cards WHERE id = ?').get(card.id));
});

// DELETE card
router.delete('/:deckId/cards/:cardId', (req, res) => {
  const deck = db.prepare('SELECT * FROM decks WHERE id = ? AND user_id = ?').get(req.params.deckId, req.userId);
  if (!deck) return res.status(404).json({ error: 'Deck not found' });

  const result = db.prepare('DELETE FROM cards WHERE id = ? AND deck_id = ?').run(req.params.cardId, deck.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Card not found' });
  res.json({ success: true });
});

// Record card study result
router.post('/:deckId/cards/:cardId/study', (req, res) => {
  const deck = db.prepare('SELECT * FROM decks WHERE id = ? AND user_id = ?').get(req.params.deckId, req.userId);
  if (!deck) return res.status(404).json({ error: 'Deck not found' });

  const card = db.prepare('SELECT * FROM cards WHERE id = ? AND deck_id = ?').get(req.params.cardId, deck.id);
  if (!card) return res.status(404).json({ error: 'Card not found' });

  const { correct } = req.body;
  const delta = correct ? 0.15 : -0.2;
  const newMastery = Math.max(0, Math.min(1, card.mastery + delta));

  db.prepare('UPDATE cards SET mastery = ?, last_reviewed = ? WHERE id = ?').run(newMastery, Date.now(), card.id);
  db.prepare('UPDATE decks SET last_studied = ? WHERE id = ?').run(Date.now(), deck.id);

  res.json({ mastery: newMastery });
});

module.exports = router;
