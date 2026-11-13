import { broadcastRobot } from '../ws.js';
import { listRobots, moveRobot } from './robots.js';

const INTERVAL_MS = 2000;

async function tick() {
  const robots = await listRobots();

  for (const { id } of robots) {
    const robot = await moveRobot(id);

    if (robot) broadcastRobot(robot);
  }
}

export function startSimulation() {
  setInterval(() => {
    tick().catch((error) => {
      console.error('Simulation tick failed.', error.message);
    });
  }, INTERVAL_MS);
}
