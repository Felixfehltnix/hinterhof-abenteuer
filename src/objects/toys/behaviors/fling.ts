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
    if (release.onGround) {
      // Auf der Wiese: Wischen nach oben/unten geht teils in die Tiefe (nach hinten/vorne),
      // der Rest in die Höhe (je Spielzeug: Frisbee flach, Basketball hoch).
      const share = toy.params.depthShare;
      release.vdepth = y * factor * share;
      release.vy = y * factor * (1 - share);
    } else {
      release.vy = y * factor;
    }
  },
});
