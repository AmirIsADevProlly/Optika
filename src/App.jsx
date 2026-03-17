import { useEffect } from 'react';
import { Eye, LayoutDashboard, Layers, Upload, Settings as SettingsIcon, Users, BookOpen } from 'lucide-react';
import useStore from './store';
import { getSocket, disconnectSocket } from './socket';
import { loadSavedTheme } from './themes';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import DeckEditor from './pages/DeckEditor';
import StudyMode from './pages/StudyMode';
import LearnMode from './pages/LearnMode';
import TestMode from './pages/TestMode';
import UploadPage from './pages/Upload';
import Settings from './pages/Settings';
import Friends from './pages/Friends';
import ChallengePlay from './pages/ChallengePlay';
import Courses from './pages/Courses';
import CourseView from './pages/CourseView';
import NoteEditor from './pages/NoteEditor';

function App() {
  const {
    isAuthenticated, authLoading, initAuth, logout,
    currentView, navigate, decks, currentDeckId,
    getTotalCards, getDueCards, user,
  } = useStore();

  useEffect(() => {
    initAuth();
    loadSavedTheme();
  }, []);

  // Connect socket when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      getSocket();
    } else {
      disconnectSocket();
    }
  }, [isAuthenticated]);

  // Loading state
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-deep)',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.2rem',
          color: 'var(--accent-amber)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}>
          Loading...
        </div>
      </div>
    );
  }

  // Auth gate
  if (!isAuthenticated) {
    return <Auth />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'deck-editor': return <DeckEditor />;
      case 'study': return <StudyMode />;
      case 'learn': return <LearnMode />;
      case 'test': return <TestMode />;
      case 'upload': return <UploadPage />;
      case 'friends': return <Friends />;
      case 'challenge-play': return <ChallengePlay />;
      case 'courses': return <Courses />;
      case 'course-view': return <CourseView />;
      case 'note-editor': return <NoteEditor />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>
            <span className="brand-icon">
              <Eye size={20} />
            </span>
            Optika
          </h1>
          <p style={{ marginTop: 2 }}>
            {user?.username || 'Study System'}
          </p>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => navigate('dashboard')}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>

          <button
            className={`nav-item ${currentView === 'upload' ? 'active' : ''}`}
            onClick={() => navigate('upload')}
          >
            <Upload size={18} />
            Import
          </button>

          <button
            className={`nav-item ${currentView === 'courses' || currentView === 'course-view' || currentView === 'note-editor' ? 'active' : ''}`}
            onClick={() => navigate('courses')}
          >
            <BookOpen size={18} />
            Courses
          </button>

          <button
            className={`nav-item ${currentView === 'friends' ? 'active' : ''}`}
            onClick={() => navigate('friends')}
          >
            <Users size={18} />
            Friends
          </button>

          <button
            className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
            onClick={() => navigate('settings')}
          >
            <SettingsIcon size={18} />
            Settings
          </button>

          <div style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: '2px solid var(--border-hard)',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6rem',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              color: 'var(--text-muted)',
              padding: '0 16px',
              marginBottom: 8,
            }}>
              Your Decks
            </div>
            {decks.length === 0 && (
              <div style={{
                padding: '8px 16px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                fontStyle: 'italic',
              }}>
                No decks yet
              </div>
            )}
            {decks.map(deck => (
              <button
                key={deck.id}
                className={`nav-item ${currentView === 'deck-editor' && currentDeckId === deck.id ? 'active' : ''}`}
                onClick={() => navigate('deck-editor', deck.id)}
              >
                <Layers size={16} style={{ color: deck.color }} />
                <span style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {deck.name}
                </span>
                <span style={{
                  marginLeft: 'auto',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  color: 'var(--text-muted)',
                }}>
                  {deck.card_count || 0}
                </span>
              </button>
            ))}
          </div>
        </nav>

        <div className="sidebar-stats">
          <div className="stat-row">
            <span>Total Cards</span>
            <span className="stat-value">{getTotalCards()}</span>
          </div>
          <div className="stat-row">
            <span>Due for Review</span>
            <span className="stat-value" style={{ color: 'var(--accent-amber)' }}>{getDueCards()}</span>
          </div>
          <div className="stat-row">
            <span>Decks</span>
            <span className="stat-value">{decks.length}</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {renderView()}
      </main>
    </div>
  );
}

export default App;
