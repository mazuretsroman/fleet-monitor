import http from 'node:http';
import { app } from './app.js';
import { config } from './config.js';
import { startSimulation } from './services/simulation.js';
import { attachWebSocket } from './ws.js';

const server = http.createServer(app);
attachWebSocket(server);

server.listen(config.port, () => {
  console.log(`API listening on port ${config.port}`);
  startSimulation();
});
