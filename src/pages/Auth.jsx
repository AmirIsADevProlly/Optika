import { useState } from 'react';
import { Eye, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import useStore from '../store';

export default function Auth() {
  const { login, register, authError } = useStore();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, username, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-deep)',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 40 }} className="animate-fade-up">
          <div style={{
            width: 56,
            height: 56,
            background: 'var(--accent-amber)',
            borderRadius: 8,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}>
            <Eye size={28} color="var(--bg-deep)" />
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2rem',
            color: 'var(--accent-amber)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            Optika
          </h1>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginTop: 4,
          }}>
            Study System
          </p>
        </div>

        {/* Form Card */}
        <div className="panel animate-fade-up" style={{ animationDelay: '0.1s' }}>
          {/* Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '3px solid var(--border-hard)',
          }}>
            <button
              onClick={() => setMode('login')}
              style={{
                flex: 1,
                padding: '14px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                background: mode === 'login' ? 'var(--bg-card)' : 'var(--bg-elevated)',
                color: mode === 'login' ? 'var(--accent-amber)' : 'var(--text-muted)',
                border: 'none',
                borderBottom: mode === 'login' ? '3px solid var(--accent-amber)' : '3px solid transparent',
                cursor: 'pointer',
                marginBottom: -3,
                transition: 'all 0.15s',
              }}
            >
              <LogIn size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
              Sign In
            </button>
            <button
              onClick={() => setMode('register')}
              style={{
                flex: 1,
                padding: '14px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                background: mode === 'register' ? 'var(--bg-card)' : 'var(--bg-elevated)',
                color: mode === 'register' ? 'var(--accent-amber)' : 'var(--text-muted)',
                border: 'none',
                borderBottom: mode === 'register' ? '3px solid var(--accent-amber)' : '3px solid transparent',
                cursor: 'pointer',
                marginBottom: -3,
                transition: 'all 0.15s',
              }}
            >
              <UserPlus size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: 24 }}>
            {(error || authError) && (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(220, 38, 38, 0.1)',
                border: '2px solid var(--accent-red)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--accent-red)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <AlertCircle size={16} />
                {error || authError}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            {mode === 'register' && (
              <div style={{ marginBottom: 16 }}>
                <label className="label">Username</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
              disabled={loading}
            >
              {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p style={{
          textAlign: 'center',
          marginTop: 24,
          fontFamily: 'var(--font-mono)',
          fontSize: '0.68rem',
          color: 'var(--text-muted)',
          letterSpacing: '0.08em',
        }}>
          Your data stays local on this server.
        </p>
      </div>
    </div>
  );
}
