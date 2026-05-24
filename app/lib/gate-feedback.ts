export type GateFeedbackKind = "success" | "error" | "neutral";

/** Short beep so volunteers hear result without reading the screen. */
export function playGateBeep(kind: GateFeedbackKind) {
  if (typeof window === "undefined") return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.1;

    if (kind === "success") {
      osc.frequency.value = 920;
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (kind === "error") {
      osc.frequency.value = 280;
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } else {
      osc.frequency.value = 520;
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    }

    window.setTimeout(() => void ctx.close(), 400);
  } catch {
    /* ignore — vibration still works */
  }
}

export function pulseDevice(kind: GateFeedbackKind) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(kind === "success" ? 60 : kind === "error" ? [60, 30, 60] : 30);
  }
}

export function gateFeedback(kind: GateFeedbackKind) {
  playGateBeep(kind);
  pulseDevice(kind);
}
