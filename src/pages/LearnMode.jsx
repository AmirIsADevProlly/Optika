import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, RotateCcw, SkipForward, Check } from 'lucide-react';
import useStore from '../store';

export default function LearnMode() {
  const { navigate, getCurrentDeck, recordStudy, incrementSessions } = useStore();
  const deck = getCurrentDeck();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null); // null | 'correct' | 'incorrect'
  const [showAnswer, setShowAnswer] = useState(false);
  const [results, setResults] = useState([]);
  const [completed, setCompleted] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current && !feedback) {
      inputRef.current.focus();
    }
  }, [currentIdx, feedback]);

  if (!deck || !deck.cards || deck.cards.length === 0) {
    return (
      <>
        <div className="page-header">
          <h2>Learn Mode</h2>
          <div className="header-sub">No cards available</div>
        </div>
        <div className="page-body">
          <button className="btn" onClick={() => navigate('dashboard')}>
            <ArrowLeft size={16} /> Back
          </button>
        </div>
      </>
    );
  }

  const card = deck.cards[currentIdx];
  const total = deck.cards.length;

  const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (feedback) return;

    const isCorrect = normalize(answer) === normalize(card.back);
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setShowAnswer(true);
    recordStudy(deck.id, card.id, isCorrect);
    setResults(prev => [...prev, { cardId: card.id, correct: isCorrect }]);
  };

  const handleNext = () => {
    if (currentIdx < total - 1) {
      setCurrentIdx(prev => prev + 1);
      setAnswer('');
      setFeedback(null);
      setShowAnswer(false);
    } else {
      incrementSessions(deck.id);
      setCompleted(true);
    }
  };

  const handleSkip = () => {
    setFeedback('incorrect');
    setShowAnswer(true);
    recordStudy(deck.id, card.id, false);
    setResults(prev => [...prev, { cardId: card.id, correct: false }]);
  };

  const restart = () => {
    setCurrentIdx(0);
    setAnswer('');
    setFeedback(null);
    setShowAnswer(false);
    setResults([]);
    setCompleted(false);
  };

  if (completed) {
    const correct = results.filter(r => r.correct).length;
    const pct = Math.round((correct / total) * 100);

    return (
      <>
        <div className="page-header">
          <h2>Learn Complete</h2>
          <div className="header-sub">{deck.name}</div>
        </div>
        <div className="page-body">
          <div className="results-screen animate-fade-up">
            <div className="results-label">Accuracy</div>
            <div className="results-score" style={{
              color: pct >= 80 ? 'var(--accent-green)' : pct >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)'
            }}>
              {pct}%
            </div>
            <div className="results-label" style={{ marginBottom: 32 }}>
              {correct} correct &bull; {total - correct} incorrect &bull; {total} total
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn" onClick={() => navigate('dashboard')}>
                <ArrowLeft size={14} /> Dashboard
              </button>
              <button className="btn btn-primary" onClick={restart}>
                <RotateCcw size={14} /> Try Again
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
            <h2 style={{ fontSize: '1.3rem' }}>Learn Mode</h2>
            <div className="header-sub">{deck.name} &bull; Type the answer</div>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Progress */}
        <div className="study-progress">
          <span>{currentIdx + 1} / {total}</span>
          <div className="progress-dots">
            {deck.cards.map((_, i) => (
              <div
                key={i}
                className={`dot ${i === currentIdx ? 'active' : ''} ${
                  results[i] ? (results[i].correct ? 'correct' : 'wrong') : ''
                }`}
              />
            ))}
          </div>
        </div>

        <div className="learn-input-area animate-fade-up">
          {/* Question */}
          <div className="learn-prompt">
            <div className="prompt-label">What is the answer?</div>
            <div className="prompt-text">{card.front}</div>
          </div>

          {/* Answer Input */}
          <form onSubmit={handleSubmit}>
            <div style={{ position: 'relative' }}>
              <input
                ref={inputRef}
                className="input"
                style={{
                  fontSize: '1.1rem',
                  padding: '16px 20px',
                  borderColor: feedback === 'correct' ? 'var(--accent-green)' :
                               feedback === 'incorrect' ? 'var(--accent-red)' : undefined,
                }}
                placeholder="Type your answer..."
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                disabled={!!feedback}
              />
            </div>

            {!feedback && (
              <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'center' }}>
                <button type="button" className="btn btn-sm" onClick={handleSkip}>
                  <SkipForward size={14} /> Skip
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  <Check size={14} /> Check
                </button>
              </div>
            )}
          </form>

          {/* Feedback */}
          {feedback && (
            <div className={`learn-feedback ${feedback}`} style={{ animation: 'fadeUp 0.3s ease' }}>
              {feedback === 'correct' ? (
                <span>Correct!</span>
              ) : (
                <span>
                  Incorrect. The answer is: <strong style={{ color: 'var(--text-primary)' }}>{card.back}</strong>
                </span>
              )}
            </div>
          )}

          {feedback && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
              <button className="btn btn-primary btn-sm" onClick={handleNext}>
                {currentIdx < total - 1 ? 'Next Card' : 'Finish'} →
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
