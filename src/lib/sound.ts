// Tiny WebAudio chime — no asset files, works offline.
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return ctx;
  } catch {
    return null;
  }
}

/** Short rising two-note chime on challenge completion. */
export function playChime() {
  const ac = getCtx();
  if (!ac) return;
  // Resume if the browser suspended it (autoplay policy).
  if (ac.state === "suspended") void ac.resume();

  const now = ac.currentTime;
  const notes = [660, 990];
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const start = now + i * 0.09;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + 0.24);
  });
}
