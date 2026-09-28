import { ToySeats } from '../seats';
import type { BehaviorFactory } from './types';

const PIVOT_HEIGHT = 70;
const HALF_BEAM = 150;
const MAX_TILT = 0.22; // Bogenmaß
const PERIOD = 1800; // ms für einmal hin und her

/** Wippe: Ein Kind → diese Seite geht runter. Zwei Kinder → es wippt hin und her. */
export const seesaw: BehaviorFactory = (toy) => {
  const seats = new ToySeats(toy, 2, 'seesawing');
  const beam = toy.scene.add.image(toy.x, toy.y - PIVOT_HEIGHT, 'seesaw-beam');
  let tilt = 0;

  return {
    onKidDropped: (kid) => seats.mount(kid, kid.x < toy.x ? 0 : 1) >= 0,
    update: (delta) => {
      seats.cleanup();
      const [left, right] = seats.riders;
      const now = toy.scene.time.now;
      let target = 0;
      if (left && right) target = Math.sin((now / PERIOD) * Math.PI * 2) * MAX_TILT;
      else if (left) target = -MAX_TILT;
      else if (right) target = MAX_TILT;
      tilt += (target - tilt) * (1 - Math.exp(-6 * (delta / 1000)));

      const px = toy.x;
      const py = toy.y - PIVOT_HEIGHT;
      beam.setPosition(px, py).setRotation(tilt).setDepth(toy.depth + 0.2);
      seats.riders.forEach((kid, i) => {
        if (!kid) return;
        const s = i === 0 ? -HALF_BEAM : HALF_BEAM;
        // Oben (−1 unten … 1 oben): Arme hoch. Die Hüfte sitzt auf dem Balken.
        kid.setActivity('seesaw', { up: (i === 0 ? tilt : -tilt) / MAX_TILT });
        kid
          .setPosition(px + s * Math.cos(tilt), py + s * Math.sin(tilt) - 10 + kid.hipHeight())
          .setFlipX(i === 1) // beide schauen zur Mitte
          .setDepth(toy.depth + 0.5);
      });
    },
    onRemove: () => seats.dismountAll(),
    onDestroy: () => beam.destroy(),
  };
};
