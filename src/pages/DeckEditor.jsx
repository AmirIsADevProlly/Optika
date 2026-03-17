import { useState } from 'react';
import { ArrowLeft, Plus, Trash2, BookOpen, GraduationCap, ClipboardCheck, Pencil, Check, X, Layers } from 'lucide-react';
import useStore from '../store';

function getMasteryColor(m) {
  if (m >= 0.8) return 'var(--accent-green)';
  if (m >= 0.5) return 'var(--accent-amber)';
  if (m >= 0.25) return 'var(--accent-red)';
  return 'var(--text-muted)';
}

export default function DeckEditor() {
  const { navigate, getCurrentDeck, addCard, updateCard, deleteCard, updateDeck } = useStore();
  const deck = getCurrentDeck();

  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [deckName, setDeckName] = useState('');

  if (!deck) {
    return (
      <>
        <div className="page-header">
          <h2>Deck Not Found</h2>
        </div>
        <div className="page-body">
          <button className="btn" onClick={() => navigate('dashboard')}>
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
        </div>
      </>
    );
  }

  const handleAdd = () => {
    if (!newFront.trim() || !newBack.trim()) return;
    addCard(deck.id, newFront.trim(), newBack.trim());
    setNewFront('');
    setNewBack('');
  };

  const startEdit = (card) => {
    setEditingId(card.id);
    setEditFront(card.front);
    setEditBack(card.back);
  };

  const saveEdit = (cardId) => {
    if (!editFront.trim() || !editBack.trim()) return;
    updateCard(deck.id, cardId, { front: editFront.trim(), back: editBack.trim() });
    setEditingId(null);
  };

  const startEditName = () => {
    setDeckName(deck.name);
    setEditingName(true);
  };

  const saveNameEdit = () => {
    if (deckName.trim()) {
      updateDeck(deck.id, { name: deckName.trim() });
    }
    setEditingName(false);
  };

  const deckMastery = deck.cards.length > 0
    ? deck.cards.reduce((s, c) => s + c.mastery, 0) / deck.cards.length
    : 0;

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <button className="btn btn-icon btn-sm" onClick={() => navigate('dashboard')}>
            <ArrowLeft size={16} />
          </button>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: deck.color }} />
          {editingName ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="input"
                style={{ width: 300, fontSize: '1.1rem', padding: '8px 12px' }}
                value={deckName}
                onChange={e => setDeckName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveNameEdit()}
                autoFocus
              />
              <button className="btn btn-icon btn-sm btn-success" onClick={saveNameEdit}><Check size={14} /></button>
              <button className="btn btn-icon btn-sm" onClick={() => setEditingName(false)}><X size={14} /></button>
            </div>
          ) : (
            <h2 style={{ cursor: 'pointer' }} onClick={startEditName}>
              {deck.name}
              <Pencil size={14} style={{ marginLeft: 10, opacity: 0.4, verticalAlign: 'middle' }} />
            </h2>
          )}
        </div>
        <div className="header-sub">
          {deck.cards.length} cards &bull; {Math.round(deckMastery * 100)}% mastery &bull; {deck.description}
        </div>
        <div className="header-actions">
          <button className="btn btn-sm" onClick={() => navigate('study', deck.id)} disabled={deck.cards.length === 0}>
            <BookOpen size={14} /> Study
          </button>
          <button className="btn btn-sm" onClick={() => navigate('learn', deck.id)} disabled={deck.cards.length === 0}>
            <GraduationCap size={14} /> Learn
          </button>
          <button className="btn btn-sm" onClick={() => navigate('test', deck.id)} disabled={deck.cards.length < 4}>
            <ClipboardCheck size={14} /> Test
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Add Card Form */}
        <div className="panel" style={{ marginBottom: 28 }}>
          <div className="panel-header">
            <span><Plus size={14} style={{ verticalAlign: -2 }} /> Add New Card</span>
          </div>
          <div className="panel-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label className="label">Front (Question)</label>
                <textarea
                  className="input"
                  placeholder="Enter the question or term..."
                  value={newFront}
                  onChange={e => setNewFront(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <label className="label">Back (Answer)</label>
                <textarea
                  className="input"
                  placeholder="Enter the answer or definition..."
                  value={newBack}
                  onChange={e => setNewBack(e.target.value)}
                  rows={3}
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleAdd(); }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary btn-sm" onClick={handleAdd}>
                <Plus size={14} /> Add Card
              </button>
            </div>
          </div>
        </div>

        {/* Card List */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Cards ({deck.cards.length})
          </h3>
        </div>

        {deck.cards.length === 0 ? (
          <div className="empty-state">
            <Layers />
            <p>No cards yet. Add your first card above.</p>
          </div>
        ) : (
          <div className="card-list">
            {deck.cards.map((card, idx) => (
              <div key={card.id} className="card-list-item">
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  color: 'var(--text-muted)',
                  width: 28,
                  textAlign: 'center',
                  flexShrink: 0,
                }}>
                  {String(idx + 1).padStart(2, '0')}
                </div>

                <div style={{
                  width: 6,
                  height: 32,
                  borderRadius: 2,
                  background: getMasteryColor(card.mastery),
                  flexShrink: 0,
                }} />

                {editingId === card.id ? (
                  <>
                    <input
                      className="input"
                      style={{ flex: 1 }}
                      value={editFront}
                      onChange={e => setEditFront(e.target.value)}
                      autoFocus
                    />
                    <input
                      className="input"
                      style={{ flex: 1 }}
                      value={editBack}
                      onChange={e => setEditBack(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit(card.id)}
                    />
                    <div className="card-actions">
                      <button className="btn btn-icon btn-sm btn-success" onClick={() => saveEdit(card.id)}>
                        <Check size={13} />
                      </button>
                      <button className="btn btn-icon btn-sm" onClick={() => setEditingId(null)}>
                        <X size={13} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="card-front">{card.front}</div>
                    <div className="card-back">{card.back}</div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.65rem',
                      color: getMasteryColor(card.mastery),
                      flexShrink: 0,
                      width: 40,
                      textAlign: 'right',
                    }}>
                      {Math.round(card.mastery * 100)}%
                    </div>
                    <div className="card-actions">
                      <button className="btn btn-icon btn-sm" onClick={() => startEdit(card)}>
                        <Pencil size={13} />
                      </button>
                      <button className="btn btn-icon btn-sm btn-danger" onClick={() => deleteCard(deck.id, card.id)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
