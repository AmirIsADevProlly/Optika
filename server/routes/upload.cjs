const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID: uuid } = require('crypto');
const db = require('../db.cjs');
const { auth } = require('../middleware.cjs');

const router = express.Router();
router.use(auth);

// Configure multer
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'text/csv',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, TXT, MD, and CSV files are supported'));
    }
  },
});

// Extract text from file
async function extractText(filePath, mimeType) {
  if (mimeType === 'application/pdf') {
    let pdfParse = require('pdf-parse');
    // Handle both default and named exports (pdf-parse v2+ compatibility)
    if (pdfParse && typeof pdfParse !== 'function' && pdfParse.default) {
      pdfParse = pdfParse.default;
    }
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  // txt, md, csv
  return fs.readFileSync(filePath, 'utf-8');
}

const CARD_PROMPT = `You are a study assistant. Analyze the following text and generate high-quality flashcards for studying. Create between 8-25 flashcards depending on content density.

Rules:
- Each card should test ONE concept
- "front" should be a clear question or prompt
- "back" should be a concise but complete answer
- Cover the most important concepts, definitions, processes, and relationships
- Vary question types: definitions, explanations, comparisons, applications
- Avoid trivial or overly broad questions

Return ONLY a JSON array of objects with "front" and "back" keys. No markdown, no explanation, just the JSON array.

Text to analyze:
`;

function parseCardResponse(raw) {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned);
}

async function generateCardsAnthropic(text, apiKey) {
  const truncated = text.slice(0, 12000);
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: CARD_PROMPT + truncated }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return parseCardResponse(data.content[0].text);
}

async function generateCardsOpenRouter(text, apiKey) {
  const truncated = text.slice(0, 12000);
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://optika.app',
      'X-Title': 'Optika Study App',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4',
      max_tokens: 4096,
      messages: [{ role: 'user', content: CARD_PROMPT + truncated }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return parseCardResponse(data.choices[0].message.content);
}

async function generateCards(text, apiKey, provider) {
  if (provider === 'openrouter') {
    return generateCardsOpenRouter(text, apiKey);
  }
  return generateCardsAnthropic(text, apiKey);
}

// Upload and process file
router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { deckName, deckId: existingDeckId } = req.body;

  // Get user's API key and provider
  const user = db.prepare('SELECT anthropic_key, openrouter_key, api_provider FROM users WHERE id = ?').get(req.userId);
  const provider = user?.api_provider || 'anthropic';
  const apiKey = provider === 'openrouter'
    ? user?.openrouter_key
    : (user?.anthropic_key || process.env.ANTHROPIC_API_KEY);

  if (!apiKey || apiKey === 'your-api-key-here') {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({
      error: 'No API key configured. Set your API key in Settings to use AI card generation.',
    });
  }

  // Create upload record
  const uploadId = uuid();
  db.prepare('INSERT INTO uploads (id, user_id, filename, original_name, mime_type, size, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    uploadId, req.userId, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, 'processing'
  );

  try {
    // Extract text
    const text = await extractText(req.file.path, req.file.mimetype);

    if (!text || text.trim().length < 50) {
      db.prepare('UPDATE uploads SET status = ? WHERE id = ?').run('error', uploadId);
      return res.status(400).json({ error: 'Could not extract enough text from the file' });
    }

    // Generate cards with AI
    const cards = await generateCards(text, apiKey, provider);

    if (!Array.isArray(cards) || cards.length === 0) {
      db.prepare('UPDATE uploads SET status = ? WHERE id = ?').run('error', uploadId);
      return res.status(500).json({ error: 'Failed to generate flashcards' });
    }

    // Create or use existing deck
    let deckId = existingDeckId;
    if (!deckId) {
      deckId = uuid();
      const name = deckName || req.file.originalname.replace(/\.[^.]+$/, '');
      db.prepare('INSERT INTO decks (id, user_id, name, description, color) VALUES (?, ?, ?, ?, ?)').run(
        deckId, req.userId, name, `Generated from ${req.file.originalname}`, '#6D28D9'
      );
    }

    // Insert cards
    const insertCard = db.prepare('INSERT INTO cards (id, deck_id, front, back) VALUES (?, ?, ?, ?)');
    const insertAll = db.transaction((items) => {
      let count = 0;
      for (const c of items) {
        if (c.front && c.back) {
          insertCard.run(uuid(), deckId, c.front, c.back);
          count++;
        }
      }
      return count;
    });

    const count = insertAll(cards);

    // Update upload record
    db.prepare('UPDATE uploads SET status = ?, deck_id = ?, cards_generated = ? WHERE id = ?').run('completed', deckId, count, uploadId);

    const deck = db.prepare('SELECT * FROM decks WHERE id = ?').get(deckId);
    res.status(201).json({
      upload_id: uploadId,
      deck,
      cards_generated: count,
    });
  } catch (err) {
    console.error('Upload processing error:', err);
    db.prepare('UPDATE uploads SET status = ? WHERE id = ?').run('error', uploadId);
    res.status(500).json({ error: err.message || 'Failed to process file' });
  }
});

// GET upload history
router.get('/history', (req, res) => {
  const uploads = db.prepare(`
    SELECT u.*, d.name as deck_name
    FROM uploads u LEFT JOIN decks d ON u.deck_id = d.id
    WHERE u.user_id = ? ORDER BY u.created_at DESC LIMIT 50
  `).all(req.userId);

  res.json(uploads);
});

// POST /upload/extract-text — extract text from a file (for notes import)
router.post('/extract-text', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const text = await extractText(req.file.path, req.file.mimetype);

    if (!text || text.trim().length < 10) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Could not extract text from the file' });
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({ text: text.trim(), filename: req.file.originalname });
  } catch (err) {
    console.error('Text extraction error:', err);
    try { fs.unlinkSync(req.file.path); } catch (_) {}
    res.status(500).json({ error: err.message || 'Failed to extract text' });
  }
});

module.exports = router;
