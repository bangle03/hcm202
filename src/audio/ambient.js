// Original, quiet ambient synthesis: no recording, streaming or external assets.
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
  filter.frequency.value = 1100;
  filter.Q.value = 0.3;
  filter.connect(master);
  const voices = new Set();
  let timer = null;
  let nextTime = 0;
  let chord = 0;
  const chords = [
    [48, 55, 59, 62],
    [45, 52, 55, 59],
    [41, 48, 52, 55],
    [43, 50, 55, 57],
  ];
  const frequency = (note) => 440 * 2 ** ((note - 69) / 12);
  function note(midi, start, duration, gain, type = "sine") {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency(midi);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(gain, start + 1.5);
    envelope.gain.setValueAtTime(gain, start + duration - 2);
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
      const notes = chords[chord % chords.length];
      notes.forEach((midi) => note(midi, nextTime, 10, 0.06));
      note(notes[2] + 12, nextTime + 3, 5, 0.035);
      nextTime += 8;
      chord++;
    }
  }
  return {
    async play(volume) {
      await context.resume();
      if (context.state !== "running")
        throw new Error("Chạm bật nhạc lần nữa để trình duyệt cho phép phát.");
      master.gain.setTargetAtTime(volume * 0.45, context.currentTime, 0.6);
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
      master.gain.setTargetAtTime(volume * 0.45, context.currentTime, 0.2);
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
