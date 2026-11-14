import { redis, subscriber } from '../redis.js';

const CHANNEL = 'robots:updates';

let handler = () => {};

export async function publishRobot(robot) {
  try {
    await redis.publish(CHANNEL, JSON.stringify(robot));
  } catch {
    handler(robot);
  }
}

export function subscribeToRobots(onRobot) {
  handler = onRobot;

  subscriber.on('message', (channel, message) => {
    if (channel === CHANNEL) {
      handler(JSON.parse(message));
    }
  });

  subscriber.subscribe(CHANNEL).catch((error) => {
    console.error('Could not subscribe to robot updates:', error.message);
  });
}
