require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { setupSocket } = require('./socket.cjs');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'optika-secret-key-change-in-production';

// Socket.io setup
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    // Look up username from DB
    const db = require('./db.cjs');
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(decoded.userId);
    socket.username = user?.username || 'Unknown';
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

setupSocket(io);

app.use(cors());
app.use(express.json());
app.set('io', io);

// API routes
app.use('/api/auth', require('./routes/auth.cjs'));
app.use('/api/decks', require('./routes/decks.cjs'));
app.use('/api/upload', require('./routes/upload.cjs'));
app.use('/api/friends', require('./routes/friends.cjs'));
app.use('/api/courses', require('./routes/courses.cjs'));

// Serve static files when dist folder exists (production)
const fs = require('fs');
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Optika server running on port ${PORT}`);
});
