import { scenes } from "../data/scenes.js";
import { chapters } from "../data/chapters.js";
import { initialStats } from "../data/stats.js";
import { applyEffects, calculateFinalScore } from "./scoreEngine.js";
const sceneMap = new Map(scenes.map((scene) => [scene.id, scene]));
export const getSceneById = (id) => sceneMap.get(id) || null;
export const getNextScene = (choice) => getSceneById(choice.nextSceneId);
export const isCheckpoint = (scene) => scene?.checkpoint === true;
export const isFinalScene = (scene) => scene?.final === true;
export function createInitialState() {
  return {
    currentSceneId: scenes[0].id,
    stats: { ...initialStats },
    history: [],
    currentChapter: 1,
    currentCheckpoint: 0,
    finished: false,
    gamePhase: "scene",
    selectedChoiceId: "",
    revision: 0,
  };
}
export function applyChoice(state, choice, timestamp = Date.now()) {
  if (state.gamePhase !== "scene" || state.finished) return state;
  const scene = getSceneById(state.currentSceneId);
  const selected = scene?.choices.find(
    (item) => item.id === (typeof choice === "string" ? choice : choice?.id),
  );
  if (!selected)
    throw new Error("Không thể tải lựa chọn. Vui lòng thử tải lại trang.");
  return {
    ...state,
    stats: applyEffects(state.stats, selected.effects),
    gamePhase: "consequence",
    selectedChoiceId: selected.id,
    history: [
      ...state.history,
      {
        sceneId: scene.id,
        choiceId: selected.id,
        timestamp,
        effects: { ...selected.effects },
      },
    ],
  };
}
export function advanceState(state) {
  if (state.finished) return state;
  const scene = getSceneById(state.currentSceneId);
  if (!scene)
    throw new Error("Không thể tải tình huống. Vui lòng thử tải lại trang.");
  if (state.gamePhase === "checkpoint" && isFinalScene(scene))
    return {
      ...state,
      gamePhase: "finished",
      finished: true,
      finalScore: calculateFinalScore(state.stats),
    };
  const destination =
    state.gamePhase === "consequence"
      ? scene.choices.find((choice) => choice.id === state.selectedChoiceId)
          ?.nextSceneId
      : state.gamePhase === "checkpoint"
        ? scene.nextSceneId
        : null;
  if (!destination) return state;
  const next = getSceneById(destination);
  if (!next)
    throw new Error("Không thể tải tình huống. Vui lòng thử tải lại trang.");
  const chapter = chapters.find((item) => item.id === next.chapterId).number;
  return {
    ...state,
    currentSceneId: next.id,
    currentChapter: chapter,
    currentCheckpoint: isCheckpoint(next) ? chapter : state.currentCheckpoint,
    gamePhase: isCheckpoint(next) ? "checkpoint" : "scene",
    selectedChoiceId: "",
  };
}
// RTDB omits empty arrays. Normalize without replaying any effects on restore.
export function restoreState(raw) {
  if (!raw?.currentSceneId) return null;
  const state = Object.fromEntries(
    [
      "currentSceneId",
      "stats",
      "currentChapter",
      "currentCheckpoint",
      "finished",
      "gamePhase",
      "selectedChoiceId",
      "revision",
      "finalScore",
      "finishedAt",
      "mutationId",
    ]
      .filter((key) => raw[key] !== undefined)
      .map((key) => [key, raw[key]]),
  );
  state.history = Array.isArray(raw.history)
    ? raw.history
    : Object.values(raw.history || {});
  state.selectedChoiceId ||= "";
  return state;
}
export function stateError(state) {
  if (!state) return "";
  const scene = getSceneById(state.currentSceneId);
  if (!scene) return "Không thể tải tình huống. Vui lòng thử tải lại trang.";
  if (
    !Number.isInteger(state.currentChapter) ||
    state.currentChapter < 1 ||
    state.currentChapter > 4 ||
    !Number.isInteger(state.currentCheckpoint) ||
    state.currentCheckpoint < 0 ||
    state.currentCheckpoint > state.currentChapter ||
    !Array.isArray(state.history) ||
    !Number.isInteger(state.revision) ||
    state.revision < 0 ||
    (state.finished && !Number.isFinite(state.finalScore))
  )
    return "Không thể đọc tiến trình đã lưu. Vui lòng thử tải lại trang.";
  if (
    !Object.keys(initialStats).every(
      (key) =>
        Number.isFinite(state.stats?.[key]) &&
        state.stats[key] >= 0 &&
        state.stats[key] <= 100,
    )
  )
    return "Không thể đọc hồ sơ đã lưu. Vui lòng liên hệ người dẫn lớp.";
  if (
    !["scene", "consequence", "checkpoint", "finished"].includes(
      state.gamePhase,
    ) ||
    (state.gamePhase === "consequence" &&
      !scene.choices.some((c) => c.id === state.selectedChoiceId)) ||
    (state.gamePhase === "checkpoint" && !isCheckpoint(scene)) ||
    (state.gamePhase === "finished" &&
      (!state.finished || !isFinalScene(scene)))
  )
    return "Trạng thái trò chơi chưa hợp lệ. Vui lòng thử tải lại trang.";
  return "";
}
export function validateSceneData(content = scenes) {
  const errors = [];
  const ids = new Set(content.map((scene) => scene.id));
  if (ids.size !== content.length) errors.push("Trùng ID tình huống.");
  for (const scene of content) {
    if (!chapters.some((chapter) => chapter.id === scene.chapterId))
      errors.push(`Chương không tồn tại: ${scene.id}`);
    if (
      !scene.title ||
      (!scene.checkpoint && (!scene.description || !scene.choices?.length))
    )
      errors.push(`Thiếu nội dung: ${scene.id}`);
    if (scene.final && !scene.checkpoint)
      errors.push(`Kết thúc phải là checkpoint: ${scene.id}`);
    if (scene.checkpoint && !scene.final && !ids.has(scene.nextSceneId))
      errors.push(`Checkpoint thiếu đích: ${scene.id}`);
    const choices = new Set();
    for (const choice of scene.choices || []) {
      if (choices.has(choice.id))
        errors.push(`Trùng lựa chọn: ${scene.id}/${choice.id}`);
      choices.add(choice.id);
      if (!ids.has(choice.nextSceneId))
        errors.push(`Đích không tồn tại: ${scene.id}/${choice.id}`);
      if (!choice.text || !choice.consequence)
        errors.push(`Thiếu hậu quả: ${scene.id}/${choice.id}`);
      for (const [key, value] of Object.entries(choice.effects || {}))
        if (!(key in initialStats) || !Number.isFinite(value))
          errors.push(`Chỉ số không hợp lệ: ${scene.id}/${key}`);
    }
  }
  return errors;
}
