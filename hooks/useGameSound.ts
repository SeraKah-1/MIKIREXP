
import { useCallback, useRef, useEffect } from 'react';

// Singleton AudioContext to prevent "Max AudioContexts reached" crash
let globalAudioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!globalAudioContext) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      globalAudioContext = new AudioContextClass();
    }
  }
  return globalAudioContext;
};

export const useGameSound = () => {
  // Resume context if suspended (common in browsers requiring user interaction)
  useEffect(() => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      const resume = () => {
        ctx.resume();
        window.removeEventListener('click', resume);
        window.removeEventListener('touchstart', resume);
        window.removeEventListener('keydown', resume);
      };
      window.addEventListener('click', resume);
      window.addEventListener('touchstart', resume);
      window.addEventListener('keydown', resume);
    }
  }, []);

  const playTone = useCallback((
    frequency: number, 
    type: OscillatorType, 
    duration: number, 
    volume: number = 0.1,
    slideFreq: number | null = null
  ) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      
      if (slideFreq) {
        osc.frequency.exponentialRampToValueAtTime(slideFreq, ctx.currentTime + duration);
      }

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
      
      // Garbage collection for nodes is automatic, but keeping context alive is key.
    } catch (e) {
      console.warn("Audio play failed", e);
    }
  }, []);

  // --- HAPTIC FEEDBACK (VIBRATION) ---
  const triggerHaptic = useCallback((pattern: number | number[] = 10) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  const playClick = useCallback(() => {
    playTone(800, 'sine', 0.1, 0.05);
    triggerHaptic(5); // Light tap
  }, [playTone, triggerHaptic]);

  const playHover = useCallback(() => playTone(200, 'triangle', 0.05, 0.02), [playTone]);

  const playCorrect = useCallback(() => {
    setTimeout(() => playTone(600, 'sine', 0.1, 0.1), 0);
    setTimeout(() => playTone(800, 'sine', 0.1, 0.1), 100);
    setTimeout(() => playTone(1200, 'sine', 0.3, 0.1), 200);
    triggerHaptic([10, 30, 10]); // Double tap for success
  }, [playTone, triggerHaptic]);

  const playIncorrect = useCallback(() => {
    playTone(150, 'sawtooth', 0.3, 0.1, 50);
    triggerHaptic(50); // Heavy buzz for error
  }, [playTone, triggerHaptic]);

  const playFanfare = useCallback(() => {
    const delay = 100;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      setTimeout(() => playTone(freq, 'square', 0.2, 0.05), i * delay);
    });
    setTimeout(() => playTone(1046.50, 'square', 0.6, 0.05), 4 * delay);
    triggerHaptic([50, 50, 50, 50, 200]);
  }, [playTone, triggerHaptic]);

  const playSwipe = useCallback(() => {
    playTone(400, 'sine', 0.1, 0.05, 200); // Swoosh sound
    triggerHaptic(15);
  }, [playTone, triggerHaptic]);

  return { playClick, playHover, playCorrect, playIncorrect, playFanfare, playSwipe, triggerHaptic };
};
