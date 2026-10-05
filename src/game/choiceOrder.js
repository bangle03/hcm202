// The anonymous UID gives each device a stable order across refreshes without
// changing choice IDs or the route selected by the game engine.
export function shuffledChoices(choices, seed) {
  let hash = 2166136261;
  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const result = [...choices];
  for (let index = result.length - 1; index > 0; index--) {
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    const swap = (hash >>> 0) % (index + 1);
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}
