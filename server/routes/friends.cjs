const express = require('express');
const { randomUUID: uuid } = require('crypto');
const db = require('../db.cjs');
const { auth } = require('../middleware.cjs');

const router = express.Router();
router.use(auth);

// Search users by username
router.get('/search', (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);

  const users = db.prepare(`
    SELECT id, username, email FROM users
    WHERE (username LIKE ? OR email LIKE ?) AND id != ?
    LIMIT 20
  `).all(`%${q}%`, `%${q}%`, req.userId);

  // Attach friendship status
  const result = users.map(u => {
    const friendship = db.prepare(`
      SELECT * FROM friendships
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
    `).get(req.userId, u.id, u.id, req.userId);

    return {
      id: u.id,
      username: u.username,
      friendship_status: friendship ? friendship.status : null,
      is_sender: friendship ? friendship.user_id === req.userId : false,
    };
  });

  res.json(result);
});

// Get friends list (accepted)
router.get('/', (req, res) => {
  const friends = db.prepare(`
    SELECT u.id, u.username, u.email, f.created_at as friends_since
    FROM friendships f
    JOIN users u ON (
      CASE WHEN f.user_id = ? THEN u.id = f.friend_id
           ELSE u.id = f.user_id END
    )
    WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'
  `).all(req.userId, req.userId, req.userId);

  // Get stats for each friend
  const result = friends.map(f => {
    const stats = db.prepare(`
      SELECT COUNT(*) as deck_count,
        (SELECT COUNT(*) FROM cards c JOIN decks d ON c.deck_id = d.id WHERE d.user_id = ?) as card_count
      FROM decks WHERE user_id = ?
    `).get(f.id, f.id);

    return { ...f, deck_count: stats.deck_count, card_count: stats.card_count };
  });

  res.json(result);
});

// Get pending friend requests (received)
router.get('/requests', (req, res) => {
  const requests = db.prepare(`
    SELECT f.id, f.created_at, u.id as user_id, u.username, u.email
    FROM friendships f JOIN users u ON f.user_id = u.id
    WHERE f.friend_id = ? AND f.status = 'pending'
    ORDER BY f.created_at DESC
  `).all(req.userId);

  res.json(requests);
});

// Get sent friend requests
router.get('/requests/sent', (req, res) => {
  const sent = db.prepare(`
    SELECT f.id, f.created_at, u.id as user_id, u.username, u.email
    FROM friendships f JOIN users u ON f.friend_id = u.id
    WHERE f.user_id = ? AND f.status = 'pending'
    ORDER BY f.created_at DESC
  `).all(req.userId);

  res.json(sent);
});

// Send friend request
router.post('/request', (req, res) => {
  const { userId: friendId } = req.body;
  if (!friendId) return res.status(400).json({ error: 'User ID required' });
  if (friendId === req.userId) return res.status(400).json({ error: 'Cannot friend yourself' });

  const friend = db.prepare('SELECT id FROM users WHERE id = ?').get(friendId);
  if (!friend) return res.status(404).json({ error: 'User not found' });

  const existing = db.prepare(`
    SELECT * FROM friendships
    WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
  `).get(req.userId, friendId, friendId, req.userId);

  if (existing) {
    if (existing.status === 'accepted') return res.status(409).json({ error: 'Already friends' });
    return res.status(409).json({ error: 'Request already exists' });
  }

  const id = uuid();
  db.prepare('INSERT INTO friendships (id, user_id, friend_id, status) VALUES (?, ?, ?, ?)').run(id, req.userId, friendId, 'pending');

  res.status(201).json({ id, status: 'pending' });
});

// Accept friend request
router.put('/request/:id/accept', (req, res) => {
  const request = db.prepare('SELECT * FROM friendships WHERE id = ? AND friend_id = ? AND status = ?').get(req.params.id, req.userId, 'pending');
  if (!request) return res.status(404).json({ error: 'Request not found' });

  db.prepare('UPDATE friendships SET status = ? WHERE id = ?').run('accepted', request.id);
  res.json({ success: true });
});

