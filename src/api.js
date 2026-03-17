const API = '/api';

function getToken() {
  return localStorage.getItem('optika_token');
}

function setToken(token) {
  localStorage.setItem('optika_token', token);
}

function clearToken() {
  localStorage.removeItem('optika_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  // Remove Content-Type for FormData
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearToken();
    window.location.reload();
    throw new Error('Unauthorized');
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// Auth
export async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data;
}

export async function register(email, username, password) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, username, password }),
  });
  setToken(data.token);
  return data;
}

export async function getMe() {
  return request('/auth/me');
}

export async function setApiKey(apiKey, provider) {
  return request('/auth/api-key', {
    method: 'PUT',
    body: JSON.stringify({ apiKey, provider }),
  });
}

export async function setApiProvider(provider) {
  return request('/auth/api-provider', {
    method: 'PUT',
    body: JSON.stringify({ provider }),
  });
}

export function logout() {
  clearToken();
}

export function isLoggedIn() {
  return !!getToken();
}

// Decks
export async function fetchDecks() {
  return request('/decks');
}

export async function fetchDeck(id) {
  return request(`/decks/${id}`);
}

export async function createDeck(name, description, color) {
  return request('/decks', {
    method: 'POST',
    body: JSON.stringify({ name, description, color }),
  });
}

export async function updateDeck(id, updates) {
  return request(`/decks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteDeck(id) {
  return request(`/decks/${id}`, { method: 'DELETE' });
}

export async function recordDeckStudy(deckId) {
  return request(`/decks/${deckId}/study`, { method: 'POST' });
}

// Cards
export async function addCard(deckId, front, back) {
  return request(`/decks/${deckId}/cards`, {
    method: 'POST',
    body: JSON.stringify({ front, back }),
  });
}

export async function addCardsBulk(deckId, cards) {
  return request(`/decks/${deckId}/cards/bulk`, {
    method: 'POST',
    body: JSON.stringify({ cards }),
  });
}

export async function updateCard(deckId, cardId, updates) {
  return request(`/decks/${deckId}/cards/${cardId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteCard(deckId, cardId) {
  return request(`/decks/${deckId}/cards/${cardId}`, { method: 'DELETE' });
}

export async function recordCardStudy(deckId, cardId, correct) {
  return request(`/decks/${deckId}/cards/${cardId}/study`, {
    method: 'POST',
    body: JSON.stringify({ correct }),
  });
}

// Upload
export async function uploadFile(file, deckName, deckId) {
  const formData = new FormData();
  formData.append('file', file);
  if (deckName) formData.append('deckName', deckName);
  if (deckId) formData.append('deckId', deckId);

  const token = getToken();
  const res = await fetch(`${API}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

export async function fetchUploadHistory() {
  return request('/upload/history');
}

export async function extractTextFromFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const token = getToken();
  const res = await fetch(`${API}/upload/extract-text`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Extraction failed');
  return data;
}

// Friends
export async function searchUsers(q) {
  return request(`/friends/search?q=${encodeURIComponent(q)}`);
}

export async function fetchFriends() {
  return request('/friends');
}

export async function fetchFriendRequests() {
  return request('/friends/requests');
}

export async function fetchSentRequests() {
  return request('/friends/requests/sent');
}

export async function sendFriendRequest(userId) {
  return request('/friends/request', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function acceptFriendRequest(requestId) {
  return request(`/friends/request/${requestId}/accept`, { method: 'PUT' });
}

export async function declineFriendRequest(requestId) {
  return request(`/friends/request/${requestId}`, { method: 'DELETE' });
}

export async function removeFriend(friendId) {
  return request(`/friends/${friendId}`, { method: 'DELETE' });
}

export async function shareDeck(deckId, friendId) {
  return request('/friends/share-deck', {
    method: 'POST',
    body: JSON.stringify({ deckId, friendId }),
  });
}

export async function fetchSharedDecks() {
  return request('/friends/shared-decks');
}

// Challenges
export async function createChallenge(deckId, opponentId) {
  return request('/friends/challenge', {
    method: 'POST',
    body: JSON.stringify({ deckId, opponentId }),
  });
}

export async function fetchChallenges() {
  return request('/friends/challenges');
}

export async function submitChallengeScore(challengeId, score, total) {
  return request(`/friends/challenge/${challengeId}/score`, {
    method: 'PUT',
    body: JSON.stringify({ score, total }),
  });
}

// Courses
export async function fetchCourses() {
  return request('/courses');
}

export async function createCourse(name, description, color) {
  return request('/courses', {
    method: 'POST',
    body: JSON.stringify({ name, description, color }),
  });
}

export async function joinCourse(inviteCode) {
  return request('/courses/join', {
    method: 'POST',
    body: JSON.stringify({ inviteCode }),
  });
}

export async function fetchCourse(id) {
  return request(`/courses/${id}`);
}

export async function updateCourse(id, updates) {
  return request(`/courses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteCourse(id) {
  return request(`/courses/${id}`, { method: 'DELETE' });
}

export async function leaveCourse(id) {
  return request(`/courses/${id}/leave`, { method: 'POST' });
}

export async function addCourseDeck(courseId, deckId) {
  return request(`/courses/${courseId}/decks`, {
    method: 'POST',
    body: JSON.stringify({ deckId }),
  });
}

export async function removeCourseDeck(courseId, deckId) {
  return request(`/courses/${courseId}/decks/${deckId}`, { method: 'DELETE' });
}

// Notes
export async function createNote(courseId, title) {
  return request(`/courses/${courseId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export async function fetchNote(courseId, noteId) {
  return request(`/courses/${courseId}/notes/${noteId}`);
}

export async function updateNote(courseId, noteId, updates) {
  return request(`/courses/${courseId}/notes/${noteId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteNote(courseId, noteId) {
  return request(`/courses/${courseId}/notes/${noteId}`, { method: 'DELETE' });
}

export async function saveNoteHistory(courseId, noteId) {
  return request(`/courses/${courseId}/notes/${noteId}/history`, { method: 'POST' });
}

export async function fetchNoteHistory(courseId, noteId) {
  return request(`/courses/${courseId}/notes/${noteId}/history`);
}

export async function restoreNoteVersion(courseId, noteId, historyId) {
  return request(`/courses/${courseId}/notes/${noteId}/restore/${historyId}`, { method: 'PUT' });
}

// Token access for socket auth
export { getToken };
