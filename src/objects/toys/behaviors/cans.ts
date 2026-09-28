import { knockdown } from '../knockdown';
import type { BehaviorFactory } from './types';

// Pyramide aus 6 Dosen (3-2-1) auf der Kiste (Kiste ist 60 px hoch, Dose 56 px).
const SLOTS = [
  { dx: -44, dy: -60 },
  { dx: 0, dy: -60 },
  { dx: 44, dy: -60 },
  { dx: -22, dy: -116 },
  { dx: 22, dy: -116 },
  { dx: 0, dy: -172 },
];

/** Dosenpyramide: Ein Ball trifft → Dosen purzeln. Antippen → Pyramide baut sich wieder auf. */
export const cans: BehaviorFactory = (toy) =>
  knockdown(toy, {
    texture: 'can',
    slots: SLOTS,
    hop: 120,
    spread: 220,
    hits: (t, ball) => {
      // Großzügig: Ballmitte in der Pyramide plus Ballradius plus Rand
      const r = ball.displayWidth / 2 + 30;
      const cx = ball.x;
      const cy = ball.y - ball.displayHeight / 2;
      // Auch die Tiefe muss ungefähr passen, sonst rollt der Ball hinter den Dosen vorbei.
      const groundY = ball.physics.active ? ball.physics.groundY : ball.y;
      const sameDepth = Math.abs(groundY - t.y) < 120;
      return sameDepth && Math.abs(cx - t.x) < 70 + r && cy > t.y - 230 - r && cy < t.y - 40 + r;
    },
  });
