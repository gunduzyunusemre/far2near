import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { SocketEvents } from '@far2near/shared-types';
import { httpRateLimiter } from './middleware/rateLimiter.js';
import { RoomManager } from './models/roomManager.js';
import { registerRoomHandlers } from './handlers/roomHandler.js';
import { registerChatHandlers } from './handlers/chatHandler.js';
import { registerWebRTCHandlers } from './handlers/webrtcHandler.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Enable trust proxy for Cloudflare Tunnel / reverse proxies
app.set('trust proxy', 1);

const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];

// Middlewares
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl) or allowed origins
      if (!origin || CORS_ORIGIN.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('CORS Policy Denied'));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '25mb' }));
app.use(httpRateLimiter);

// Socket.io Configuration
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  maxHttpBufferSize: 25 * 1024 * 1024, // 25MB for file attachments
  pingTimeout: 20000,
  pingInterval: 10000,
});

const roomManager = RoomManager.getInstance();

// REST Endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    service: 'far2near-signaling-server',
  });
});

app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const activeRoom = roomManager.getRoom(roomId);
  if (!activeRoom) {
    return res.status(404).json({ error: 'Oda bulunamadı' });
  }

  return res.json({
    id: activeRoom.room.id,
    name: activeRoom.room.settings.name,
    description: activeRoom.room.settings.description,
    coverImage: activeRoom.room.settings.coverImage,
    isPrivate: activeRoom.room.settings.isPrivate,
    isLocked: activeRoom.room.settings.isLocked,
    maxParticipants: activeRoom.room.settings.maxParticipants,
    currentParticipants: activeRoom.participants.size,
    createdAt: activeRoom.room.createdAt,
  });
});

// Socket.io Connection
io.on('connection', (socket: Socket) => {
  // Register handlers
  registerRoomHandlers(io, socket);
  registerChatHandlers(io, socket);
  registerWebRTCHandlers(io, socket);

  // Handle Disconnect
  socket.on('disconnect', () => {
    const removal = roomManager.removeParticipant(socket.id);
    if (removal) {
      const { activeRoom, participant } = removal;

      // If they were in a voice channel, notify peers
      if (participant.voiceChannelId) {
        socket.to(activeRoom.room.id).emit(SocketEvents.VOICE_PEER_LEFT, {
          socketId: socket.id,
          userId: participant.id,
          channelId: participant.voiceChannelId,
        });
      }

      // Notify room of user departure
      socket.to(activeRoom.room.id).emit(SocketEvents.ROOM_USER_LEFT, {
        userId: participant.id,
        nickname: participant.nickname,
      });
    }
  });
});

import path from 'path';

const webDistPath =
  typeof __dirname !== 'undefined'
    ? path.resolve(__dirname, '../../web/dist')
    : path.resolve(process.cwd(), 'apps/web/dist');

// Serve static frontend files
app.use(express.static(webDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  res.sendFile(path.join(webDistPath, 'index.html'));
});

httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 far2near Unified Server running on port ${PORT}`);
  console.log(`➜ Local:   http://localhost:${PORT}`);
  console.log(`➜ Network: http://0.0.0.0:${PORT}`);
});
