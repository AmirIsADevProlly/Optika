const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'optika.db'));

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch() * 1000),
    anthropic_key TEXT,
    api_provider TEXT DEFAULT 'anthropic',
    openrouter_key TEXT
  );

  CREATE TABLE IF NOT EXISTS decks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    color TEXT DEFAULT '#B45309',
    created_at INTEGER DEFAULT (unixepoch() * 1000),
    last_studied INTEGER,
    study_sessions INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    mastery REAL DEFAULT 0,
    last_reviewed INTEGER,
    created_at INTEGER DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE IF NOT EXISTS uploads (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT,
    size INTEGER,
    status TEXT DEFAULT 'pending',
    deck_id TEXT REFERENCES decks(id) ON DELETE SET NULL,
    cards_generated INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE IF NOT EXISTS friendships (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    created_at INTEGER DEFAULT (unixepoch() * 1000),
    UNIQUE(user_id, friend_id)
  );

  CREATE TABLE IF NOT EXISTS shared_decks (
    id TEXT PRIMARY KEY,
    deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_with TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER DEFAULT (unixepoch() * 1000),
    UNIQUE(deck_id, shared_with)
  );

  CREATE TABLE IF NOT EXISTS challenges (
    id TEXT PRIMARY KEY,
    deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    challenger_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    opponent_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenger_score INTEGER,
    opponent_score INTEGER,
    challenger_total INTEGER,
    opponent_total INTEGER,
    status TEXT DEFAULT 'pending',
    created_at INTEGER DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    color TEXT DEFAULT '#2563EB',
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE NOT NULL,
    created_at INTEGER DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE IF NOT EXISTS course_members (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    joined_at INTEGER DEFAULT (unixepoch() * 1000),
    UNIQUE(course_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS course_decks (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    added_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER DEFAULT (unixepoch() * 1000),
    UNIQUE(course_id, deck_id)
  );

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled Note',
    content TEXT DEFAULT '',
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_edited_by TEXT REFERENCES users(id),
    created_at INTEGER DEFAULT (unixepoch() * 1000),
    updated_at INTEGER DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE IF NOT EXISTS note_history (
    id TEXT PRIMARY KEY,
    note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    title TEXT NOT NULL,
    edited_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER DEFAULT (unixepoch() * 1000)
  );

  CREATE INDEX IF NOT EXISTS idx_decks_user ON decks(user_id);
  CREATE INDEX IF NOT EXISTS idx_cards_deck ON cards(deck_id);
  CREATE INDEX IF NOT EXISTS idx_uploads_user ON uploads(user_id);
  CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
  CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
  CREATE INDEX IF NOT EXISTS idx_shared_decks_shared ON shared_decks(shared_with);
  CREATE INDEX IF NOT EXISTS idx_challenges_opponent ON challenges(opponent_id);
  CREATE INDEX IF NOT EXISTS idx_course_members_course ON course_members(course_id);
  CREATE INDEX IF NOT EXISTS idx_course_members_user ON course_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_course_decks_course ON course_decks(course_id);
  CREATE INDEX IF NOT EXISTS idx_notes_course ON notes(course_id);
  CREATE INDEX IF NOT EXISTS idx_note_history_note ON note_history(note_id);
`);

module.exports = db;
