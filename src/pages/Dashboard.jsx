import { useState } from 'react';
import { Plus, Layers, BookOpen, GraduationCap, ClipboardCheck, Trash2, TrendingUp, Clock, Zap, Target, X } from 'lucide-react';
import useStore from '../store';

const DECK_COLORS = ['#B45309', '#9F1239', '#065F46', '#1E40AF', '#6D28D9', '#9A3412', '#115E59', '#4338CA'];

function getMasteryColor(mastery) {
  if (mastery >= 0.8) return 'var(--accent-green)';
  if (mastery >= 0.5) return 'var(--accent-amber)';
  if (mastery >= 0.25) return 'var(--accent-red)';
  return 'var(--text-muted)';
}

function timeAgo(ts) {
  if (!ts) return 'Never';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Dashboard() {
  const { decks, navigate, createDeck, deleteDeck, getTotalCards, getTotalMastered, getOverallMastery, getDueCards } = useStore();
  const [showNewDeck, setShowNewDeck] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState(DECK_COLORS[0]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const id = createDeck(newName.trim(), newDesc.trim(), newColor);
    setNewName('');
    setNewDesc('');
    setNewColor(DECK_COLORS[0]);
    setShowNewDeck(false);
    navigate('deck-editor', id);
  };

  const totalCards = getTotalCards();
  const mastered = getTotalMastered();
  const overall = getOverallMastery();
  const due = getDueCards();

  return (
    <>
      <div className="page-header">
        <h2>Command Center</h2>
        <div className="header-sub">
          Overview &bull; {decks.length} deck{decks.length !== 1 ? 's' : ''} loaded
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stat-grid stagger-children">
          <div className="stat-block" style={{ '--accent': 'var(--accent-amber)' }}>
            <div className="stat-label">Total Cards</div>
            <div className="stat-number" style={{ color: 'var(--accent-amber)' }}>{totalCards}</div>
            <div className="stat-sub">across {decks.length} decks</div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'var(--accent-amber)' }} />
          </div>

          <div className="stat-block">
            <div className="stat-label">Mastered</div>
            <div className="stat-number" style={{ color: 'var(--accent-green)' }}>{mastered}</div>
            <div className="stat-sub">{totalCards ? Math.round((mastered / totalCards) * 100) : 0}% of total</div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'var(--accent-green)' }} />
          </div>

          <div className="stat-block">
            <div className="stat-label">Overall Mastery</div>
            <div className="stat-number" style={{ color: getMasteryColor(overall) }}>{Math.round(overall * 100)}%</div>
            <div className="stat-sub">
              <div className="mastery-bar" style={{ marginTop: 8 }}>
                <div className="mastery-bar-fill" style={{ width: `${overall * 100}%`, background: getMasteryColor(overall) }} />
              </div>
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: getMasteryColor(overall) }} />
          </div>

          <div className="stat-block">
            <div className="stat-label">Due for Review</div>
            <div className="stat-number" style={{ color: due > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>{due}</div>
            <div className="stat-sub">{due > 0 ? 'cards need attention' : 'all caught up'}</div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: due > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }} />
          </div>
        </div>

        {/* Deck Grid Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Your Decks</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNewDeck(true)}>
            <Plus size={14} />
            New Deck
          </button>
        </div>

        {/* Deck Grid */}
        {decks.length === 0 ? (
          <div className="empty-state">
            <Layers />
            <p>No decks yet. Create your first deck to start studying.</p>
            <button className="btn btn-primary" onClick={() => setShowNewDeck(true)}>
              <Plus size={16} /> Create Deck
            </button>
          </div>
        ) : (
          <div className="deck-grid stagger-children">
            {decks.map(deck => {
              const deckMastery = deck.avg_mastery || 0;
              const cardCount = deck.card_count || 0;

              return (
                <div key={deck.id} className="deck-card" onClick={() => navigate('deck-editor', deck.id)}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: deck.color }} />
                  <div className="deck-card-body">
                    <div className="deck-card-name">{deck.name}</div>
                    <div className="deck-card-desc">{deck.description || 'No description'}</div>

                    <div className="mastery-bar" style={{ marginBottom: 12 }}>
                      <div className="mastery-bar-fill" style={{
                        width: `${deckMastery * 100}%`,
                        background: getMasteryColor(deckMastery),
                      }} />
                    </div>

                    <div className="deck-card-meta">
                      <span><Layers size={12} /> {cardCount} cards</span>
                      <span><Clock size={12} /> {timeAgo(deck.last_studied)}</span>
                      <span><Target size={12} /> {Math.round(deckMastery * 100)}%</span>
                    </div>
                  </div>

                  <div className="deck-card-footer">
                    <button className="btn btn-sm" onClick={e => { e.stopPropagation(); navigate('study', deck.id); }} disabled={cardCount === 0}>
                      <BookOpen size={13} /> Study
                    </button>
                    <button className="btn btn-sm" onClick={e => { e.stopPropagation(); navigate('learn', deck.id); }} disabled={cardCount === 0}>
                      <GraduationCap size={13} /> Learn
                    </button>
                    <button className="btn btn-sm" onClick={e => { e.stopPropagation(); navigate('test', deck.id); }} disabled={cardCount < 4}>
                      <ClipboardCheck size={13} /> Test
                    </button>
                    <button
                      className="btn btn-icon btn-sm btn-danger"
                      style={{ marginLeft: 'auto' }}
                      onClick={e => { e.stopPropagation(); deleteDeck(deck.id); }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Deck Modal */}
      {showNewDeck && (
        <div className="modal-overlay" onClick={() => setShowNewDeck(false)}>
          <div className="modal animate-fade-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              Create New Deck
              <button className="btn btn-icon btn-sm" onClick={() => setShowNewDeck(false)}>
                <X size={14} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 16 }}>
                <label className="label">Deck Name</label>
                <input
                  className="input"
                  placeholder="e.g. Organic Chemistry"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="label">Description</label>
                <textarea
                  className="input"
                  placeholder="What's this deck about?"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows={2}
                />
              </div>
              <div>
                <label className="label">Color</label>
                <div className="color-options">
                  {DECK_COLORS.map(c => (
                    <div
                      key={c}
                      className={`color-swatch ${newColor === c ? 'active' : ''}`}
                      style={{ background: c }}
                      onClick={() => setNewColor(c)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-sm" onClick={() => setShowNewDeck(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleCreate}>
                <Plus size={14} /> Create Deck
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
