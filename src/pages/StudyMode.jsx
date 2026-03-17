import { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, RotateCcw, ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight, Shuffle } from 'lucide-react';
import useStore from '../store';

export default function StudyMode() {
  const { navigate, getCurrentDeck, recordStudy, incrementSessions } = useStore();
  const deck = getCurrentDeck();

  const [cardOrder, setCardOrder] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState({});
  const [completed, setCompleted] = useState(false);

  // Initialize card order when deck loads
  useEffect(() => {
    if (deck && deck.cards && deck.cards.length > 0 && cardOrder.length === 0) {
      setCardOrder(deck.cards.map((_, i) => i));
    }
  }, [deck]);

  const shuffle = useCallback(() => {
    if (!deck) return;
    const arr = deck.cards.map((_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setCardOrder(arr);
    setCurrentIdx(0);
    setFlipped(false);
    setResults({});
    setCompleted(false);
  }, [deck]);

  if (!deck || !deck.cards || deck.cards.length === 0 || cardOrder.length === 0) {
    return (
      <>
        <div className="page-header">
          <h2>Study Mode</h2>
          <div className="header-sub">{deck ? 'No cards available' : 'Loading...'}</div>
        </div>
        <div className="page-body">
          <button className="btn" onClick={() => navigate('dashboard')}>
            <ArrowLeft size={16} /> Back
          </button>
        </div>
      </>
    );
  }

  const card = deck.cards[cardOrder[currentIdx]];
  const total = deck.cards.length;
  const correct = Object.values(results).filter(r => r === 'correct').length;
  const wrong = Object.values(results).filter(r => r === 'wrong').length;

  const handleRate = (isCorrect) => {
    recordStudy(deck.id, card.id, isCorrect);
    setResults(prev => ({ ...prev, [currentIdx]: isCorrect ? 'correct' : 'wrong' }));

    if (currentIdx < total - 1) {
      setTimeout(() => {
        setCurrentIdx(prev => prev + 1);
        setFlipped(false);
      }, 300);
    } else {
      incrementSessions(deck.id);
      setCompleted(true);
    }
  };

  const goTo = (idx) => {
    if (idx >= 0 && idx < total) {
      setCurrentIdx(idx);
      setFlipped(false);
    }
  };

  if (completed) {
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    return (
      <>
        <div className="page-header">
          <h2>Study Complete</h2>
          <div className="header-sub">{deck.name}</div>
        </div>
        <div className="page-body">
          <div className="results-screen animate-fade-up">
            <div className="results-label">Your Score</div>
            <div className="results-score" style={{
              color: pct >= 80 ? 'var(--accent-green)' : pct >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)'
            }}>
              {pct}%
            </div>
            <div className="results-label" style={{ marginBottom: 32 }}>
              {correct} correct &bull; {wrong} incorrect &bull; {total} total
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 12,
              marginBottom: 32,
            }}>
              <div className="stat-block">
                <div className="stat-label">Correct</div>
                <div className="stat-number" style={{ color: 'var(--accent-green)', fontSize: '1.5rem' }}>{correct}</div>
              </div>
              <div className="stat-block">
                <div className="stat-label">Incorrect</div>
                <div className="stat-number" style={{ color: 'var(--accent-red)', fontSize: '1.5rem' }}>{wrong}</div>
              </div>
              <div className="stat-block">
                <div className="stat-label">Sessions</div>
                <div className="stat-number" style={{ color: 'var(--accent-amber)', fontSize: '1.5rem' }}>{deck.study_sessions}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn" onClick={() => navigate('dashboard')}>
                <ArrowLeft size={14} /> Dashboard
              </button>
              <button className="btn btn-primary" onClick={() => {
                shuffle();
              }}>
                <RotateCcw size={14} /> Study Again
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-icon btn-sm" onClick={() => navigate('deck-editor', deck.id)}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.3rem' }}>Study Mode</h2>
            <div className="header-sub">{deck.name}</div>
          </div>
          <button className="btn btn-sm" onClick={shuffle} style={{ marginLeft: 'auto' }}>
            <Shuffle size={14} /> Shuffle
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Progress */}
        <div className="study-progress">
          <span>{currentIdx + 1} / {total}</span>
          <div className="progress-dots">
            {cardOrder.map((_, i) => (
              <div
                key={i}
                className={`dot ${i === currentIdx ? 'active' : ''} ${results[i] || ''}`}
                onClick={() => goTo(i)}
                style={{ cursor: 'pointer' }}
              />
            ))}
          </div>
        </div>

        {/* Flashcard */}
        <div className="flashcard-container animate-fade-up">
          <div
            className={`flashcard ${flipped ? 'flipped' : ''}`}
            onClick={() => setFlipped(f => !f)}
          >
            <div className="flashcard-face front">
              <div className="card-label">Question</div>
              <div className="card-text">{card.front}</div>
              <div className="card-hint">Click to flip</div>
            </div>
            <div className="flashcard-face back">
              <div className="card-label">Answer</div>
              <div className="card-text">{card.back}</div>
              <div className="card-hint">Rate your answer</div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="study-controls">
          <button className="btn" onClick={() => goTo(currentIdx - 1)} disabled={currentIdx === 0}>
            <ChevronLeft size={16} /> Prev
          </button>

          {flipped && (
            <>
              <button className="btn btn-danger" onClick={() => handleRate(false)}>
                <ThumbsDown size={16} /> Didn't Know
              </button>
              <button className="btn btn-success" onClick={() => handleRate(true)}>
                <ThumbsUp size={16} /> Got It
              </button>
            </>
          )}

          <button className="btn" onClick={() => goTo(currentIdx + 1)} disabled={currentIdx === total - 1}>
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
