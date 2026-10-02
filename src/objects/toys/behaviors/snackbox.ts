import type { PlaygroundScene } from '../../../scenes/PlaygroundScene';
import type { BehaviorFactory } from './types';

/** Snackbox: Hält ein Kind sie und wird angetippt, öffnet sich das Zahlenspiel. Am Boden wackelt sie nur. */
export const snackbox: BehaviorFactory = (toy) => ({
  onUse: (kid) => {
    if (toy.physics.active) return false;
    (toy.scene as PlaygroundScene).openSnack(kid);
    return true;
  },
  onTap: () => {
    if (toy.heldBy) return;
    toy.scene.tweens.add({ targets: toy, angle: { from: -8, to: 8 }, duration: 90, yoyo: true, repeat: 2, onComplete: () => toy.setAngle(0) });
  },
});
