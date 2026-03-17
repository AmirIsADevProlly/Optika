import { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, FileText, Layers, Users, Plus, Copy, Check, Trash2, LogOut, X, Share2 } from 'lucide-react';
import useStore from '../store';
import * as api from '../api';
import { getSocket } from '../socket';

export default function CourseView() {
  const { navigate, currentDeckId: courseId, decks, user } = useStore();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('notes');
  const [copied, setCopied] = useState(false);
  const [showNewNote, setShowNewNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [showAddDeck, setShowAddDeck] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const data = await api.fetchCourse(courseId);
      setCourse(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const socket = getSocket();
    if (socket) {
      socket.emit('join-course', { courseId });
      socket.on('course:note-created', () => load());
      return () => {
        socket.emit('leave-course', { courseId });
        socket.off('course:note-created');
      };
    }
  }, [courseId]);

  const copyInviteCode = () => {
    navigator.clipboard.writeText(course.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateNote = async () => {
    if (!noteTitle.trim()) return;
    try {
      const note = await api.createNote(courseId, noteTitle.trim());
      setShowNewNote(false);
      setNoteTitle('');
      // Notify others
      const socket = getSocket();
      if (socket) socket.emit('course:note-created', { courseId, note });
      navigate('note-editor', `${courseId}:${note.id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddDeck = async (deckId) => {
    try {
      await api.addCourseDeck(courseId, deckId);
      setShowAddDeck(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveDeck = async (deckId) => {
    try {
      await api.removeCourseDeck(courseId, deckId);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await api.deleteNote(courseId, noteId);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLeaveCourse = async () => {
    if (!confirm('Leave this course?')) return;
    try {
      await api.leaveCourse(courseId);
      navigate('courses');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCourse = async () => {
    if (!confirm('Delete this course? This cannot be undone.')) return;
    try {
      await api.deleteCourse(courseId);
      navigate('courses');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="page-body" style={{ textAlign: 'center', paddingTop: 60 }}>
        <div style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-amber)', textTransform: 'uppercase' }}>Loading course...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <>
        <div className="page-header"><h2>Course</h2></div>
        <div className="page-body">
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Course not found.</p>
          <button className="btn btn-sm" onClick={() => navigate('courses')}><ArrowLeft size={14} /> Back</button>
        </div>
      </>
    );
  }

  const isOwner = course.role === 'owner';
  const linkedDeckIds = new Set(course.decks.map(d => d.deck_id));
  const availableDecks = decks.filter(d => !linkedDeckIds.has(d.id));

  const formatTime = (ts) => {
    if (!ts) return 'Never';
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-icon btn-sm" onClick={() => navigate('courses')}>
            <ArrowLeft size={16} />
          </button>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.3rem', color: course.color }}>
              <BookOpen size={18} style={{ verticalAlign: -3, marginRight: 6 }} />
              {course.name}
            </h2>
            {course.description && (
              <div className="header-sub">{course.description}</div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Invite code badge */}
          <button
            className={`btn btn-sm ${copied ? 'btn-success' : ''}`}
            onClick={copyInviteCode}
            title="Copy invite code"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.15em' }}>{course.invite_code}</span>
          </button>

          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            {course.members.length} members
          </span>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {isOwner ? (
              <button className="btn btn-danger btn-sm" onClick={handleDeleteCourse}>
                <Trash2 size={14} /> Delete
              </button>
            ) : (
              <button className="btn btn-sm" onClick={handleLeaveCourse}>
                <LogOut size={14} /> Leave
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Tabs */}
        <div className="course-tabs">
          {[
            { key: 'notes', icon: FileText, label: 'Notes', count: course.notes.length },
            { key: 'decks', icon: Layers, label: 'Decks', count: course.decks.length },
            { key: 'members', icon: Users, label: 'Members', count: course.members.length },
          ].map(t => (
            <button
              key={t.key}
              className={`course-tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <t.icon size={15} />
              {t.label}
              <span className="tab-count">{t.count}</span>
            </button>
          ))}
        </div>

        {error && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-red)', marginBottom: 16 }}>{error}</div>
        )}

        {/* Notes Tab */}
        {tab === 'notes' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Course Notes
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowNewNote(true)}>
                <Plus size={14} /> New Note
              </button>
            </div>

            {course.notes.length === 0 ? (
              <div className="empty-state">
                <FileText />
                <p>No notes yet — create one to start collaborating</p>
              </div>
            ) : (
              <div className="note-list">
                {course.notes.map(note => (
                  <div
                    key={note.id}
                    className="note-list-item"
                    onClick={() => navigate('note-editor', `${courseId}:${note.id}`)}
                  >
                    <div className="note-item-icon">
                      <FileText size={18} />
                    </div>
                    <div className="note-item-body">
                      <div className="note-item-title">{note.title}</div>
                      <div className="note-item-meta">
                        Created by {note.created_by_name}
                        {note.last_edited_by_name && note.last_edited_by_name !== note.created_by_name && (
                          <> &bull; Last edited by {note.last_edited_by_name}</>
                        )}
                        &bull; {formatTime(note.updated_at)}
                      </div>
                    </div>
                    <div className="note-item-preview">
                      {note.content ? note.content.slice(0, 80).replace(/\n/g, ' ') + (note.content.length > 80 ? '...' : '') : 'Empty note'}
                    </div>
                    <button
                      className="btn btn-icon btn-sm"
                      onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                      title="Delete note"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Decks Tab */}
        {tab === 'decks' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Shared Decks
              </div>
              <button className="btn btn-sm" onClick={() => setShowAddDeck(true)}>
                <Share2 size={14} /> Link Deck
              </button>
            </div>

            {course.decks.length === 0 ? (
              <div className="empty-state">
                <Layers />
                <p>No decks linked — share a deck to study together</p>
              </div>
            ) : (
              <div className="deck-grid">
                {course.decks.map(cd => (
                  <div key={cd.id} className="deck-card">
                    <div style={{ height: 4, background: cd.deck_color }} />
                    <div className="deck-card-body" style={{ cursor: 'pointer' }} onClick={() => navigate('deck-editor', cd.deck_id)}>
                      <div className="deck-card-name">{cd.deck_name}</div>
                      {cd.deck_description && <div className="deck-card-desc">{cd.deck_description}</div>}
                      <div className="deck-card-meta">
                        <span><Layers size={13} /> {cd.card_count} cards</span>
                        <span>Added by {cd.added_by_name}</span>
                      </div>
                    </div>
                    <div className="deck-card-footer" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-danger btn-sm" onClick={() => handleRemoveDeck(cd.deck_id)}>
                        <X size={12} /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Members Tab */}
        {tab === 'members' && (
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>
              Members ({course.members.length})
            </div>
            <div className="member-list">
              {course.members.map(m => (
                <div key={m.id} className="member-item">
                  <div className="member-avatar" style={{ background: m.user_id === course.created_by ? course.color : 'var(--bg-elevated)' }}>
                    {m.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="member-info">
                    <div className="member-name">
                      {m.username}
                      {m.user_id === user?.id && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: 6 }}>(you)</span>
                      )}
                    </div>
                    <div className="member-role">{m.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* New Note Modal */}
      {showNewNote && (
        <div className="modal-overlay" onClick={() => setShowNewNote(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span>New Note</span>
              <button className="btn btn-icon btn-sm" onClick={() => setShowNewNote(false)}><X size={14} /></button>
            </div>
            <div className="modal-body">
              <label className="label">Title</label>
              <input className="input" value={noteTitle} onChange={e => setNoteTitle(e.target.value)}
                placeholder="e.g. Lecture 1 — Introduction" autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreateNote()} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-sm" onClick={() => setShowNewNote(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleCreateNote} disabled={!noteTitle.trim()}>
                <Plus size={14} /> Create Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Deck Modal */}
      {showAddDeck && (
        <div className="modal-overlay" onClick={() => setShowAddDeck(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span>Link a Deck</span>
              <button className="btn btn-icon btn-sm" onClick={() => setShowAddDeck(false)}><X size={14} /></button>
            </div>
            <div className="modal-body">
              {availableDecks.length === 0 ? (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
                  No decks available to link. All your decks are already in this course.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                  {availableDecks.map(d => (
                    <button key={d.id} className="btn btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => handleAddDeck(d.id)}>
                      <Layers size={14} style={{ color: d.color }} />
                      {d.name}
                      <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>{d.card_count || 0} cards</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
