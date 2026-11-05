import confetti from 'canvas-confetti';

const COLOURS = ['#FE670A', '#0B1F3A', '#22C55E', '#FACC15', '#FFFFFF'];

/**
 * Confetti that bursts from the centre of the screen and clears quickly.
 * intensity 0.1 = small pop, 1 = full celebration.
 */
export function fireDealerConfetti(intensity = 1) {
  if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const base = {
    colors: COLOURS,
    scalar: 1.6,
    gravity: 1.6, // falls fast instead of floating around
    drift: 0, // no sideways bias, so the burst stays centred
    ticks: 80, // pieces disappear quickly
    shapes: ['square', 'circle'] as confetti.Shape[],
    zIndex: 9999,
  };

  const count = Math.max(60, Math.round(320 * intensity));

  // main burst, dead centre of the viewport
  confetti({ ...base, particleCount: count, spread: 100, startVelocity: 60, origin: { x: 0.5, y: 0.45 } });

  // mirrored side cannons keep the spread balanced left and right
  const end = Date.now() + 200 + 300 * intensity;
  const perSide = Math.max(2, Math.round(4 * intensity));
  const frame = () => {
    confetti({ ...base, particleCount: perSide, angle: 65, spread: 55, startVelocity: 50, origin: { x: 0.03, y: 0.5 } });
    confetti({ ...base, particleCount: perSide, angle: 115, spread: 55, startVelocity: 50, origin: { x: 0.97, y: 0.5 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}
