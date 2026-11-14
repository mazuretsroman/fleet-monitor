export function RobotList({ robots }) {
  if (robots.length === 0) {
    return (
      <p className="empty">No robots yet. Add one to see it on the map.</p>
    );
  }

  return (
    <ul className="robot-list">
      {robots.map((robot) => (
        <li key={robot.id}>
          <span className="robot-name">{robot.name}</span>
          <span className={`robot-status robot-status-${robot.status}`}>
            {robot.status}
          </span>
          <span className="robot-position">
            {robot.lat.toFixed(5)}, {robot.lon.toFixed(5)}
          </span>
        </li>
      ))}
    </ul>
  );
}
