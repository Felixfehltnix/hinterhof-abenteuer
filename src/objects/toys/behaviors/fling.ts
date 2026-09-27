import type { BehaviorFactory } from './types';

// Langsamer als das (px/s) = ablegen statt werfen.
const MIN_FLING_SPEED = 600;
// Schneller wird kein Wurf, egal wie heftig gewischt wird.
const MAX_FLING_SPEED = 3500;

/** Schnell ziehen und loslassen wirft das Spielzeug mit der Fingergeschwindigkeit weiter. */
export const fling: BehaviorFactory = (toy) => ({
  onDragEnd: (release) => {
    const { x, y } = release.pointerVelocity;
    const speed = Math.hypot(x, y);
    if (speed < MIN_FLING_SPEED) return;
    const factor = Math.min(1, MAX_FLING_SPEED / speed) * toy.params.throwFactor;
    release.vx = x * factor;
    release.vy = y * factor;
  },
});
