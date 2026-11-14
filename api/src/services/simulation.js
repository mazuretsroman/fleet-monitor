import { listRobots, moveRobot } from './robots.js';
import { publishRobot } from './robotEvents.js';

const INTERVAL_MS = 2000;

async function tick() {
  const robots = await listRobots();

  for (const { id } of robots) {
    const robot = await moveRobot(id);

    if (robot) await publishRobot(robot);
  }
}

export function startSimulation() {
  setInterval(() => {
    tick().catch((error) => {
      console.error('Simulation tick failed:', error.message);
    });
  }, INTERVAL_MS);
}
