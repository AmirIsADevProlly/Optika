import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Swords, Check, ChevronRight, Trophy } from 'lucide-react';
import useStore from '../store';
import * as api from '../api';

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ChallengePlay() {
  const { navigate, currentDeckId: challengeId, user } = useStore();
  const [challenge, setChallenge] = useState(null);
  const [cards, setCards] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [writtenInput, setWrittenInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const challenges = await api.fetchChallenges();
        const ch = challenges.find(c => c.id === challengeId);
        if (!ch) return;
        setChallenge(ch);

        const deck = await api.fetchDeck(ch.deck_id);
        setCards(deck.cards || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [challengeId]);

  const questions = useMemo(() => {
    if (cards.length < 2) return [];
    const shuffled = shuffleArray(cards);
    return shuffled.map((card, idx) => {
      if (idx % 2 === 0 && cards.length >= 4) {
        const wrongAnswers = shuffleArray(
          cards.filter(c => c.id !== card.id).map(c => c.back)
        ).slice(0, 3);
        return {
          type: 'multiple-choice',
          cardId: card.id,
          question: card.front,
          correctAnswer: card.back,
          options: shuffleArray([card.back, ...wrongAnswers]),
        };
      }
      return {
        type: 'written',
        cardId: card.id,
        question: card.front,
        correctAnswer: card.back,
      };
    });
  }, [cards]);

  if (loading) {
    return (
      <div className="page-body" style={{ textAlign: 'center', paddingTop: 60 }}>
        <div style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-amber)', textTransform: 'uppercase' }}>Loading challenge...</div>
      </div>
    );
  }

  if (!challenge || questions.length === 0) {
    return (
      <>
        <div className="page-header"><h2>Challenge</h2></div>
        <div className="page-body">
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Challenge not found or no cards available.</p>
          <button className="btn" onClick={() => navigate('friends')}><ArrowLeft size={14} /> Back to Friends</button>
        </div>
      </>
    );
  }

  const q = questions[currentQ];
  const total = questions.length;
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const isChallenger = challenge.challenger_id === user?.id;
  const opponentName = isChallenger ? challenge.opponent_name : challenge.challenger_name;

  const handleMCSelect = (option) => {
    if (showFeedback) return;
    setAnswers(prev => ({ ...prev, [currentQ]: option }));
    setShowFeedback(true);
  };

  const handleWrittenSubmit = (e) => {
    e.preventDefault();
    if (showFeedback || !writtenInput.trim()) return;
    setAnswers(prev => ({ ...prev, [currentQ]: writtenInput.trim() }));
    setShowFeedback(true);
  };

  const nextQuestion = () => {
    if (currentQ < total - 1) {
      setCurrentQ(prev => prev + 1);
      setWrittenInput('');
      setShowFeedback(false);
    } else {
      // Calculate and submit score
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

      api.submitChallengeScore(challenge.id, correct, total);
      setSubmitted(true);
    }
  };

  // Results
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
          <h2>Challenge Complete</h2>
          <div className="header-sub">vs {opponentName} &bull; {challenge.deck_name}</div>
        </div>
        <div className="page-body">
          <div className="results-screen animate-fade-up">
            <Trophy size={48} style={{ color: 'var(--accent-amber)', marginBottom: 8 }} />
            <div className="results-label">Your Score</div>
            <div className="results-score" style={{
              color: pct >= 80 ? 'var(--accent-green)' : pct >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)'
            }}>
              {pct}%
            </div>
            <div className="results-label" style={{ marginBottom: 12 }}>
              {correct} / {total} correct
            </div>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              marginBottom: 32,
            }}>
              Waiting for {opponentName} to complete their attempt...
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn" onClick={() => navigate('friends')}>
                <ArrowLeft size={14} /> Back to Friends
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
          <button className="btn btn-icon btn-sm" onClick={() => navigate('friends')}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.3rem' }}>
              <Swords size={18} style={{ verticalAlign: -3, marginRight: 6, color: 'var(--accent-amber)' }} />
              Challenge
            </h2>
            <div className="header-sub">vs {opponentName} &bull; {challenge.deck_name} &bull; Q{currentQ + 1}/{total}</div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div style={{ marginBottom: 24 }}>
          <div className="mastery-bar" style={{ height: 4 }}>
            <div className="mastery-bar-fill" style={{
              width: `${((currentQ + (showFeedback ? 1 : 0)) / total) * 100}%`,
              background: 'var(--accent-amber)',
            }} />
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
                    fontSize: '1.05rem', padding: '14px 18px',
                    borderColor: showFeedback ? (isCurrentCorrect ? 'var(--accent-green)' : 'var(--accent-red)') : undefined,
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

            {showFeedback && (
              <div className={`learn-feedback ${isCurrentCorrect ? 'correct' : 'incorrect'}`} style={{ marginTop: 16 }}>
                {isCurrentCorrect ? 'Correct!' : (
                  <span>Incorrect. The answer is: <strong style={{ color: 'var(--text-primary)' }}>{q.correctAnswer}</strong></span>
                )}
              </div>
            )}
          </div>

          {showFeedback && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
              <button className="btn btn-primary" onClick={nextQuestion}>
                {currentQ < total - 1 ? <>Next <ChevronRight size={14} /></> : <>Finish <ChevronRight size={14} /></>}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
