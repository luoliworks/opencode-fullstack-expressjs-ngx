import { Router, type NextFunction, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { verifyToken } from '../utils/jwt.js';

export interface ChatMessage {
  id: number;
  userId: number;
  username: string;
  text: string;
  createdAt: string;
}

interface SseClient {
  id: number;
  username: string;
  res: Response;
}

const MAX_MESSAGES = 200;
const MAX_TEXT_LENGTH = 2000;

let nextMessageId = 1;
let nextClientId = 1;
const messages: ChatMessage[] = [];
const clients = new Set<SseClient>();

function getOnlineUsers(): string[] {
  const unique = new Set<string>();
  for (const client of clients) {
    unique.add(client.username);
  }
  return Array.from(unique);
}

function broadcastEvent(event: string, payload: unknown): void {
  const frame = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) {
    try {
      client.res.write(frame);
    } catch {
      clients.delete(client);
    }
  }
}

// Allows either `Authorization: Bearer <token>` or `?token=<jwt>` for EventSource SSE.
function requireStreamAuth(req: Request, res: Response, next: NextFunction): void {
  const header: string | undefined = req.header('Authorization');
  let rawToken: string | undefined;
  if (header && header.startsWith('Bearer ')) {
    rawToken = header.slice('Bearer '.length).trim();
  } else if (typeof req.query.token === 'string' && req.query.token.trim() !== '') {
    rawToken = req.query.token.trim();
  }
  if (!rawToken) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const payload = verifyToken(rawToken);
  if (payload === null) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  req.auth = { sub: payload.sub, username: payload.username, role: payload.role };
  next();
}

const chatRouter: Router = Router();

// GET /api/chat/messages -> { messages, onlineUsers }
chatRouter.get('/messages', requireAuth, (_req: Request, res: Response) => {
  res.json({
    messages,
    onlineUsers: getOnlineUsers(),
  });
});

// GET /api/chat/stream?token=<jwt> -> Server-Sent Events stream
chatRouter.get('/stream', requireStreamAuth, (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const client: SseClient = {
    id: nextClientId++,
    username: req.auth!.username,
    res,
  };
  clients.add(client);

  // Send initial snapshot & broadcast updated online presence
  res.write(`event: snapshot\ndata: ${JSON.stringify({ messages, onlineUsers: getOnlineUsers() })}\n\n`);
  broadcastEvent('presence', { onlineUsers: getOnlineUsers() });

  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(client);
    broadcastEvent('presence', { onlineUsers: getOnlineUsers() });
  });
});

// POST /api/chat/messages  { text }
chatRouter.post('/messages', requireAuth, (req: Request, res: Response) => {
  const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!rawText) {
    res.status(400).json({ error: 'Message cannot be empty' });
    return;
  }
  const text = rawText.slice(0, MAX_TEXT_LENGTH);
  const message: ChatMessage = {
    id: nextMessageId++,
    userId: req.auth!.sub,
    username: req.auth!.username,
    text,
    createdAt: new Date().toISOString(),
  };

  messages.push(message);
  if (messages.length > MAX_MESSAGES) {
    messages.splice(0, messages.length - MAX_MESSAGES);
  }

  broadcastEvent('message', message);
  res.status(201).json(message);
});

// DELETE /api/chat/messages -> clear in-memory lobby history
chatRouter.delete('/messages', requireAuth, (_req: Request, res: Response) => {
  messages.length = 0;
  broadcastEvent('clear', {});
  res.json({ ok: true });
});

export default chatRouter;
