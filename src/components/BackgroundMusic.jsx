import { useEffect, useRef, useState } from "react";
import { createAmbient } from "../audio/ambient";
export default function BackgroundMusic() {
  const audio = useRef(null);
  const pending = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [volume, setVolume] = useState(() => {
    try {
      const raw = localStorage.getItem("ai-music-volume");
      const value = raw === null ? 0.45 : Number(raw);
      return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.45;
    } catch {
      return 0.45;
    }
  });
  useEffect(
    () => () => {
      audio.current?.close().catch(() => {});
      audio.current = null;
    },
    [],
  );
  useEffect(() => {
    function hide() {
      if (document.hidden && audio.current) {
        audio.current.pause().catch(() => {});
        setPlaying(false);
      }
    }
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  async function toggle() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      audio.current ??= createAmbient();
      if (playing) {
        await audio.current.pause();
        setPlaying(false);
      } else {
        await audio.current.play(volume);
        setPlaying(true);
      }
    } catch {
      setPlaying(false);
      setError("Chưa phát được nhạc. Bạn thử bật lại nhé.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function changeVolume(value) {
    setVolume(value);
    audio.current?.setVolume(value);
    try {
      localStorage.setItem("ai-music-volume", String(value));
    } catch {
      /* volume still works for this session */
    }
  }
  return (
    <div className="music-bar">
      <button
        type="button"
        className="music-toggle"
        aria-pressed={playing}
        disabled={busy}
        onClick={toggle}
      >
        {playing ? "Ⅱ Tắt nhạc" : "♫ Bật nhạc nền"}
      </button>
      <span className="music-description">Giai điệu tươi sáng, nhẹ nhàng</span>
      <label className="volume-control">
        Âm lượng
        <input
          aria-label="Âm lượng nhạc nền"
          type="range"
          min="0"
          max="100"
          value={Math.round(volume * 100)}
          onChange={(event) => changeVolume(Number(event.target.value) / 100)}
        />
        <span>{Math.round(volume * 100)}%</span>
      </label>
      {playing && volume === 0 && (
        <span role="status">
          Âm lượng đang ở 0%. Kéo thanh âm lượng để nghe nhạc.
        </span>
      )}
      {error && (
        <span role="alert" className="error">
          {error}
        </span>
      )}
    </div>
  );
}
