const express = require('express');
const { randomUUID: uuid } = require('crypto');
const db = require('../db.cjs');
const { auth } = require('../middleware.cjs');

const router = express.Router();
router.use(auth);

function generateInviteCode() {
  return uuid().slice(0, 8).toUpperCase();
}

// GET /api/courses — list user's courses
router.get('/', (req, res) => {
  const courses = db.prepare(`
    SELECT c.*, cm.role,
      (SELECT COUNT(*) FROM course_members WHERE course_id = c.id) as member_count,
      (SELECT COUNT(*) FROM notes WHERE course_id = c.id) as note_count,
      (SELECT COUNT(*) FROM course_decks WHERE course_id = c.id) as deck_count,
      u.username as created_by_name
    FROM courses c
    JOIN course_members cm ON cm.course_id = c.id AND cm.user_id = ?
    JOIN users u ON u.id = c.created_by
    ORDER BY c.created_at DESC
  `).all(req.userId);
  res.json(courses);
});

// POST /api/courses — create course
router.post('/', (req, res) => {
  const { name, description, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Course name is required' });

  const id = uuid();
  const inviteCode = generateInviteCode();

  db.prepare('INSERT INTO courses (id, name, description, color, created_by, invite_code) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, name.trim(), description || '', color || '#2563EB', req.userId, inviteCode);

  // Creator is auto-added as owner
  db.prepare('INSERT INTO course_members (id, course_id, user_id, role) VALUES (?, ?, ?, ?)')
    .run(uuid(), id, req.userId, 'owner');

  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
  res.status(201).json(course);
});

// POST /api/courses/join — join by invite code
router.post('/join', (req, res) => {
  const { inviteCode } = req.body;
  if (!inviteCode?.trim()) return res.status(400).json({ error: 'Invite code is required' });

  const course = db.prepare('SELECT * FROM courses WHERE invite_code = ?').get(inviteCode.trim().toUpperCase());
  if (!course) return res.status(404).json({ error: 'Invalid invite code' });

  const existing = db.prepare('SELECT * FROM course_members WHERE course_id = ? AND user_id = ?').get(course.id, req.userId);
  if (existing) return res.status(400).json({ error: 'Already a member of this course' });

  db.prepare('INSERT INTO course_members (id, course_id, user_id, role) VALUES (?, ?, ?, ?)')
    .run(uuid(), course.id, req.userId, 'member');

  res.json(course);
});

// GET /api/courses/:id — get course details
router.get('/:id', (req, res) => {
  const membership = db.prepare('SELECT * FROM course_members WHERE course_id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!membership) return res.status(403).json({ error: 'Not a member of this course' });

  const course = db.prepare('SELECT c.*, u.username as created_by_name FROM courses c JOIN users u ON u.id = c.created_by WHERE c.id = ?')
    .get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const members = db.prepare(`
    SELECT cm.*, u.username, u.email
    FROM course_members cm JOIN users u ON u.id = cm.user_id
    WHERE cm.course_id = ? ORDER BY cm.role DESC, cm.joined_at
  `).all(req.params.id);

  const notes = db.prepare(`
    SELECT n.*, u.username as created_by_name,
      (SELECT u2.username FROM users u2 WHERE u2.id = n.last_edited_by) as last_edited_by_name
    FROM notes n JOIN users u ON u.id = n.created_by
    WHERE n.course_id = ? ORDER BY n.updated_at DESC
  `).all(req.params.id);

  const decks = db.prepare(`
    SELECT cd.*, d.name as deck_name, d.color as deck_color, d.description as deck_description,
      u.username as added_by_name,
      (SELECT COUNT(*) FROM cards WHERE deck_id = d.id) as card_count
    FROM course_decks cd
    JOIN decks d ON d.id = cd.deck_id
    JOIN users u ON u.id = cd.added_by
    WHERE cd.course_id = ? ORDER BY cd.created_at DESC
  `).all(req.params.id);

  res.json({ ...course, members, notes, decks, role: membership.role });
});

// PUT /api/courses/:id — update course
router.put('/:id', (req, res) => {
  const membership = db.prepare('SELECT * FROM course_members WHERE course_id = ? AND user_id = ? AND role = ?')
    .get(req.params.id, req.userId, 'owner');
  if (!membership) return res.status(403).json({ error: 'Only the owner can update this course' });

  const { name, description, color } = req.body;
  db.prepare('UPDATE courses SET name = COALESCE(?, name), description = COALESCE(?, description), color = COALESCE(?, color) WHERE id = ?')
    .run(name || null, description !== undefined ? description : null, color || null, req.params.id);

  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  res.json(course);
});

// DELETE /api/courses/:id
router.delete('/:id', (req, res) => {
  const membership = db.prepare('SELECT * FROM course_members WHERE course_id = ? AND user_id = ? AND role = ?')
    .get(req.params.id, req.userId, 'owner');
  if (!membership) return res.status(403).json({ error: 'Only the owner can delete this course' });

  db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST /api/courses/:id/leave
router.post('/:id/leave', (req, res) => {
  const membership = db.prepare('SELECT * FROM course_members WHERE course_id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!membership) return res.status(404).json({ error: 'Not a member' });
  if (membership.role === 'owner') return res.status(400).json({ error: 'Owner cannot leave. Delete the course instead.' });

  db.prepare('DELETE FROM course_members WHERE course_id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// ── COURSE DECKS ──

// POST /api/courses/:id/decks — link a deck to course
router.post('/:id/decks', (req, res) => {
  const membership = db.prepare('SELECT * FROM course_members WHERE course_id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!membership) return res.status(403).json({ error: 'Not a member' });

  const { deckId } = req.body;
  const deck = db.prepare('SELECT * FROM decks WHERE id = ? AND user_id = ?').get(deckId, req.userId);
  if (!deck) return res.status(404).json({ error: 'Deck not found' });

  const existing = db.prepare('SELECT * FROM course_decks WHERE course_id = ? AND deck_id = ?')
    .get(req.params.id, deckId);
  if (existing) return res.status(400).json({ error: 'Deck already in course' });

  db.prepare('INSERT INTO course_decks (id, course_id, deck_id, added_by) VALUES (?, ?, ?, ?)')
    .run(uuid(), req.params.id, deckId, req.userId);

  res.status(201).json({ success: true });
});

// DELETE /api/courses/:courseId/decks/:deckId
router.delete('/:courseId/decks/:deckId', (req, res) => {
  const membership = db.prepare('SELECT * FROM course_members WHERE course_id = ? AND user_id = ?')
    .get(req.params.courseId, req.userId);
  if (!membership) return res.status(403).json({ error: 'Not a member' });

  db.prepare('DELETE FROM course_decks WHERE course_id = ? AND deck_id = ?')
    .run(req.params.courseId, req.params.deckId);
  res.json({ success: true });
});

// ── NOTES ──

// POST /api/courses/:id/notes — create a note
router.post('/:id/notes', (req, res) => {
  const membership = db.prepare('SELECT * FROM course_members WHERE course_id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!membership) return res.status(403).json({ error: 'Not a member' });

  const { title } = req.body;
  const id = uuid();
  const now = Date.now();

  db.prepare('INSERT INTO notes (id, course_id, title, content, created_by, last_edited_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.params.id, title || 'Untitled Note', '', req.userId, req.userId, now, now);

  const note = db.prepare(`
    SELECT n.*, u.username as created_by_name
    FROM notes n JOIN users u ON u.id = n.created_by WHERE n.id = ?
  `).get(id);

  res.status(201).json(note);
});

// GET /api/courses/:courseId/notes/:noteId
router.get('/:courseId/notes/:noteId', (req, res) => {
  const membership = db.prepare('SELECT * FROM course_members WHERE course_id = ? AND user_id = ?')
    .get(req.params.courseId, req.userId);
  if (!membership) return res.status(403).json({ error: 'Not a member' });

  const note = db.prepare(`
    SELECT n.*, u.username as created_by_name,
      (SELECT u2.username FROM users u2 WHERE u2.id = n.last_edited_by) as last_edited_by_name
    FROM notes n JOIN users u ON u.id = n.created_by WHERE n.id = ? AND n.course_id = ?
  `).get(req.params.noteId, req.params.courseId);

  if (!note) return res.status(404).json({ error: 'Note not found' });
  res.json(note);
});

// PUT /api/courses/:courseId/notes/:noteId
router.put('/:courseId/notes/:noteId', (req, res) => {
  const membership = db.prepare('SELECT * FROM course_members WHERE course_id = ? AND user_id = ?')
    .get(req.params.courseId, req.userId);
  if (!membership) return res.status(403).json({ error: 'Not a member' });

  const { content, title } = req.body;
  const now = Date.now();

  db.prepare('UPDATE notes SET content = COALESCE(?, content), title = COALESCE(?, title), last_edited_by = ?, updated_at = ? WHERE id = ? AND course_id = ?')
    .run(content !== undefined ? content : null, title || null, req.userId, now, req.params.noteId, req.params.courseId);

  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.noteId);
  res.json(note);
});

// DELETE /api/courses/:courseId/notes/:noteId
router.delete('/:courseId/notes/:noteId', (req, res) => {
  const membership = db.prepare('SELECT * FROM course_members WHERE course_id = ? AND user_id = ?')
    .get(req.params.courseId, req.userId);
  if (!membership) return res.status(403).json({ error: 'Not a member' });

  db.prepare('DELETE FROM notes WHERE id = ? AND course_id = ?').run(req.params.noteId, req.params.courseId);
  res.json({ success: true });
});

// POST /api/courses/:courseId/notes/:noteId/history — save a snapshot
router.post('/:courseId/notes/:noteId/history', (req, res) => {
  const membership = db.prepare('SELECT * FROM course_members WHERE course_id = ? AND user_id = ?')
    .get(req.params.courseId, req.userId);
  if (!membership) return res.status(403).json({ error: 'Not a member' });

  const note = db.prepare('SELECT * FROM notes WHERE id = ? AND course_id = ?')
    .get(req.params.noteId, req.params.courseId);
  if (!note) return res.status(404).json({ error: 'Note not found' });

  const id = uuid();
  db.prepare('INSERT INTO note_history (id, note_id, content, title, edited_by) VALUES (?, ?, ?, ?, ?)')
    .run(id, req.params.noteId, note.content, note.title, req.userId);

  res.status(201).json({ id });
});

// GET /api/courses/:courseId/notes/:noteId/history
router.get('/:courseId/notes/:noteId/history', (req, res) => {
  const membership = db.prepare('SELECT * FROM course_members WHERE course_id = ? AND user_id = ?')
    .get(req.params.courseId, req.userId);
  if (!membership) return res.status(403).json({ error: 'Not a member' });

  const history = db.prepare(`
    SELECT nh.*, u.username as edited_by_name
    FROM note_history nh JOIN users u ON u.id = nh.edited_by
    WHERE nh.note_id = ? ORDER BY nh.created_at DESC LIMIT 100
  `).all(req.params.noteId);

  res.json(history);
});

// PUT /api/courses/:courseId/notes/:noteId/restore/:historyId — restore a version
router.put('/:courseId/notes/:noteId/restore/:historyId', (req, res) => {
  const membership = db.prepare('SELECT * FROM course_members WHERE course_id = ? AND user_id = ?')
    .get(req.params.courseId, req.userId);
  if (!membership) return res.status(403).json({ error: 'Not a member' });

  const snapshot = db.prepare('SELECT * FROM note_history WHERE id = ? AND note_id = ?')
    .get(req.params.historyId, req.params.noteId);
  if (!snapshot) return res.status(404).json({ error: 'History entry not found' });

  // Save current state first
  const current = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.noteId);
  db.prepare('INSERT INTO note_history (id, note_id, content, title, edited_by) VALUES (?, ?, ?, ?, ?)')
    .run(uuid(), req.params.noteId, current.content, current.title, req.userId);

  // Restore
  const now = Date.now();
  db.prepare('UPDATE notes SET content = ?, title = ?, last_edited_by = ?, updated_at = ? WHERE id = ?')
    .run(snapshot.content, snapshot.title, req.userId, now, req.params.noteId);

  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.noteId);
  res.json(note);
});

module.exports = router;
