export function getLeaderboard(players = {}) {
  return Object.entries(players)
    .filter(
      ([, player]) => player.finished && Number.isFinite(player.finalScore),
    )
    .map(([uid, player]) => ({ ...player, uid }))
    .sort(
      (a, b) =>
        b.finalScore - a.finalScore ||
        (a.finishedAt ?? Infinity) - (b.finishedAt ?? Infinity) ||
        a.uid.localeCompare(b.uid),
    );
}
