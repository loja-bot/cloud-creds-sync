// Generates a cinematic splash sound effect using Web Audio API
// Singleton guard: ensures sound plays exactly once, never overlaps

let hasPlayed = false;
let audioCtx: AudioContext | null = null;

export function playSplashSound() {
  // Strict single-play guard
  if (hasPlayed) return;
  hasPlayed = true;

  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtx = ctx;

    // Resume context if suspended (autoplay policy)
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const t = ctx.currentTime;

    // 1. Deep bass impact at 0ms
    const bassOsc = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bassOsc.type = "sine";
    bassOsc.frequency.setValueAtTime(80, t);
    bassOsc.frequency.exponentialRampToValueAtTime(30, t + 0.8);
    bassGain.gain.setValueAtTime(0.6, t);
    bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    bassOsc.connect(bassGain).connect(ctx.destination);
    bassOsc.start(t);
    bassOsc.stop(t + 0.8);

    // 2. Shimmer/whoosh at 300ms
    const noiseLength = 0.5;
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * noiseLength, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * 0.15;
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(2000, t + 0.3);
    noiseFilter.frequency.exponentialRampToValueAtTime(6000, t + 0.6);
    noiseFilter.Q.value = 0.5;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, t + 0.3);
    noiseGain.gain.linearRampToValueAtTime(0.3, t + 0.45);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    noiseSource.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);
    noiseSource.start(t + 0.3);
    noiseSource.stop(t + 0.8);

    // 3. Melodic chime at 800ms
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + 0.8 + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.85 + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 2.0 + i * 0.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + 0.8 + i * 0.08);
      osc.stop(t + 2.2);
    });

    // 4. Sparkle at 1.2s
    const sparkleOsc = ctx.createOscillator();
    const sparkleGain = ctx.createGain();
    sparkleOsc.type = "sine";
    sparkleOsc.frequency.setValueAtTime(1046.5, t + 1.2);
    sparkleOsc.frequency.exponentialRampToValueAtTime(2093, t + 1.5);
    sparkleGain.gain.setValueAtTime(0, t + 1.2);
    sparkleGain.gain.linearRampToValueAtTime(0.08, t + 1.25);
    sparkleGain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    sparkleOsc.connect(sparkleGain).connect(ctx.destination);
    sparkleOsc.start(t + 1.2);
    sparkleOsc.stop(t + 1.8);

    // 5. Final resolution at 2s
    const finalOsc = ctx.createOscillator();
    const finalGain = ctx.createGain();
    finalOsc.type = "triangle";
    finalOsc.frequency.value = 392;
    finalGain.gain.setValueAtTime(0, t + 2.0);
    finalGain.gain.linearRampToValueAtTime(0.1, t + 2.05);
    finalGain.gain.exponentialRampToValueAtTime(0.001, t + 2.8);
    finalOsc.connect(finalGain).connect(ctx.destination);
    finalOsc.start(t + 2.0);
    finalOsc.stop(t + 2.8);

    // Cleanup
    setTimeout(() => {
      ctx.close();
      audioCtx = null;
    }, 3500);
  } catch (e) {
    console.warn("Splash sound failed:", e);
    hasPlayed = false; // Allow retry on error
  }
}

export function resetSplashSound() {
  hasPlayed = false;
  if (audioCtx) {
    try { audioCtx.close(); } catch {}
    audioCtx = null;
  }
}
