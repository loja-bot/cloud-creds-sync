// Generates a cinematic splash sound effect using Web Audio API
// Synchronized with the splash screen animation timeline

export function playSplashSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    // 1. Deep bass impact at 0ms (logo appears)
    const bassOsc = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bassOsc.type = "sine";
    bassOsc.frequency.setValueAtTime(80, ctx.currentTime);
    bassOsc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.8);
    bassGain.gain.setValueAtTime(0.6, ctx.currentTime);
    bassGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    bassOsc.connect(bassGain).connect(ctx.destination);
    bassOsc.start(ctx.currentTime);
    bassOsc.stop(ctx.currentTime + 0.8);

    // 2. Shimmer/whoosh at 300ms (rings expanding)
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
    noiseFilter.frequency.setValueAtTime(2000, ctx.currentTime + 0.3);
    noiseFilter.frequency.exponentialRampToValueAtTime(6000, ctx.currentTime + 0.6);
    noiseFilter.Q.value = 0.5;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, ctx.currentTime + 0.3);
    noiseGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.45);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    noiseSource.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);
    noiseSource.start(ctx.currentTime + 0.3);
    noiseSource.stop(ctx.currentTime + 0.8);

    // 3. Melodic chime at 800ms (text appears - "THAYSON TV")
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 major chord
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + 0.8 + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.85 + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0 + i * 0.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + 0.8 + i * 0.08);
      osc.stop(ctx.currentTime + 2.2);
    });

    // 4. Secondary sparkle at 1.2s (subtitle appears)
    const sparkleOsc = ctx.createOscillator();
    const sparkleGain = ctx.createGain();
    sparkleOsc.type = "sine";
    sparkleOsc.frequency.setValueAtTime(1046.5, ctx.currentTime + 1.2); // C6
    sparkleOsc.frequency.exponentialRampToValueAtTime(2093, ctx.currentTime + 1.5);
    sparkleGain.gain.setValueAtTime(0, ctx.currentTime + 1.2);
    sparkleGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 1.25);
    sparkleGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
    sparkleOsc.connect(sparkleGain).connect(ctx.destination);
    sparkleOsc.start(ctx.currentTime + 1.2);
    sparkleOsc.stop(ctx.currentTime + 1.8);

    // 5. Final subtle resolution tone at 2s (loading bar completes)
    const finalOsc = ctx.createOscillator();
    const finalGain = ctx.createGain();
    finalOsc.type = "triangle";
    finalOsc.frequency.value = 392; // G4
    finalGain.gain.setValueAtTime(0, ctx.currentTime + 2.0);
    finalGain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 2.05);
    finalGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.8);
    finalOsc.connect(finalGain).connect(ctx.destination);
    finalOsc.start(ctx.currentTime + 2.0);
    finalOsc.stop(ctx.currentTime + 2.8);

    // Cleanup
    setTimeout(() => ctx.close(), 3500);
  } catch (e) {
    console.warn("Splash sound failed:", e);
  }
}
