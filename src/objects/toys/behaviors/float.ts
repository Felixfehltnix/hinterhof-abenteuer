import Phaser from 'phaser';
import { WORLD_WIDTH } from '../../../config';
import { environment } from '../../../world/environment';
import type { BehaviorFactory } from './types';

// Steiggeschwindigkeit (px/s) und wie schnell es zu hoch Losgelassenes wieder absinkt.
const RISE_SPEED = 90;
const SINK_SPEED = 40;

/** Schwebt: steigt langsam bis zu einer Höhe am Himmel und wippt dort sanft auf und ab. */
export const float: BehaviorFactory = (toy) => {
  const top = Phaser.Math.Between(170, 300); // Unterkante in dieser Höhe
  const phase = Math.random() * 10;
  let vx = 0;

  return {
    onDragEnd: (release) => {
      release.handled = true;
      vx = Phaser.Math.Clamp(release.pointerVelocity.x * 0.25, -300, 300);
    },
    update: (delta) => {
      if (toy.isDragging || toy.heldBy) return;
      const dt = delta / 1000;
      const t = toy.scene.time.now / 1000;
      const target = Math.max(top, toy.displayHeight + 10) + Math.sin(t * 1.5 + phase) * 8;
      toy.y += Phaser.Math.Clamp(target - toy.y, -RISE_SPEED * dt, SINK_SPEED * dt);

      vx += environment.wind * toy.params.windFactor * dt;
      vx *= Math.exp(-0.8 * dt);
      let x = toy.x + vx * dt + Math.sin(t * 0.7 + phase) * 8 * dt;
      const half = toy.displayWidth / 2;
      if (x < half) {
        x = half;
        vx = Math.abs(vx) * 0.5;
      } else if (x > WORLD_WIDTH - half) {
        x = WORLD_WIDTH - half;
        vx = -Math.abs(vx) * 0.5;
      }
      toy.x = x;
      toy.setAngle(Math.sin(t * 1.2 + phase) * 4);
      toy.setDepth(toy.y);
    },
  };
};
