import jwt from 'jsonwebtoken';
import { WebSocketServer } from 'ws';
import { config } from './config.js';
import { subscribeToRobots } from './services/robotEvents.js';

const AUTH_TIMEOUT_MS = 5000;
const UNAUTHORIZED = 4401;

const clients = new Set();

function isValidAuthMessage(data) {
  try {
    const message = JSON.parse(data);
    if (message.type !== 'auth') {
      return false;
    }
    jwt.verify(message.token, config.jwtSecret, { algorithms: ['HS256'] });
    return true;
  } catch {
    return false;
  }
}

export function attachWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  subscribeToRobots(broadcastRobot);

  wss.on('connection', (socket) => {
    const authTimer = setTimeout(() => {
      socket.close(UNAUTHORIZED, 'Authentication timeout.');
    }, AUTH_TIMEOUT_MS);

    socket.once('message', (data) => {
      clearTimeout(authTimer);

      if (!isValidAuthMessage(data)) {
        return socket.close(UNAUTHORIZED, 'Invalid token.');
      }

      clients.add(socket);
      socket.send(JSON.stringify({ type: 'auth.ok' }));
    });

    socket.on('close', () => {
      clearTimeout(authTimer);
      clients.delete(socket);
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error.message);
    });
  });
}

function broadcastRobot(robot) {
  const message = JSON.stringify({ type: 'robot.updated', robot });

  for (const socket of clients) {
    socket.send(message);
  }
}
