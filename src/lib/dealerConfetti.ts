import confetti from 'canvas-confetti';

const COLOURS = ['#FE670A', '#0B1F3A', '#22C55E', '#FACC15', '#FFFFFF'];

/** Thick, slow-falling confetti. intensity 0.1 = light burst, 1 = full celebration. */
export function fireDealerConfetti(intensity = 1) {
  if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const base = { colors: COLOURS, scalar: 1.8, gravity: 0.55, drift: 0.2, ticks: 320, shapes: ['square', 'circle'] as confetti.Shape[], zIndex: 9999 };
  const total = Math.max(12, Math.round(220 * intensity));
  confetti({ ...base, particleCount: Math.round(total * 0.5), spread: 80, startVelocity: 35, origin: { x: 0.5, y: 0.25 } });
  if (intensity >= 0.5) {
    const end = Date.now() + 1500;
    const frame = () => {
      confetti({ ...base, particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: 0.4 } });
      confetti({ ...base, particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.4 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }
}
