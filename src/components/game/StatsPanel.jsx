import { statDefinitions } from "../../data/stats";
import { useState } from "react";
export function StatBar({ label, value, symbol }) {
  return (
    <div className="stat-row">
      <div>
        <span>
          {symbol} {label}
        </span>
        <strong>{value}</strong>
      </div>
      <div
        className="stat-track"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <span style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
export default function StatsPanel({ stats, expanded = false }) {
  const [open, setOpen] = useState(
    () => expanded || window.matchMedia("(min-width: 900px)").matches,
  );
  return (
    <details
      className="panel stats-panel"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        Hồ sơ hiện tại <span>5 chỉ số ↗</span>
      </summary>
      <div className="stats-content">
        {statDefinitions.map((stat) => (
          <StatBar key={stat.id} {...stat} value={stats[stat.id]} />
        ))}
        <p>
          Hiệu suất thể hiện sự thuận tiện và tốc độ trong tình huống, không
          cộng vào điểm làm chủ AI.
        </p>
      </div>
    </details>
  );
}
