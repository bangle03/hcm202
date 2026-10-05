import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { useGameState } from "../../hooks/useGameState";
import { getSceneById, SCENE_CHOICE_SECONDS } from "../../game/gameEngine";
import SceneCard from "./SceneCard";
import ConsequenceCard from "./ConsequenceCard";
import CheckpointScreen from "./CheckpointScreen";
import ChapterHeader from "./ChapterHeader";
import StatsPanel from "./StatsPanel";
import FinalProfile from "./FinalProfile";
import { getCheckpointProgress, getVoteProgress, shouldShowCommunity } from "../../game/communityEngine";
import CommunityWaiting from "../community/CommunityWaiting";
import CommunityEventScreen from "../community/CommunityEventScreen";
export default function PersonalGame(props) {
  const { state, error, invalid, notice, saving, choose, continueGame, retry } =
    useGameState(props);
  const { pathname } = useLocation();
  const screen = useRef(null);
  useEffect(() => {
    screen.current?.focus({ preventScroll: true });
  }, [state?.currentSceneId, state?.gamePhase]);
  if (!state) return <p role="status">Đang khôi phục hành trình…</p>;
  if (state.finished && !saving && !invalid && pathname !== "/result")
    return <Navigate to="/result" replace />;
  if (!state.finished && pathname === "/result")
    return <Navigate to="/play" replace />;
  const disabled = saving || !props.online || !!invalid;
  const scene = getSceneById(state.currentSceneId);
  const timerReady = Number.isFinite(state.sceneStartedAt);
  const remainingSeconds = timerReady
    ? Math.max(0, Math.ceil((state.sceneStartedAt + SCENE_CHOICE_SECONDS * 1000 - props.serverNow) / 1000))
    : SCENE_CHOICE_SECONDS;
  const community = shouldShowCommunity(state, props.room);
  const lastAction = state.history[state.history.length - 1];
  return (
    <div className="personal-game">
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {lastAction?.choiceId === "__timeout__" && (
        <p className="notice" role="status">Đã hết 30 giây ở tình huống trước: mỗi chỉ số giảm 3 điểm. Game đã tự chuyển tiếp.</p>
      )}
      {error && (
        <div className="notice error" role="alert">
          {error}{" "}
          {invalid ? (
            <button
              className="text-button"
              onClick={() => window.location.reload()}
            >
              Tải lại trang
            </button>
          ) : (
            <button
              className="text-button"
              disabled={!props.online}
              onClick={retry}
            >
              Thử lưu lại
            </button>
          )}
        </div>
      )}
      <div className="save-status" role="status">
        {!props.online
          ? "Mất kết nối. Tiến trình trên màn hình được giữ lại; hãy kết nối lại để tiếp tục."
          : saving
            ? "Đang lưu tiến trình… Vui lòng chờ trước khi đóng trang."
            : error
              ? "Tiến trình cần được kiểm tra."
              : "Đã đồng bộ tiến trình"}
      </div>
      {!invalid &&
        (state.finished ? (
          <FinalProfile state={state} playerName={props.player?.name} />
        ) : (
          <>
            <ChapterHeader state={state} />
            <div className="game-layout">
              <div
                className="game-main"
                ref={screen}
                key={`${state.currentSceneId}:${state.gamePhase}`}
                tabIndex={-1}
              >
                {state.gamePhase === "scene" && (
                  <SceneCard
                    scene={scene}
                    onChoose={choose}
                    disabled={disabled}
                    choiceSeed={`${props.code}:${props.uid}`}
                    remainingSeconds={remainingSeconds}
                    timerReady={timerReady}
                    timerExpired={state.timerExpired}
                  />
                )}{" "}
                {state.gamePhase === "consequence" && (
                  <ConsequenceCard
                    scene={scene}
                    state={state}
                    disabled={disabled}
                    onContinue={continueGame}
                  />
                )}{" "}
                {state.gamePhase === "checkpoint" && (
                  <>
                    <CheckpointScreen
                      state={state}
                      disabled={disabled}
                      onContinue={continueGame}
                      hideContinue={!!community}
                    />
                    {community && (community.eventState ? (
                      <CommunityEventScreen
                        definition={community.event}
                        eventState={community.eventState}
                        code={props.code}
                        uid={props.uid}
                        online={props.online}
                        serverNow={props.serverNow}
                        progress={getVoteProgress(props.room, community.event.id)}
                        onContinue={continueGame}
                        disabled={disabled}
                      />
                    ) : (
                      <CommunityWaiting
                        progress={getCheckpointProgress(props.room, community.event.checkpoint)}
                        hostOnline={Object.keys(props.room.hostConnections || {}).length > 0}
                      />
                    ))}
                  </>
                )}
              </div>
              <StatsPanel stats={state.stats} />
            </div>
          </>
        ))}
    </div>
  );
}
