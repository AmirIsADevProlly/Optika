import { useState, useRef, useCallback } from 'react';
import { ArrowLeft, Upload as UploadIcon, FileText, File, CheckCircle, AlertCircle, Loader, X, Plus } from 'lucide-react';
import useStore from '../store';

const ACCEPTED = '.pdf,.docx,.txt,.md,.csv';
const MAX_SIZE = 20 * 1024 * 1024;

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(name) {
  if (name.endsWith('.pdf')) return <FileText size={20} style={{ color: 'var(--accent-red)' }} />;
  if (name.endsWith('.docx')) return <FileText size={20} style={{ color: 'var(--accent-blue)' }} />;
  return <File size={20} style={{ color: 'var(--text-muted)' }} />;
}

export default function UploadPage() {
  const { navigate, uploadFile, decks, user } = useStore();
  const fileInputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [deckName, setDeckName] = useState('');
  const [targetDeckId, setTargetDeckId] = useState('');
  const [createNew, setCreateNew] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  const hasApiKey = user?.has_api_key || false;

  const addFiles = useCallback((newFiles) => {
    const valid = Array.from(newFiles).filter(f => {
      if (f.size > MAX_SIZE) return false;
      const ext = f.name.split('.').pop().toLowerCase();
      return ['pdf', 'docx', 'txt', 'md', 'csv'].includes(ext);
    });
    setFiles(prev => [...prev, ...valid]);
  }, []);

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setResults([]);

    const newResults = [];

    for (const file of files) {
      try {
        const result = await uploadFile(
          file,
          createNew ? (deckName || file.name.replace(/\.[^.]+$/, '')) : null,
          createNew ? null : targetDeckId
        );
        newResults.push({
          file: file.name,
          status: 'success',
          cardsGenerated: result.cards_generated,
          deckId: result.deck?.id,
          deckName: result.deck?.name,
        });
      } catch (err) {
        newResults.push({
          file: file.name,
          status: 'error',
          error: err.message,
        });
      }
      setResults([...newResults]);
    }

    setProcessing(false);
    setFiles([]);
  };

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-icon btn-sm" onClick={() => navigate('dashboard')}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.3rem' }}>Import & Generate</h2>
            <div className="header-sub">Upload documents to auto-generate flashcards with AI</div>
          </div>
        </div>
      </div>

      <div className="page-body">
        {!hasApiKey && (
          <div style={{
            padding: '16px 20px',
            background: 'rgba(217, 119, 6, 0.1)',
            border: '2px solid var(--accent-amber)',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            color: 'var(--accent-amber)',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <AlertCircle size={18} />
            <div>
              <strong>API key required.</strong> Go to Settings and add your Anthropic API key to enable AI card generation.
              <button
                className="btn btn-sm"
                style={{ marginLeft: 12 }}
                onClick={() => navigate('settings')}
              >
                Open Settings
              </button>
            </div>
          </div>
        )}

        <div style={{ maxWidth: 700 }}>
          {/* Drop Zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `3px dashed ${dragOver ? 'var(--accent-amber)' : 'var(--border-hard)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '48px 40px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragOver ? 'rgba(217, 119, 6, 0.05)' : 'var(--bg-card)',
              transition: 'all 0.2s',
              marginBottom: 24,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED}
              multiple
              style={{ display: 'none' }}
              onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
            />
            <UploadIcon size={36} style={{ color: dragOver ? 'var(--accent-amber)' : 'var(--text-muted)', marginBottom: 16 }} />
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.85rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 8,
              color: dragOver ? 'var(--accent-amber)' : 'var(--text-primary)',
            }}>
              Drop files here or click to browse
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.68rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              PDF, DOCX, TXT, MD, CSV &bull; Max 20MB per file
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="panel" style={{ marginBottom: 24 }}>
              <div className="panel-header">
                <span>{files.length} file{files.length !== 1 ? 's' : ''} selected</span>
                <button className="btn btn-sm btn-danger" onClick={() => setFiles([])}>Clear All</button>
              </div>
              <div className="panel-body" style={{ padding: 0 }}>
                {files.map((file, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 20px',
                    borderBottom: idx < files.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  }}>
                    {getFileIcon(file.name)}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.9rem' }}>{file.name}</div>
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.65rem',
                        color: 'var(--text-muted)',
                      }}>
                        {formatSize(file.size)}
                      </div>
                    </div>
                    <button className="btn btn-icon btn-sm" onClick={() => removeFile(idx)}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Target Deck */}
          {files.length > 0 && (
            <div className="panel" style={{ marginBottom: 24 }}>
              <div className="panel-header">Destination</div>
              <div className="panel-body">
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <button
                    className={`btn btn-sm ${createNew ? 'btn-primary' : ''}`}
                    onClick={() => setCreateNew(true)}
                  >
                    <Plus size={14} /> New Deck
                  </button>
                  <button
                    className={`btn btn-sm ${!createNew ? 'btn-primary' : ''}`}
                    onClick={() => setCreateNew(false)}
                    disabled={decks.length === 0}
                  >
                    Existing Deck
                  </button>
                </div>

                {createNew ? (
                  <div>
                    <label className="label">Deck Name (optional)</label>
                    <input
                      className="input"
                      placeholder="Auto-generated from filename"
                      value={deckName}
                      onChange={e => setDeckName(e.target.value)}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="label">Select Deck</label>
                    <select
                      className="input"
                      value={targetDeckId}
                      onChange={e => setTargetDeckId(e.target.value)}
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      <option value="">Choose a deck...</option>
                      {decks.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.card_count} cards)</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Process Button */}
          {files.length > 0 && (
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '16px' }}
              onClick={handleProcess}
              disabled={processing || (!createNew && !targetDeckId) || !hasApiKey}
            >
              {processing ? (
                <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
              ) : (
                <><UploadIcon size={16} /> Generate Cards from {files.length} file{files.length !== 1 ? 's' : ''}</>
              )}
            </button>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>Results</h3>
              {results.map((r, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 20px',
                  background: r.status === 'success' ? 'rgba(22, 163, 74, 0.06)' : 'rgba(220, 38, 38, 0.06)',
                  border: `2px solid ${r.status === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'}`,
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 8,
                }}>
                  {r.status === 'success' ? (
                    <CheckCircle size={18} style={{ color: 'var(--accent-green)', flexShrink: 0 }} />
                  ) : (
                    <AlertCircle size={18} style={{ color: 'var(--accent-red)', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{r.file}</div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.7rem',
                      color: r.status === 'success' ? 'var(--accent-green)' : 'var(--accent-red)',
                      marginTop: 2,
                    }}>
                      {r.status === 'success'
                        ? `${r.cardsGenerated} cards generated → ${r.deckName}`
                        : r.error
                      }
                    </div>
                  </div>
                  {r.status === 'success' && (
                    <button className="btn btn-sm" onClick={() => navigate('deck-editor', r.deckId)}>
                      View Deck
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
