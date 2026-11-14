import { useEffect } from 'react';
import { API_URL } from '../api.js';

const WS_URL = `${API_URL.replace(/^http/, 'ws')}/ws`;
const RECONNECT_DELAY_MS = 2000;
const UNAUTHORIZED = 4401;

export function useRobotUpdates(token, onRobot, onUnauthorized) {
  useEffect(() => {
    let socket;
    let reconnectTimer;
    let stopped = false;

    function connect() {
      socket = new WebSocket(WS_URL);

      socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'auth', token }));
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'robot.updated') {
          onRobot(message.robot);
        }
      };

      socket.onclose = (event) => {
        if (stopped) {
          return;
        }
        if (event.code === UNAUTHORIZED) {
          return onUnauthorized();
        }
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      };
    }

    connect();

    return () => {
      stopped = true;
      clearTimeout(reconnectTimer);
      socket.close();
    };
  }, [token, onRobot, onUnauthorized]);
}
