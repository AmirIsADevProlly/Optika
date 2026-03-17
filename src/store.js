import { create } from 'zustand';
import * as api from './api';

const useStore = create((set, get) => ({
  // Auth
  user: null,
  isAuthenticated: api.isLoggedIn(),
  authLoading: true,
  authError: null,

  // Data
  decks: [],
  currentView: 'dashboard',
  currentDeckId: null,
  currentDeck: null,
  loading: false,
  error: null,

  // Auth actions
  initAuth: async () => {
    if (!api.isLoggedIn()) {
      set({ authLoading: false, isAuthenticated: false });
      return;
    }
    try {
      const user = await api.getMe();
      set({ user, isAuthenticated: true, authLoading: false });
      get().loadDecks();
    } catch {
      set({ isAuthenticated: false, authLoading: false, user: null });
    }
  },

  login: async (email, password) => {
    set({ authError: null });
    try {
      const data = await api.login(email, password);
      set({ user: data.user, isAuthenticated: true, authError: null });
      get().loadDecks();
    } catch (err) {
      set({ authError: err.message });
      throw err;
    }
  },

  register: async (email, username, password) => {
    set({ authError: null });
    try {
      const data = await api.register(email, username, password);
      set({ user: data.user, isAuthenticated: true, authError: null });
      get().loadDecks();
    } catch (err) {
      set({ authError: err.message });
      throw err;
    }
  },

  logout: () => {
    api.logout();
    set({
      user: null,
      isAuthenticated: false,
      decks: [],
      currentDeck: null,
      currentDeckId: null,
      currentView: 'dashboard',
    });
  },

  setApiKey: async (key, provider) => {
    await api.setApiKey(key, provider);
    const user = await api.getMe();
    set({ user });
  },

  // Navigation
  navigate: (view, deckId = null) => {
    set({ currentView: view, currentDeckId: deckId, currentDeck: null });
    if (deckId) {
      get().loadDeck(deckId);
    }
  },

  // Deck operations
  loadDecks: async () => {
    set({ loading: true });
    try {
      const decks = await api.fetchDecks();
      set({ decks, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  loadDeck: async (id) => {
    try {
      const deck = await api.fetchDeck(id);
      set({ currentDeck: deck });
    } catch (err) {
      set({ error: err.message });
    }
  },

  getCurrentDeck: () => get().currentDeck,

  createDeck: async (name, description, color) => {
    const deck = await api.createDeck(name, description, color);
    get().loadDecks();
    return deck.id;
  },

  updateDeck: async (deckId, updates) => {
    await api.updateDeck(deckId, updates);
    get().loadDeck(deckId);
    get().loadDecks();
  },

  deleteDeck: async (deckId) => {
    await api.deleteDeck(deckId);
    set(state => ({
      decks: state.decks.filter(d => d.id !== deckId),
      currentDeckId: state.currentDeckId === deckId ? null : state.currentDeckId,
      currentDeck: state.currentDeckId === deckId ? null : state.currentDeck,
    }));
  },

  // Card operations
  addCard: async (deckId, front, back) => {
    await api.addCard(deckId, front, back);
    get().loadDeck(deckId);
    get().loadDecks();
  },

  updateCard: async (deckId, cardId, updates) => {
    await api.updateCard(deckId, cardId, updates);
    get().loadDeck(deckId);
  },

  deleteCard: async (deckId, cardId) => {
    await api.deleteCard(deckId, cardId);
    get().loadDeck(deckId);
    get().loadDecks();
  },

  // Study
  recordStudy: async (deckId, cardId, correct) => {
    await api.recordCardStudy(deckId, cardId, correct);
  },

  incrementSessions: async (deckId) => {
    await api.recordDeckStudy(deckId);
    get().loadDecks();
  },

  // Upload
  uploadFile: async (file, deckName, deckId) => {
    const result = await api.uploadFile(file, deckName, deckId);
    get().loadDecks();
    return result;
  },

  // Computed
  getTotalCards: () => get().decks.reduce((sum, d) => sum + (d.card_count || 0), 0),
  getTotalMastered: () => get().decks.reduce((sum, d) => sum + (d.mastered_count || 0), 0),
  getOverallMastery: () => {
    const decks = get().decks;
    const total = decks.reduce((s, d) => s + (d.card_count || 0), 0);
    if (total === 0) return 0;
    const weighted = decks.reduce((s, d) => s + (d.avg_mastery || 0) * (d.card_count || 0), 0);
    return weighted / total;
  },
  getDueCards: () => {
    return get().decks.reduce((sum, d) => {
      return sum + Math.max(0, (d.card_count || 0) - (d.mastered_count || 0));
    }, 0);
  },
}));

export default useStore;
