import { useState, useMemo } from 'react';
import { ArrowLeft, RotateCcw, Check, ChevronRight } from 'lucide-react';
import useStore from '../store';

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateQuestions(cards) {
  if (!cards || cards.length === 0) return [];

  const questions = [];
  const shuffled = shuffleArray(cards);

  shuffled.forEach((card, idx) => {
    // Multiple choice only if we have at least 4 cards (need 3 wrong answers)
    if (idx % 2 === 0 && cards.length >= 4) {
      const wrongAnswers = shuffleArray(
        cards.filter(c => c.id !== card.id).map(c => c.back)
      ).slice(0, 3);

      const options = shuffleArray([card.back, ...wrongAnswers]);

      questions.push({
        type: 'multiple-choice',
        cardId: card.id,
        question: card.front,
        correctAnswer: card.back,
        options,
      });
    } else {
      // Written — works with any number of cards
      questions.push({
        type: 'written',
        cardId: card.id,
        question: card.front,
        correctAnswer: card.back,
      });
    }
  });

  return questions;
}

export default function TestMode() {
  const { navigate, getCurrentDeck, recordStudy, incrementSessions } = useStore();
  const deck = getCurrentDeck();

  const questions = useMemo(() => deck && deck.cards ? generateQuestions(deck.cards) : [], [deck]);

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [writtenInput, setWrittenInput] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);

  if (!deck || !deck.cards || deck.cards.length === 0 || questions.length === 0) {
    return (
      <>
        <div className="page-header">
          <h2>Test Mode</h2>
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

  const q = questions[currentQ];
  const total = questions.length;

  const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

  const handleMCSelect = (option) => {
    if (showFeedback) return;
    setAnswers(prev => ({ ...prev, [currentQ]: option }));
    setShowFeedback(true);

    const isCorrect = option === q.correctAnswer;
    recordStudy(deck.id, q.cardId, isCorrect);
  };

  const handleWrittenSubmit = (e) => {
    e.preventDefault();
    if (showFeedback || !writtenInput.trim()) return;
    setAnswers(prev => ({ ...prev, [currentQ]: writtenInput.trim() }));
    setShowFeedback(true);

    const isCorrect = normalize(writtenInput) === normalize(q.correctAnswer);
    recordStudy(deck.id, q.cardId, isCorrect);
  };

  const nextQuestion = () => {
    if (currentQ < total - 1) {
      setCurrentQ(prev => prev + 1);
      setWrittenInput('');
      setShowFeedback(false);
    } else {
      incrementSessions(deck.id);
      setSubmitted(true);
    }
  };

  const restart = () => {
    setCurrentQ(0);
    setAnswers({});
    setSubmitted(false);
    setWrittenInput('');
    setShowFeedback(false);
  };

  // Results screen
  if (submitted) {
    let correct = 0;
    questions.forEach((question, i) => {
      const userAnswer = answers[i];
      if (!userAnswer) return;
      if (question.type === 'multiple-choice') {
        if (userAnswer === question.correctAnswer) correct++;
      } else {
        if (normalize(userAnswer) === normalize(question.correctAnswer)) correct++;
      }
    });

    const pct = Math.round((correct / total) * 100);

    return (
      <>
        <div className="page-header">
          <h2>Test Results</h2>
          <div className="header-sub">{deck.name}</div>
        </div>
        <div className="page-body">
          <div className="results-screen animate-fade-up">
            <div className="results-label">Final Score</div>
            <div className="results-score" style={{
              color: pct >= 80 ? 'var(--accent-green)' : pct >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)'
            }}>
              {pct}%
            </div>
            <div className="results-label" style={{ marginBottom: 16 }}>
              {correct} / {total} correct
            </div>

            {/* Review answers */}
            <div style={{ textAlign: 'left', marginTop: 32, marginBottom: 32 }}>
              {questions.map((question, i) => {
                const userAnswer = answers[i] || '(skipped)';
                const isCorrect = question.type === 'multiple-choice'
                  ? userAnswer === question.correctAnswer
                  : normalize(userAnswer) === normalize(question.correctAnswer);

                return (
                  <div key={i} className="test-question" style={{
                    borderLeftColor: isCorrect ? 'var(--accent-green)' : 'var(--accent-red)',
                    borderLeftWidth: 4,
                  }}>
                    <div className="q-number">Question {i + 1} &bull; {question.type === 'multiple-choice' ? 'MC' : 'Written'}</div>
                    <div className="q-text">{question.question}</div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Your answer: </span>
                        <span style={{ color: isCorrect ? 'var(--accent-green)' : 'var(--accent-red)' }}>{userAnswer}</span>
                      </div>
                      {!isCorrect && (
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Correct: </span>
                          <span style={{ color: 'var(--accent-green)' }}>{question.correctAnswer}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn" onClick={() => navigate('dashboard')}>
                <ArrowLeft size={14} /> Dashboard
              </button>
              <button className="btn btn-primary" onClick={restart}>
                <RotateCcw size={14} /> Retake Test
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const currentAnswer = answers[currentQ];
  const isCurrentCorrect = q.type === 'multiple-choice'
    ? currentAnswer === q.correctAnswer
    : currentAnswer && normalize(currentAnswer) === normalize(q.correctAnswer);

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-icon btn-sm" onClick={() => navigate('deck-editor', deck.id)}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.3rem' }}>Test Mode</h2>
            <div className="header-sub">{deck.name} &bull; Question {currentQ + 1} of {total}</div>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Progress bar */}
        <div style={{ marginBottom: 32 }}>
          <div className="mastery-bar" style={{ height: 4 }}>
            <div className="mastery-bar-fill" style={{
              width: `${((currentQ + (showFeedback ? 1 : 0)) / total) * 100}%`,
              background: 'var(--accent-amber)',
            }} />
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.68rem',
            color: 'var(--text-muted)',
            marginTop: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            textAlign: 'center',
          }}>
            {currentQ + 1} / {total} &bull; {q.type === 'multiple-choice' ? 'Multiple Choice' : 'Written Answer'}
          </div>
        </div>

        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div className="test-question animate-fade-up">
            <div className="q-number">Question {currentQ + 1}</div>
            <div className="q-text">{q.question}</div>

            {q.type === 'multiple-choice' ? (
              <div>
                {q.options.map((option, i) => {
                  const letters = ['A', 'B', 'C', 'D'];
                  let className = 'test-option';
                  if (showFeedback) {
                    if (option === q.correctAnswer) className += ' correct';
                    else if (option === currentAnswer && option !== q.correctAnswer) className += ' wrong';
                  } else if (currentAnswer === option) {
                    className += ' selected';
                  }

                  return (
                    <div key={i} className={className} onClick={() => handleMCSelect(option)}>
                      <div className="option-letter">{letters[i]}</div>
                      <span>{option}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <form onSubmit={handleWrittenSubmit}>
                <input
                  className="input"
                  style={{
                    fontSize: '1.05rem',
                    padding: '14px 18px',
                    borderColor: showFeedback
                      ? (isCurrentCorrect ? 'var(--accent-green)' : 'var(--accent-red)')
                      : undefined,
                  }}
                  placeholder="Type your answer..."
                  value={writtenInput}
                  onChange={e => setWrittenInput(e.target.value)}
                  disabled={showFeedback}
                  autoFocus
                />
                {!showFeedback && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                    <button type="submit" className="btn btn-primary btn-sm">
                      <Check size={14} /> Submit
                    </button>
                  </div>
                )}
              </form>
            )}

            {/* Feedback */}
            {showFeedback && (
              <div className={`learn-feedback ${isCurrentCorrect ? 'correct' : 'incorrect'}`} style={{ marginTop: 16 }}>
                {isCurrentCorrect ? (
                  <span>Correct!</span>
                ) : (
                  <span>
                    Incorrect. The answer is: <strong style={{ color: 'var(--text-primary)' }}>{q.correctAnswer}</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          {showFeedback && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
              <button className="btn btn-primary" onClick={nextQuestion}>
                {currentQ < total - 1 ? (
                  <>Next Question <ChevronRight size={14} /></>
                ) : (
                  <>View Results <ChevronRight size={14} /></>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
