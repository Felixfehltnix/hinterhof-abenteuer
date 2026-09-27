import type { BehaviorFactory } from './types';

/** Gleitet im Flug (Auftrieb über params.lift), neigt sich und flirrt, als würde es sich drehen. */
export const glide: BehaviorFactory = (toy) => {
  let flying = false;
  return {
    update: () => {
      const airborne = toy.physics.active && toy.physics.z > 0;
      if (airborne) {
        flying = true;
        toy.setAngle(Math.max(-18, Math.min(18, -toy.physics.vz * 0.02)));
        // Schnelles Flirren = Drehen von der Seite gesehen
        toy.scaleX = 0.9 + 0.1 * Math.sin(toy.scene.time.now * 0.06);
      } else if (flying) {
        flying = false;
        toy.setAngle(0);
        toy.scaleX = 1;
      }
    },
  };
};
