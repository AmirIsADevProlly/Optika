import { useState } from 'react';
import { ArrowLeft, Key, Check, User, LogOut, Palette } from 'lucide-react';
import useStore from '../store';
import * as api from '../api';
import themes, { applyTheme, getCurrentTheme } from '../themes';

export default function Settings() {
  const { navigate, user, setApiKey, logout, initAuth } = useStore();
  const [provider, setProvider] = useState(user?.api_provider || 'anthropic');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [activeTheme, setActiveTheme] = useState(getCurrentTheme);

  const handleSaveKey = async () => {
    if (!apiKeyInput.trim()) return;
    setSaving(true);
    setError('');
    try {
      await setApiKey(apiKeyInput.trim(), provider);
      setSaved(true);
      setApiKeyInput('');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleProviderSwitch = async (p) => {
    setProvider(p);
    try {
      await api.setApiProvider(p);
      await initAuth();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleThemeChange = (themeId) => {
    applyTheme(themeId);
    setActiveTheme(themeId);
  };

  const currentKeyDisplay = provider === 'openrouter' ? user?.openrouter_key : user?.anthropic_key;
  const hasCurrentKey = provider === 'openrouter' ? !!user?.openrouter_key : !!user?.anthropic_key;

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-icon btn-sm" onClick={() => navigate('dashboard')}>
            <ArrowLeft size={16} />
          </button>
          <h2 style={{ fontSize: '1.3rem' }}>Settings</h2>
        </div>
      </div>

      <div className="page-body">
        <div style={{ maxWidth: 560 }}>
          {/* Profile */}
          <div className="panel" style={{ marginBottom: 24 }}>
            <div className="panel-header"><User size={14} style={{ verticalAlign: -2 }} /> Account</div>
            <div className="panel-body">
              <div style={{ display: 'flex', gap: 24 }}>
                <div>
                  <div className="label">Username</div>
                  <div style={{ fontSize: '1rem' }}>{user?.username}</div>
                </div>
                <div>
                  <div className="label">Email</div>
                  <div style={{ fontSize: '1rem' }}>{user?.email}</div>
                </div>
              </div>
              <div style={{ marginTop: 20 }}>
                <button className="btn btn-danger btn-sm" onClick={logout}>
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* Theme Picker */}
          <div className="panel" style={{ marginBottom: 24 }}>
            <div className="panel-header"><Palette size={14} style={{ verticalAlign: -2 }} /> Theme</div>
            <div className="panel-body">
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
              }}>
                {Object.entries(themes).map(([id, theme]) => (
                  <button
                    key={id}
                    onClick={() => handleThemeChange(id)}
                    style={{
                      padding: '14px 12px 12px',
                      background: theme.colors['--bg-surface'],
                      border: `3px solid ${activeTheme === id ? theme.colors['--accent-amber'] : theme.colors['--border-hard']}`,
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      position: 'relative',
                    }}
                  >
                    {/* Color swatches */}
                    <div style={{ display: 'flex', gap: 4, marginBottom: 8, justifyContent: 'center' }}>
                      {theme.preview.map((color, i) => (
                        <div key={i} style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: color,
                          border: `2px solid ${theme.colors['--border-hard']}`,
                        }} />
                      ))}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.68rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: theme.colors['--text-primary'],
                      fontWeight: 500,
                      marginBottom: 2,
                    }}>
                      {theme.name}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.55rem',
                      color: theme.colors['--text-muted'],
                      letterSpacing: '0.04em',
                    }}>
                      {theme.desc}
                    </div>
                    {activeTheme === id && (
                      <div style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: theme.colors['--accent-amber'],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Check size={10} color={theme.colors['--text-inverse']} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* AI Provider */}
          <div className="panel" style={{ marginBottom: 24 }}>
            <div className="panel-header"><Key size={14} style={{ verticalAlign: -2 }} /> AI Provider</div>
            <div className="panel-body">
              <p style={{
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                marginBottom: 16,
                lineHeight: 1.6,
              }}>
                Choose your AI provider for flashcard generation.
              </p>

              <div style={{
                display: 'flex',
                border: '2px solid var(--border-hard)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                marginBottom: 20,
              }}>
                <button
                  onClick={() => handleProviderSwitch('anthropic')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    background: provider === 'anthropic' ? 'var(--accent-amber)' : 'var(--bg-elevated)',
                    color: provider === 'anthropic' ? 'var(--text-inverse)' : 'var(--text-muted)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    fontWeight: provider === 'anthropic' ? 500 : 400,
                  }}
                >
                  Anthropic
                </button>
                <button
                  onClick={() => handleProviderSwitch('openrouter')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    background: provider === 'openrouter' ? 'var(--accent-amber)' : 'var(--bg-elevated)',
                    color: provider === 'openrouter' ? 'var(--text-inverse)' : 'var(--text-muted)',
                    border: 'none',
                    borderLeft: '2px solid var(--border-hard)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    fontWeight: provider === 'openrouter' ? 500 : 400,
                  }}
                >
                  OpenRouter
                </button>
              </div>

              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: hasCurrentKey ? 'var(--accent-green)' : 'var(--text-muted)',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                {hasCurrentKey ? (
                  <><Check size={14} /> {provider === 'openrouter' ? 'OpenRouter' : 'Anthropic'} key configured: {currentKeyDisplay}</>
                ) : (
                  `No ${provider === 'openrouter' ? 'OpenRouter' : 'Anthropic'} key configured`
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  type="password"
                  placeholder={provider === 'openrouter' ? 'sk-or-...' : 'sk-ant-...'}
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  className={`btn ${saved ? 'btn-success' : 'btn-primary'} btn-sm`}
                  onClick={handleSaveKey}
                  disabled={saving || !apiKeyInput.trim()}
                >
                  {saved ? <><Check size={14} /> Saved</> : saving ? 'Saving...' : 'Save Key'}
                </button>
              </div>

              {error && (
                <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-red)' }}>
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
