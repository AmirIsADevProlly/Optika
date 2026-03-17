import { useState, useEffect } from 'react';
import { BookOpen, Plus, LogIn, Users, FileText, Layers, X } from 'lucide-react';
import useStore from '../store';
import * as api from '../api';

export default function Courses() {
  const { navigate } = useStore();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [color, setColor] = useState('#2563EB');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');

  const colors = ['#2563EB', '#7C3AED', '#DC2626', '#16A34A', '#D97706', '#0D9488', '#DB2777', '#4F46E5'];

  const load = async () => {
    try {
      const data = await api.fetchCourses();
      setCourses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setError('');
    try {
      const course = await api.createCourse(name.trim(), desc.trim(), color);
      setShowCreate(false);
      setName('');
      setDesc('');
      navigate('course-view', course.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setError('');
    try {
      const course = await api.joinCourse(inviteCode.trim());
      setShowJoin(false);
      setInviteCode('');
      navigate('course-view', course.id);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.6rem' }}>
            <BookOpen size={22} style={{ verticalAlign: -4, marginRight: 8, color: 'var(--accent-blue)' }} />
            Courses
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm" onClick={() => { setShowJoin(true); setError(''); }}>
              <LogIn size={14} /> Join Course
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => { setShowCreate(true); setError(''); }}>
              <Plus size={14} /> New Course
            </button>
          </div>
        </div>
        <div className="header-sub">Collaborate with others on notes and decks in real-time</div>
      </div>

      <div className="page-body">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, fontFamily: 'var(--font-display)', color: 'var(--accent-amber)', textTransform: 'uppercase' }}>
            Loading courses...
          </div>
        ) : courses.length === 0 ? (
          <div className="empty-state">
            <BookOpen />
            <p>No courses yet</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="btn btn-sm" onClick={() => setShowJoin(true)}>
                <LogIn size={14} /> Join with Code
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
                <Plus size={14} /> Create Course
              </button>
            </div>
          </div>
        ) : (
          <div className="deck-grid">
            {courses.map(course => (
              <div
                key={course.id}
                className="deck-card"
                onClick={() => navigate('course-view', course.id)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ height: 4, background: course.color }} />
                <div className="deck-card-body">
                  <div className="deck-card-name" style={{ color: course.color }}>
                    {course.name}
                  </div>
                  {course.description && (
                    <div className="deck-card-desc">{course.description}</div>
                  )}
                  <div className="deck-card-meta">
                    <span><Users size={13} /> {course.member_count} members</span>
                    <span><FileText size={13} /> {course.note_count} notes</span>
                    <span><Layers size={13} /> {course.deck_count} decks</span>
                  </div>
                </div>
                <div className="deck-card-footer">
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.65rem',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}>
                    {course.role === 'owner' ? 'Owner' : 'Member'} &bull; by {course.created_by_name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span>Create Course</span>
              <button className="btn btn-icon btn-sm" onClick={() => setShowCreate(false)}><X size={14} /></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 16 }}>
                <label className="label">Course Name</label>
                <input className="input" value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Biology 101" autoFocus />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="label">Description</label>
                <textarea className="input" value={desc} onChange={e => setDesc(e.target.value)}
                  placeholder="What is this course about?" rows={2} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="label">Color</label>
                <div className="color-options">
                  {colors.map(c => (
                    <div key={c} className={`color-swatch ${color === c ? 'active' : ''}`}
                      style={{ background: c }} onClick={() => setColor(c)} />
                  ))}
                </div>
              </div>
              {error && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-red)', marginBottom: 8 }}>{error}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={!name.trim()}>
                <Plus size={14} /> Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {showJoin && (
        <div className="modal-overlay" onClick={() => setShowJoin(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span>Join Course</span>
              <button className="btn btn-icon btn-sm" onClick={() => setShowJoin(false)}><X size={14} /></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 16 }}>
                <label className="label">Invite Code</label>
                <input className="input" value={inviteCode} onChange={e => setInviteCode(e.target.value)}
                  placeholder="Enter 8-character code" autoFocus
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', textAlign: 'center', letterSpacing: '0.2em', textTransform: 'uppercase' }} />
              </div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Ask a course member for their invite code
              </p>
              {error && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-red)', marginTop: 8, textAlign: 'center' }}>{error}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-sm" onClick={() => setShowJoin(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleJoin} disabled={!inviteCode.trim()}>
                <LogIn size={14} /> Join
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
