import type { BehaviorFactory } from './types';

/** Antippen lässt das Spielzeug wackeln. */
export const wobble: BehaviorFactory = (toy) => ({
  onTap: () => {
    const tweens = toy.scene.tweens;
    if (toy.physics.active || tweens.isTweening(toy)) return;
    tweens.add({
      targets: toy,
      angle: { from: -12, to: 12 },
      duration: 90,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        toy.setAngle(0);
      },
    });
  },
});
