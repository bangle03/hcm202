import { useCallback, useEffect, useRef, useState } from "react";
import { db } from "../firebase/config";
import { saveProgress } from "../firebase/gameService";
import {
  applyChoice,
  applySceneTimeout,
  advanceState,
  createInitialState,
  restoreState,
  stateError,
  SCENE_CHOICE_SECONDS,
} from "../game/gameEngine";
import { loadPending, storePending } from "../game/recovery";
import { errorMessage } from "../utils/errors";

export function useGameState({ code, uid, startedAt, player, online, serverNow }) {
  const cacheKey = `ai-game:${code}:${uid}:${startedAt}`;
  const [pending, setPending] = useState(() =>
    loadPending(localStorage, cacheKey),
  );
  const [state, setState] = useState(
    () => pending?.next || restoreState(player),
  );
  const stateRef = useRef(state);
  stateRef.current = state;
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const lock = useRef(!!pending);
  const initialized = useRef(!!state);

  useEffect(() => {
    if (pending) return;
    const remote = restoreState(player);
    if (remote) {
      initialized.current = true;
      if (
        remote.gamePhase === "scene" && !Number.isFinite(remote.sceneStartedAt) &&
        (!stateRef.current || stateRef.current.revision <= remote.revision)
      ) {
        const next = { ...remote, sceneStartedAt: null, timerExpired: false };
        const migration = { id: crypto.randomUUID(), baseRevision: remote.revision || 0, next };
        if (!storePending(localStorage, cacheKey, migration))
          setNotice("Trình duyệt không lưu được bản dự phòng. Hãy chờ xác nhận đồng bộ trước khi đóng trang.");
        lock.current = true;
        setState(next);
        setPending(migration);
        return;
      }
      setState((current) =>
        current && current.revision > remote.revision ? current : remote,
      );
      return;
    }
    if (initialized.current) return;
    initialized.current = true;
    const next = createInitialState();
    const initial = { id: crypto.randomUUID(), baseRevision: 0, next };
    if (!storePending(localStorage, cacheKey, initial))
      setNotice(
        "Trình duyệt không lưu được bản dự phòng. Hãy chờ xác nhận đồng bộ trước khi đóng trang.",
      );
    lock.current = true;
    setState(next);
    setPending(initial);
  }, [player, pending, cacheKey]);

  useEffect(() => {
    if (!pending || !online) return;
    let active = true;
    setError("");
    saveProgress(db, code, uid, pending)
      .then((result) => {
        if (!active) return;
        storePending(localStorage, cacheKey, null);
        setState(result.state);
        setPending(null);
        lock.current = false;
        if (result.conflict)
          setNotice(
            "Tiến trình đã được cập nhật ở tab khác. Đã tải bản mới nhất; lựa chọn chưa lưu ở tab này không được áp dụng.",
          );
      })
      .catch((err) => {
        if (active)
          setError(
            `${errorMessage(err)} Nếu vừa cập nhật game, người quản trị cần publish Firebase Rules mới.`,
          );
      });
    return () => {
      active = false;
    };
  }, [pending, online, code, uid, cacheKey, retryCount]);

  const transition = useCallback((reducer) => {
    if (lock.current || !online || !state || stateError(state)) return;
    try {
      const next = reducer(state);
      if (next === state) return;
      const mutation = {
        id: crypto.randomUUID(),
        baseRevision: state.revision || 0,
        next,
      };
      lock.current = true;
      if (!storePending(localStorage, cacheKey, mutation))
        setNotice(
          "Trình duyệt không lưu được bản dự phòng. Hãy chờ xác nhận đồng bộ trước khi đóng trang.",
        );
      setState(next);
      setPending(mutation);
      setError("");
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [online, state, cacheKey]);
  useEffect(() => {
    if (
      online && !pending && state?.gamePhase === "scene" &&
      Number.isFinite(state.sceneStartedAt) &&
      (state.timerExpired || serverNow >= state.sceneStartedAt + SCENE_CHOICE_SECONDS * 1000)
    ) transition((current) => applySceneTimeout(current, serverNow));
  }, [online, pending, state, serverNow, transition]);
  const invalid = stateError(state);
  useEffect(() => {
    if (invalid && import.meta.env.DEV)
      console.error("[game recovery]", invalid, state?.currentSceneId);
  }, [invalid, state?.currentSceneId]);
  return {
    state,
    error: error || invalid,
    invalid,
    notice,
    saving: !!pending,
    choose: (id) => transition((current) =>
      !Number.isFinite(current.sceneStartedAt)
        ? current
        : current.timerExpired || serverNow >= current.sceneStartedAt + SCENE_CHOICE_SECONDS * 1000
        ? applySceneTimeout(current, serverNow)
        : applyChoice(current, id)),
    continueGame: () => transition(advanceState),
    retry: () => setRetryCount((value) => value + 1),
  };
}