// Decline friend request
router.delete('/request/:id', (req, res) => {
  const result = db.prepare('DELETE FROM friendships WHERE id = ? AND (friend_id = ? OR user_id = ?)').run(req.params.id, req.userId, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Request not found' });
  res.json({ success: true });
});

// Remove friend
router.delete('/:friendId', (req, res) => {
  const result = db.prepare(`
    DELETE FROM friendships
    WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)) AND status = 'accepted'
  `).run(req.userId, req.params.friendId, req.params.friendId, req.userId);

  if (result.changes === 0) return res.status(404).json({ error: 'Friendship not found' });

  // Also remove shared decks between them
  db.prepare(`
    DELETE FROM shared_decks
    WHERE (owner_id = ? AND shared_with = ?) OR (owner_id = ? AND shared_with = ?)
  `).run(req.userId, req.params.friendId, req.params.friendId, req.userId);

  res.json({ success: true });
});

// Share a deck with a friend
router.post('/share-deck', (req, res) => {
  const { deckId, friendId } = req.body;
  if (!deckId || !friendId) return res.status(400).json({ error: 'deckId and friendId required' });

  // Verify ownership
  const deck = db.prepare('SELECT * FROM decks WHERE id = ? AND user_id = ?').get(deckId, req.userId);
  if (!deck) return res.status(404).json({ error: 'Deck not found' });

  // Verify friendship
  const friendship = db.prepare(`
    SELECT * FROM friendships
    WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)) AND status = 'accepted'
  `).get(req.userId, friendId, friendId, req.userId);
  if (!friendship) return res.status(403).json({ error: 'Not friends with this user' });

  // Check if already shared
  const existing = db.prepare('SELECT * FROM shared_decks WHERE deck_id = ? AND shared_with = ?').get(deckId, friendId);
  if (existing) return res.status(409).json({ error: 'Deck already shared' });

  const id = uuid();
  db.prepare('INSERT INTO shared_decks (id, deck_id, owner_id, shared_with) VALUES (?, ?, ?, ?)').run(id, deckId, req.userId, friendId);

  res.status(201).json({ success: true });
});

// Get decks shared with me
router.get('/shared-decks', (req, res) => {
  const shared = db.prepare(`
    SELECT d.*, u.username as owner_name, sd.created_at as shared_at,
      (SELECT COUNT(*) FROM cards WHERE deck_id = d.id) as card_count,
      (SELECT COALESCE(AVG(mastery), 0) FROM cards WHERE deck_id = d.id) as avg_mastery
    FROM shared_decks sd
    JOIN decks d ON sd.deck_id = d.id
    JOIN users u ON sd.owner_id = u.id
    WHERE sd.shared_with = ?
    ORDER BY sd.created_at DESC
  `).all(req.userId);

  res.json(shared);
});

// ─── CHALLENGES ───

// Create challenge
router.post('/challenge', (req, res) => {
  const { deckId, opponentId } = req.body;
  if (!deckId || !opponentId) return res.status(400).json({ error: 'deckId and opponentId required' });

  // Verify deck access (own or shared)
  const deck = db.prepare('SELECT * FROM decks WHERE id = ?').get(deckId);
  if (!deck) return res.status(404).json({ error: 'Deck not found' });

  const hasAccess = deck.user_id === req.userId ||
    db.prepare('SELECT 1 FROM shared_decks WHERE deck_id = ? AND shared_with = ?').get(deckId, req.userId);
  if (!hasAccess) return res.status(403).json({ error: 'No access to this deck' });

  // Verify friendship
  const friendship = db.prepare(`
    SELECT * FROM friendships
    WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)) AND status = 'accepted'
  `).get(req.userId, opponentId, opponentId, req.userId);
  if (!friendship) return res.status(403).json({ error: 'Not friends with this user' });

  const id = uuid();
  db.prepare(`INSERT INTO challenges (id, deck_id, challenger_id, opponent_id, status) VALUES (?, ?, ?, ?, 'pending')`).run(id, deckId, req.userId, opponentId);

  const challenge = db.prepare(`
    SELECT c.*, d.name as deck_name,
      u1.username as challenger_name, u2.username as opponent_name
    FROM challenges c
    JOIN decks d ON c.deck_id = d.id
    JOIN users u1 ON c.challenger_id = u1.id
    JOIN users u2 ON c.opponent_id = u2.id
    WHERE c.id = ?
  `).get(id);

  res.status(201).json(challenge);
});

// Get my challenges
router.get('/challenges', (req, res) => {
  const challenges = db.prepare(`
    SELECT c.*, d.name as deck_name,
      u1.username as challenger_name, u2.username as opponent_name,
      (SELECT COUNT(*) FROM cards WHERE deck_id = c.deck_id) as card_count
    FROM challenges c
    JOIN decks d ON c.deck_id = d.id
    JOIN users u1 ON c.challenger_id = u1.id
    JOIN users u2 ON c.opponent_id = u2.id
    WHERE c.challenger_id = ? OR c.opponent_id = ?
    ORDER BY c.created_at DESC
    LIMIT 50
  `).all(req.userId, req.userId);

  res.json(challenges);
});

// Submit challenge score
router.put('/challenge/:id/score', (req, res) => {
  const { score, total } = req.body;
  if (score == null || total == null) return res.status(400).json({ error: 'score and total required' });

  const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(req.params.id);
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

  const isChallenger = challenge.challenger_id === req.userId;
  const isOpponent = challenge.opponent_id === req.userId;
  if (!isChallenger && !isOpponent) return res.status(403).json({ error: 'Not part of this challenge' });

  if (isChallenger) {
    if (challenge.challenger_score != null) return res.status(409).json({ error: 'Score already submitted' });
    db.prepare('UPDATE challenges SET challenger_score = ?, challenger_total = ?, status = CASE WHEN opponent_score IS NOT NULL THEN ? ELSE ? END WHERE id = ?')
      .run(score, total, 'completed', 'in_progress', challenge.id);
  } else {
    if (challenge.opponent_score != null) return res.status(409).json({ error: 'Score already submitted' });
    db.prepare('UPDATE challenges SET opponent_score = ?, opponent_total = ?, status = CASE WHEN challenger_score IS NOT NULL THEN ? ELSE ? END WHERE id = ?')
      .run(score, total, 'completed', 'in_progress', challenge.id);
  }

  const updated = db.prepare(`
    SELECT c.*, d.name as deck_name,
      u1.username as challenger_name, u2.username as opponent_name
    FROM challenges c
    JOIN decks d ON c.deck_id = d.id
    JOIN users u1 ON c.challenger_id = u1.id
    JOIN users u2 ON c.opponent_id = u2.id
    WHERE c.id = ?
  `).get(challenge.id);

  res.json(updated);
});

module.exports = router;
