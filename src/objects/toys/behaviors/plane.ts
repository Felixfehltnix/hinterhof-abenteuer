import Phaser from 'phaser';
import type { BehaviorFactory } from './types';

/** Papierflieger: schaut in Flugrichtung, neigt die Nase mit dem Flug und macht ab und zu einen Looping. */
export const plane: BehaviorFactory = (toy) => {
  let loopUntil = 0;
  let nextLoopCheck = 0;

  return {
    update: () => {
      const ph = toy.physics;
      const now = toy.scene.time.now;
      if (!(ph.active && ph.z > 0)) {
        if (now >= loopUntil && toy.angle !== 0 && !toy.isDragging) toy.setAngle(0);
        return;
      }
      if (ph.vx !== 0) toy.setFlipX(ph.vx < 0);
      if (now < loopUntil) return; // Looping läuft

      const dir = ph.vx < 0 ? -1 : 1;
      if (now > nextLoopCheck) {
        nextLoopCheck = now + 900;
        if (Math.abs(ph.vx) > 350 && ph.z > 120 && Math.random() < 0.35) {
          ph.vz = Math.max(ph.vz, 0) + 350;
          loopUntil = now + 700;
          toy.scene.tweens.add({ targets: toy, angle: toy.angle - 360 * dir, duration: 700, ease: 'Sine.easeInOut' });
          return;
        }
      }
      const pitch = Phaser.Math.RadToDeg(Math.atan2(ph.vz, Math.abs(ph.vx)));
      toy.setAngle(Phaser.Math.Clamp(-pitch, -35, 35) * dir);
    },
  };
};
