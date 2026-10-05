// Original melodic synthesis: warm pads, wooden mallets and answering bells.
// No recording, streaming, drum beat or external assets.
export function createAmbient() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass)
    throw new Error("Trình duyệt này chưa hỗ trợ nhạc nền.");
  const context = new AudioContextClass();
  const master = context.createGain();
  master.gain.value = 0;
  master.connect(context.destination);
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 3200;
  filter.Q.value = 0.3;
  filter.connect(master);
  const voices = new Set();
  let timer = null;
  let nextTime = 0;
  let chord = 0;
  const chords = [
    [60, 64, 67, 69], // C6
    [60, 65, 69, 74], // F6/9
    [59, 62, 67, 69], // Gadd9
    [60, 64, 67, 74], // Cadd9
  ];
  const melodies = [
    [76, 79, 81, 79],
    [77, 76, 74, 72],
    [74, 79, 77, 74],
    [76, 74, 72, 76],
  ];
  const beat = 0.8; // 75 BPM: a gentle lift without a driving drum beat.
  const arpeggio = [0, 1, 2, 1, 3, 2, 1, 2];
  const answers = [
    [72, 76, 79],
    [74, 77, 81],
    [74, 71, 79],
    [79, 76, 72],
  ];
  const frequency = (note) => 440 * 2 ** ((note - 69) / 12);
  function note(midi, start, duration, gain, type = "sine", plucked = false) {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency(midi);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(
      gain,
      start + (plucked ? 0.025 : 0.7),
    );
    if (plucked) {
      envelope.gain.exponentialRampToValueAtTime(
        0.0001,
        start + duration - 0.05,
      );
    } else {
      envelope.gain.setValueAtTime(gain, start + duration - 1.5);
    }
    envelope.gain.linearRampToValueAtTime(0, start + duration);
    oscillator.connect(envelope);
    envelope.connect(filter);
    voices.add(oscillator);
    oscillator.onended = () => {
      voices.delete(oscillator);
      oscillator.disconnect();
      envelope.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(start + duration + 0.1);
  }
  function schedule() {
    if (context.state !== "running") return;
    if (nextTime < context.currentTime) nextTime = context.currentTime + 0.1;
    while (nextTime < context.currentTime + 1) {
      const phrase = chord % chords.length;
      const notes = chords[phrase];
      // Move the harmony up an octave and let the melody carry the foreground.
      notes.forEach((midi) =>
        note(midi, nextTime, beat * 8 + 1, 0.04, "triangle"),
      );
      arpeggio.forEach((index, step) => {
        note(
          notes[index],
          nextTime + step * beat,
          1.25,
          step % 2 ? 0.055 : 0.075,
          "triangle",
          true,
        );
        // A short upper partial gives the pluck a soft wooden-mallet colour.
        note(
          notes[index] + 24,
          nextTime + step * beat,
          0.32,
          0.013,
          "sine",
          true,
        );
      });
      melodies[phrase].forEach((midi, step) => {
        const start = nextTime + step * beat * 2 + 0.08;
        note(midi, start, 2, 0.1, "sine", true);
        // Quiet upper partials add a bell-like colour without a sharp attack.
        note(midi + 12, start, 1.4, 0.018, "sine", true);
        note(midi + 19, start, 0.9, 0.007, "sine", true);
      });
      // Leave space between the main notes, then answer with a small bright motif.
      answers[phrase].forEach((midi, step) => {
        const start = nextTime + [1.5, 3.5, 6.75][step] * beat;
        note(midi, start, 0.95, 0.065, "sine", true);
        note(midi + 12, start, 0.5, 0.016, "sine", true);
      });
      nextTime += beat * 8;
      chord++;
    }
  }
  return {
    async play(volume) {
      await context.resume();
      if (context.state !== "running")
        throw new Error("Chạm bật nhạc lần nữa để trình duyệt cho phép phát.");
      master.gain.setTargetAtTime(volume * 0.9, context.currentTime, 0.15);
      if (!timer) {
        schedule();
        timer = setInterval(schedule, 500);
      }
    },
    async pause() {
      clearInterval(timer);
      timer = null;
      await context.suspend();
    },
    setVolume(volume) {
      master.gain.setTargetAtTime(volume * 0.9, context.currentTime, 0.2);
    },
    close() {
      clearInterval(timer);
      timer = null;
      for (const voice of voices) {
        try {
          voice.stop();
        } catch {
          /* already ended */
        }
      }
      return context.close();
    },
  };
}
