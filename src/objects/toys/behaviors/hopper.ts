import Phaser from 'phaser';
import { WORLD_WIDTH } from '../../../config';
import { ToySeats } from '../seats';
import type { BehaviorFactory } from './types';

const SPEED = 110; // px/s
const HOP_HEIGHT = 35;
const HOP_TIME = 450;
const EDGE = 120; // so weit vom Weltrand dreht es um

/** Hüpfball: Ein Kind darauf hüpft in kleinen Sprüngen über die Wiese hin und her. */
export const hopper: BehaviorFactory = (toy) => {
  const seats = new ToySeats(toy, 1, 'bouncing');
  let dir = 1;
  let baseY: number | undefined;
  let nextTurn = 0;

  return {
    onKidDropped: (kid) => {
      if (seats.mount(kid) < 0) return false;
      baseY = undefined;
      return true;
    },
    onDragStart: () => {
      baseY = undefined;
    },
    update: (delta) => {
      seats.cleanup();
      const kid = seats.riders[0];
      if (!kid || toy.isDragging) {
        if (!kid && baseY !== undefined && !toy.isDragging) {
          toy.y = baseY; // wieder auf dem Boden absetzen
          baseY = undefined;
        }
        if (kid) kid.setPosition(toy.x, toy.y - toy.displayHeight + 28).setDepth(toy.depth + 1);
        return;
      }
      if (toy.physics.active) return; // erst landen lassen
      baseY ??= toy.y;
      const now = toy.scene.time.now;
      if (now > nextTurn) {
        nextTurn = now + Phaser.Math.Between(2000, 4500);
        if (Math.random() < 0.4) dir = -dir;
      }
      let x = toy.x + dir * SPEED * (delta / 1000);
      if (x < EDGE || x > WORLD_WIDTH - EDGE) {
        dir = x < EDGE ? 1 : -1;
        x = Phaser.Math.Clamp(x, EDGE, WORLD_WIDTH - EDGE);
      }
      const p = (now % HOP_TIME) / HOP_TIME;
      const h = 4 * p * (1 - p) * HOP_HEIGHT;
      toy.setPosition(x, baseY - h).setFlipX(dir < 0).setDepth(baseY);
      kid.setPosition(toy.x, toy.y - toy.displayHeight + 28).setFlipX(dir < 0).setDepth(baseY + 1);
    },
    onRemove: () => {
      if (baseY !== undefined) toy.y = baseY;
      seats.dismountAll();
    },
  };
};
