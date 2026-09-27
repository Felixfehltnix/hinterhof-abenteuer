import { knockdown } from '../knockdown';
import type { BehaviorFactory } from './types';

// 6 Kegel auf der Matte: hinten 3, Mitte 2, vorne 1.
const SLOTS = [
  { dx: -64, dy: -24 },
  { dx: 0, dy: -24 },
  { dx: 64, dy: -24 },
  { dx: -32, dy: -14 },
  { dx: 32, dy: -14 },
  { dx: 0, dy: -4 },
];

/** Kegel: Ein Ball rollt hinein → sie fallen um. Antippen → wieder aufstellen. */
export const pins: BehaviorFactory = (toy) =>
  knockdown(toy, {
    texture: 'pin',
    slots: SLOTS,
    hop: 30,
    spread: 120,
    hits: (t, ball) => {
      const ph = ball.physics;
      const groundY = ph.active ? ph.groundY : ball.y;
      const r = ball.displayWidth / 2 + 30;
      return ph.z < 100 && Math.abs(groundY - t.y) < 80 && Math.abs(ball.x - t.x) < 110 + r;
    },
  });
