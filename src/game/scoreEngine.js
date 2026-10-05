import { initialStats } from "../data/stats.js";
export const clamp = (value) => Math.max(0, Math.min(100, value));
export function applyEffects(currentStats, effects = {}) {
  return Object.fromEntries(
    Object.keys(initialStats).map((key) => {
      const value = Number.isFinite(currentStats[key]) ? currentStats[key] : 50;
      const effect = Number.isFinite(effects[key]) ? effects[key] : 0;
      return [key, clamp(value + effect)];
    }),
  );
}
export function calculateFinalScore(stats) {
  return Math.round(
    ["liemChinh", "trachNhiem", "tuLuc", "nhanAi"].reduce(
      (sum, key) => sum + clamp(stats[key]),
      0,
    ) / 4,
  );
}
