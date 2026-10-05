import { ref, runTransaction, serverTimestamp, get } from "firebase/database";
import { restoreState } from "../game/gameEngine.js";

// A mutation is retried with the same ID after reconnect/refresh. Effects are
// calculated once in the engine, never inside Firebase's retrying callback.
export async function saveProgress(database, code, uid, mutation) {
  const target = ref(database, `rooms/${code}/players/${uid}`);
  const result = await runTransaction(
    target,
    (player) => {
      if (!player) return player;
      if (
        player.mutationId === mutation.id ||
        (player.revision || 0) !== mutation.baseRevision ||
        player.finished
      )
        return;
      const progress = { ...mutation.next };
      delete progress.revision;
      delete progress.mutationId;
      delete progress.finishedAt;
      if (progress.gamePhase === "scene" && progress.sceneStartedAt == null)
        progress.sceneStartedAt = serverTimestamp();
      return {
        ...player,
        ...progress,
        revision: mutation.baseRevision + 1,
        mutationId: mutation.id,
        updatedAt: serverTimestamp(),
        ...(progress.finished ? { finishedAt: serverTimestamp() } : {}),
      };
    },
    { applyLocally: false },
  );
  const player = result.committed
    ? result.snapshot.val()
    : (await get(target)).val();
  if (!player?.currentSceneId)
    throw new Error(
      "Chưa lưu được tiến trình. Vui lòng thử lại khi có kết nối.",
    );
  return {
    state: restoreState(player),
    conflict: player.mutationId !== mutation.id,
  };
}
