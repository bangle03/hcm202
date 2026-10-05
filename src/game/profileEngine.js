import { profiles } from "../data/profiles.js";
import { calculateFinalScore } from "./scoreEngine.js";
export function getProfile(stats) {
  if (stats.hieuSuat >= 70 && stats.tuLuc < 45) return profiles.efficient;
  const core = [stats.liemChinh, stats.trachNhiem, stats.tuLuc, stats.nhanAi];
  if (
    calculateFinalScore(stats) >= 75 &&
    Math.min(...core) >= 65 &&
    Math.max(...core) - Math.min(...core) <= 25
  )
    return profiles.balanced;
  const priority = [
    ["tuLuc", "independent"],
    ["trachNhiem", "responsible"],
    ["nhanAi", "humane"],
    ["liemChinh", "transparent"],
  ];
  const [key, id] = priority.reduce((best, item) =>
    stats[item[0]] > stats[best[0]] ? item : best,
  );
  return stats[key] >= 60 ? profiles[id] : profiles.growing;
}
