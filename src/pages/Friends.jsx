import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Search, UserPlus, UserCheck, UserX, Users, X,
  Share2, Swords, Clock, CheckCircle, XCircle, Layers, Send, Trophy
} from 'lucide-react';
import useStore from '../store';
import * as api from '../api';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Friends() {
  const { navigate, decks, user } = useStore();

  const [tab, setTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sharedDecks, setSharedDecks] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  // Share deck modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareDeckId, setShareDeckId] = useState('');
  const [shareFriendId, setShareFriendId] = useState('');

  // Challenge modal
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeDeckId, setChallengeDeckId] = useState('');
  const [challengeFriendId, setChallengeFriendId] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [f, r, s, sd, ch] = await Promise.all([
        api.fetchFriends(),
        api.fetchFriendRequests(),
        api.fetchSentRequests(),
        api.fetchSharedDecks(),
        api.fetchChallenges(),
      ]);
      setFriends(f);
      setRequests(r);
      setSentRequests(s);
      setSharedDecks(sd);
      setChallenges(ch);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    setSearching(true);
    try {
      const results = await api.searchUsers(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      await api.sendFriendRequest(userId);
      setSearchResults(prev => prev.map(u =>
        u.id === userId ? { ...u, friendship_status: 'pending', is_sender: true } : u
      ));
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAccept = async (requestId) => {
    await api.acceptFriendRequest(requestId);
    loadData();
  };

  const handleDecline = async (requestId) => {
    await api.declineFriendRequest(requestId);
    loadData();
  };

  const handleRemoveFriend = async (friendId) => {
    if (!confirm('Remove this friend?')) return;
    await api.removeFriend(friendId);
    loadData();
  };

  const handleShareDeck = async () => {
    if (!shareDeckId || !shareFriendId) return;
    try {
      await api.shareDeck(shareDeckId, shareFriendId);
      setShowShareModal(false);
      setShareDeckId('');
      setShareFriendId('');
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateChallenge = async () => {
    if (!challengeDeckId || !challengeFriendId) return;
    try {
      await api.createChallenge(challengeDeckId, challengeFriendId);
      setShowChallengeModal(false);
      setChallengeDeckId('');
      setChallengeFriendId('');
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const tabs = [
    { id: 'friends', label: 'Friends', icon: Users, count: friends.length },
    { id: 'requests', label: 'Requests', icon: UserPlus, count: requests.length },
    { id: 'shared', label: 'Shared', icon: Share2, count: sharedDecks.length },
    { id: 'challenges', label: 'Challenges', icon: Swords, count: challenges.length },
  ];

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-icon btn-sm" onClick={() => navigate('dashboard')}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.3rem' }}>Friends</h2>
            <div className="header-sub">Study together, challenge each other</div>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Search Bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, maxWidth: 500 }}>
          <input
            className="input"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <button className="btn btn-primary btn-sm" onClick={handleSearch} disabled={searching || searchQuery.length < 2}>
            <Search size={14} />
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="panel" style={{ marginBottom: 24, maxWidth: 500 }}>
            <div className="panel-header">
              <span>Search Results</span>
              <button className="btn btn-icon btn-sm" onClick={() => { setSearchResults([]); setSearchQuery(''); }}>
                <X size={14} />
              </button>
            </div>
            <div className="panel-body" style={{ padding: 0 }}>
              {searchResults.map(u => (
                <div key={u.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--border-subtle)',
                }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'var(--bg-deep)',
                    border: '2px solid var(--border-hard)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.7rem',
                    color: 'var(--accent-amber)',
                    flexShrink: 0,
                  }}>
                    {u.username[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{u.username}</div>
                  </div>
                  {u.friendship_status === 'accepted' ? (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--accent-green)' }}>
                      <UserCheck size={14} /> Friends
                    </span>
                  ) : u.friendship_status === 'pending' ? (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      <Clock size={14} /> Pending
                    </span>
                  ) : (
                    <button className="btn btn-sm btn-primary" onClick={() => handleSendRequest(u.id)}>
                      <UserPlus size={13} /> Add
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 4,
          marginBottom: 24,
          borderBottom: '3px solid var(--border-hard)',
          paddingBottom: -3,
        }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '10px 18px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                background: tab === t.id ? 'var(--bg-card)' : 'transparent',
                color: tab === t.id ? 'var(--accent-amber)' : 'var(--text-muted)',
                border: 'none',
                borderBottom: tab === t.id ? '3px solid var(--accent-amber)' : '3px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: -3,
                transition: 'all 0.15s',
              }}
            >
              <t.icon size={14} />
              {t.label}
              {t.count > 0 && (
                <span style={{
                  background: tab === t.id ? 'var(--accent-amber)' : 'var(--border-hard)',
                  color: tab === t.id ? 'var(--text-inverse)' : 'var(--text-muted)',
                  borderRadius: 10,
                  padding: '1px 7px',
                  fontSize: '0.62rem',
                  fontWeight: 500,
                }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Friends Tab */}
        {tab === 'friends' && (
          <div>
            {friends.length === 0 ? (
              <div className="empty-state">
                <Users />
                <p>No friends yet. Search for users above to add friends.</p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  <button className="btn btn-sm" onClick={() => setShowShareModal(true)} disabled={friends.length === 0 || decks.length === 0}>
                    <Share2 size={14} /> Share Deck
                  </button>
                  <button className="btn btn-sm btn-primary" onClick={() => setShowChallengeModal(true)} disabled={friends.length === 0 || decks.length === 0}>
                    <Swords size={14} /> Challenge
                  </button>
                </div>

                <div className="card-list">
                  {friends.map(f => (
                    <div key={f.id} className="card-list-item">
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: 'var(--bg-deep)',
                        border: '2px solid var(--accent-amber)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.8rem',
                        color: 'var(--accent-amber)',
                        flexShrink: 0,
                      }}>
                        {f.username[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{f.username}</div>
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.68rem',
                          color: 'var(--text-muted)',
                        }}>
                          {f.deck_count} decks &bull; {f.card_count} cards
                        </div>
                      </div>
                      <button className="btn btn-icon btn-sm btn-danger" onClick={() => handleRemoveFriend(f.id)}>
                        <UserX size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Requests Tab */}
        {tab === 'requests' && (
          <div>
            {requests.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 12 }}>Received</h3>
                <div className="card-list">
                  {requests.map(r => (
                    <div key={r.id} className="card-list-item">
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'var(--bg-deep)', border: '2px solid var(--border-hard)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-display)', fontSize: '0.7rem',
                        color: 'var(--accent-amber)', flexShrink: 0,
                      }}>
                        {r.username[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{r.username}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          {timeAgo(r.created_at)}
                        </div>
                      </div>
                      <button className="btn btn-sm btn-success" onClick={() => handleAccept(r.id)}>
                        <CheckCircle size={13} /> Accept
                      </button>
                      <button className="btn btn-icon btn-sm btn-danger" onClick={() => handleDecline(r.id)}>
                        <XCircle size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sentRequests.length > 0 && (
              <div>
                <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 12 }}>Sent</h3>
                <div className="card-list">
                  {sentRequests.map(r => (
                    <div key={r.id} className="card-list-item">
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'var(--bg-deep)', border: '2px solid var(--border-hard)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-display)', fontSize: '0.7rem',
                        color: 'var(--text-muted)', flexShrink: 0,
                      }}>
                        {r.username[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.9rem' }}>{r.username}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          <Clock size={11} style={{ verticalAlign: -1 }} /> Pending &bull; {timeAgo(r.created_at)}
                        </div>
                      </div>
                      <button className="btn btn-icon btn-sm" onClick={() => handleDecline(r.id)}>
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {requests.length === 0 && sentRequests.length === 0 && (
              <div className="empty-state">
                <UserPlus />
                <p>No pending requests.</p>
              </div>
            )}
          </div>
        )}

        {/* Shared Decks Tab */}
        {tab === 'shared' && (
          <div>
            {sharedDecks.length === 0 ? (
              <div className="empty-state">
                <Share2 />
                <p>No shared decks yet. Share a deck with a friend from the Friends tab.</p>
              </div>
            ) : (
              <div className="deck-grid stagger-children">
                {sharedDecks.map(deck => (
                  <div key={deck.id} className="deck-card" onClick={() => navigate('deck-editor', deck.id)}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: deck.color }} />
                    <div className="deck-card-body">
                      <div className="deck-card-name">{deck.name}</div>
                      <div className="deck-card-desc">
                        Shared by <strong>{deck.owner_name}</strong>
                      </div>
                      <div className="deck-card-meta">
                        <span><Layers size={12} /> {deck.card_count} cards</span>
                        <span><Users size={12} /> {deck.owner_name}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Challenges Tab */}
        {tab === 'challenges' && (
          <div>
            {challenges.length === 0 ? (
              <div className="empty-state">
                <Swords />
                <p>No challenges yet. Challenge a friend from the Friends tab.</p>
              </div>
            ) : (
              <div className="card-list">
                {challenges.map(ch => {
                  const isChallenger = ch.challenger_id === user?.id;
                  const myScore = isChallenger ? ch.challenger_score : ch.opponent_score;
                  const theirScore = isChallenger ? ch.opponent_score : ch.challenger_score;
                  const myTotal = isChallenger ? ch.challenger_total : ch.opponent_total;
                  const theirTotal = isChallenger ? ch.opponent_total : ch.challenger_total;
                  const opponentName = isChallenger ? ch.opponent_name : ch.challenger_name;
                  const needsMyScore = myScore == null;
                  const isComplete = ch.status === 'completed';

                  let resultColor = 'var(--text-muted)';
                  let resultText = '';
                  if (isComplete) {
                    const myPct = myTotal > 0 ? myScore / myTotal : 0;
                    const theirPct = theirTotal > 0 ? theirScore / theirTotal : 0;
                    if (myPct > theirPct) { resultColor = 'var(--accent-green)'; resultText = 'You won!'; }
                    else if (myPct < theirPct) { resultColor = 'var(--accent-red)'; resultText = 'They won'; }
                    else { resultColor = 'var(--accent-amber)'; resultText = 'Tie!'; }
                  }

                  return (
                    <div key={ch.id} className="card-list-item" style={{
                      borderLeftWidth: 4,
                      borderLeftColor: isComplete ? resultColor : needsMyScore ? 'var(--accent-amber)' : 'var(--text-muted)',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 500 }}>{ch.deck_name}</span>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.62rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            padding: '2px 8px',
                            borderRadius: 2,
                            background: isComplete ? resultColor : 'var(--border-hard)',
                            color: isComplete ? 'white' : 'var(--text-muted)',
                          }}>
                            {isComplete ? resultText : needsMyScore ? 'Your Turn' : 'Waiting'}
                          </span>
                        </div>
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.68rem',
                          color: 'var(--text-muted)',
                        }}>
                          vs {opponentName} &bull; {ch.card_count} cards &bull; {timeAgo(ch.created_at)}
                        </div>

                        {isComplete && (
                          <div style={{
                            display: 'flex',
                            gap: 20,
                            marginTop: 8,
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.72rem',
                          }}>
                            <span style={{ color: resultColor }}>
                              You: {myScore}/{myTotal} ({myTotal > 0 ? Math.round((myScore / myTotal) * 100) : 0}%)
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>
                              {opponentName}: {theirScore}/{theirTotal} ({theirTotal > 0 ? Math.round((theirScore / theirTotal) * 100) : 0}%)
                            </span>
                          </div>
                        )}
                      </div>

                      {needsMyScore && (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => navigate('challenge-play', ch.id)}
                        >
                          <Swords size={13} /> Play
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Share Deck Modal */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal animate-fade-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              Share Deck
              <button className="btn btn-icon btn-sm" onClick={() => setShowShareModal(false)}><X size={14} /></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 16 }}>
                <label className="label">Select Deck</label>
                <select className="input" value={shareDeckId} onChange={e => setShareDeckId(e.target.value)}>
                  <option value="">Choose a deck...</option>
                  {decks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Share With</label>
                <select className="input" value={shareFriendId} onChange={e => setShareFriendId(e.target.value)}>
                  <option value="">Choose a friend...</option>
                  {friends.map(f => <option key={f.id} value={f.id}>{f.username}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-sm" onClick={() => setShowShareModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleShareDeck} disabled={!shareDeckId || !shareFriendId}>
                <Share2 size={14} /> Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Challenge Modal */}
      {showChallengeModal && (
        <div className="modal-overlay" onClick={() => setShowChallengeModal(false)}>
          <div className="modal animate-fade-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              Challenge a Friend
              <button className="btn btn-icon btn-sm" onClick={() => setShowChallengeModal(false)}><X size={14} /></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 16 }}>
                <label className="label">Select Deck</label>
                <select className="input" value={challengeDeckId} onChange={e => setChallengeDeckId(e.target.value)}>
                  <option value="">Choose a deck...</option>
                  {decks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Challenge</label>
                <select className="input" value={challengeFriendId} onChange={e => setChallengeFriendId(e.target.value)}>
                  <option value="">Choose a friend...</option>
                  {friends.map(f => <option key={f.id} value={f.id}>{f.username}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-sm" onClick={() => setShowChallengeModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleCreateChallenge} disabled={!challengeDeckId || !challengeFriendId}>
                <Swords size={14} /> Send Challenge
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
