import { ToySeats } from '../seats';
import type { BehaviorFactory } from './types';

const MAT_HEIGHT = 44; // Fußpunkt des Kindes über dem Boden (Matte)
const HOP_HEIGHT = 150;
const HOP_TIME = 750;
const SALTO_HEIGHT = 380;
const SALTO_TIME = 1150;

/** Trampolin: Ein Kind darauf hüpft von selbst. Antippen: extra hoher Sprung mit Salto. */
export const trampoline: BehaviorFactory = (toy) => {
  const seats = new ToySeats(toy, 1, 'bouncing');
  let start = 0;
  let salto = 0; // Startzeit des Saltos, 0 = keiner

  return {
    onKidDropped: (kid) => {
      if (seats.mount(kid) < 0) return false;
      start = toy.scene.time.now;
      return true;
    },
    onTap: () => {
      if (seats.riders[0] && salto === 0) salto = toy.scene.time.now;
    },
    update: () => {
      seats.cleanup();
      const kid = seats.riders[0];
      if (!kid) return;
      const now = toy.scene.time.now;
      const baseY = toy.y - MAT_HEIGHT;
      let h: number;
      let angle = 0;
      if (salto) {
        const p = Math.min(1, (now - salto) / SALTO_TIME);
        h = 4 * p * (1 - p) * SALTO_HEIGHT;
        angle = p * 360;
        if (p >= 1) {
          salto = 0;
          start = now;
        }
      } else {
        const p = ((now - start) % HOP_TIME) / HOP_TIME;
        h = 4 * p * (1 - p) * HOP_HEIGHT;
      }
      kid.setActivity('bounce', { height: h / HOP_HEIGHT, salto: salto !== 0 });
      // Um die Körpermitte drehen, nicht um die Füße
      const half = kid.displayHeight / 2;
      const rad = (angle * Math.PI) / 180;
      const cx = toy.x;
      const cy = baseY - h - half;
      kid.setAngle(angle).setPosition(cx - half * Math.sin(rad), cy + half * Math.cos(rad)).setDepth(toy.depth + 1);
      // Matte gibt nach, wenn das Kind landet
      if (!toy.isDragging) toy.scaleY = h < 20 ? 0.9 + h / 200 : 1;
    },
    onRemove: () => seats.dismountAll(),
  };
};
