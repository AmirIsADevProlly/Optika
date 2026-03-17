const db = require('./db.cjs');
const { randomUUID: uuid } = require('crypto');

function setupSocket(io) {
  // Track who's in which room
  const roomPresence = new Map(); // roomId -> Map<socketId, {userId, username}>

  function getRoomUsers(roomId) {
    const room = roomPresence.get(roomId);
    if (!room) return [];
    const seen = new Set();
    const users = [];
    for (const [, u] of room) {
      if (!seen.has(u.userId)) {
        seen.add(u.userId);
        users.push(u);
      }
    }
    return users;
  }

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.username} (${socket.userId})`);

    // ── JOIN/LEAVE ROOMS ──
    socket.on('join-note', ({ noteId }) => {
      const room = `note:${noteId}`;
      socket.join(room);
      if (!roomPresence.has(room)) roomPresence.set(room, new Map());
      roomPresence.get(room).set(socket.id, { userId: socket.userId, username: socket.username });
      io.to(room).emit('note:presence', getRoomUsers(room));
    });

    socket.on('leave-note', ({ noteId }) => {
      const room = `note:${noteId}`;
      socket.leave(room);
      if (roomPresence.has(room)) {
        roomPresence.get(room).delete(socket.id);
        if (roomPresence.get(room).size === 0) roomPresence.delete(room);
      }
      io.to(room).emit('note:presence', getRoomUsers(room));
    });

    socket.on('join-deck', ({ deckId }) => {
      const room = `deck:${deckId}`;
      socket.join(room);
      if (!roomPresence.has(room)) roomPresence.set(room, new Map());
      roomPresence.get(room).set(socket.id, { userId: socket.userId, username: socket.username });
      io.to(room).emit('deck:presence', getRoomUsers(room));
    });

    socket.on('leave-deck', ({ deckId }) => {
      const room = `deck:${deckId}`;
      socket.leave(room);
      if (roomPresence.has(room)) {
        roomPresence.get(room).delete(socket.id);
        if (roomPresence.get(room).size === 0) roomPresence.delete(room);
      }
      io.to(room).emit('deck:presence', getRoomUsers(room));
    });

    socket.on('join-course', ({ courseId }) => {
      socket.join(`course:${courseId}`);
    });

    socket.on('leave-course', ({ courseId }) => {
      socket.leave(`course:${courseId}`);
    });

    // ── NOTE EDITING (real-time) ──
    socket.on('note:update', ({ noteId, content, title }) => {
      const room = `note:${noteId}`;
      // Save to DB
      const now = Date.now();
      db.prepare('UPDATE notes SET content = ?, title = ?, last_edited_by = ?, updated_at = ? WHERE id = ?')
        .run(content, title, socket.userId, now, noteId);

      // Broadcast to others in the room
      socket.to(room).emit('note:updated', {
        noteId,
        content,
        title,
        editedBy: { userId: socket.userId, username: socket.username },
        updatedAt: now,
      });
    });

    socket.on('note:cursor', ({ noteId, position, selection }) => {
      const room = `note:${noteId}`;
      socket.to(room).emit('note:cursor-moved', {
        userId: socket.userId,
        username: socket.username,
        position,
        selection,
      });
    });

    socket.on('note:save-history', ({ noteId }) => {
      // Snapshot current state into history
      const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId);
      if (note) {
        db.prepare('INSERT INTO note_history (id, note_id, content, title, edited_by) VALUES (?, ?, ?, ?, ?)')
          .run(uuid(), noteId, note.content, note.title, socket.userId);
      }
    });

    // ── DECK COLLABORATION (real-time) ──
    socket.on('deck:card-added', ({ deckId, card }) => {
      socket.to(`deck:${deckId}`).emit('deck:card-added', { card, addedBy: socket.username });
    });

    socket.on('deck:card-updated', ({ deckId, card }) => {
      socket.to(`deck:${deckId}`).emit('deck:card-updated', { card, updatedBy: socket.username });
    });

    socket.on('deck:card-deleted', ({ deckId, cardId }) => {
      socket.to(`deck:${deckId}`).emit('deck:card-deleted', { cardId, deletedBy: socket.username });
    });

    // ── COURSE EVENTS ──
    socket.on('course:note-created', ({ courseId, note }) => {
      socket.to(`course:${courseId}`).emit('course:note-created', { note, createdBy: socket.username });
    });

    // ── DISCONNECT ──
    socket.on('disconnect', () => {
      // Clean up presence from all rooms
      for (const [roomId, members] of roomPresence) {
        if (members.has(socket.id)) {
          members.delete(socket.id);
          if (members.size === 0) {
            roomPresence.delete(roomId);
          } else {
            io.to(roomId).emit(
              roomId.startsWith('note:') ? 'note:presence' : 'deck:presence',
              getRoomUsers(roomId)
            );
          }
        }
      }
    });
  });
}

module.exports = { setupSocket };
