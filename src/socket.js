import { io } from 'socket.io-client';
import { getToken } from './api';

let socket = null;

export function getSocket() {
  if (socket && socket.connected) return socket;

  const token = getToken();
  if (!token) return null;

  socket = io('/', {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
