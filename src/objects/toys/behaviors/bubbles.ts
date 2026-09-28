import Phaser from 'phaser';
import { Bubble } from '../../Bubble';
import type { BehaviorFactory } from './types';

/** Seifenblasenstab: Antippen lässt 5–8 schillernde Blasen aufsteigen. Hält ihn ein Kind: Kind antippen = pusten. */
export const bubbles: BehaviorFactory = (toy) => {
  const blow = () => {
    const n = Phaser.Math.Between(5, 8);
    const x = toy.x;
    const y = toy.y - toy.displayHeight + 20;
    for (let i = 0; i < n; i++) {
      toy.scene.time.delayedCall(i * 90, () => Bubble.spawn(toy.scene, x + Phaser.Math.Between(-20, 20), y));
    }
  };
  return {
    onTap: () => {
      blow();
      if (toy.heldBy) return; // in der Hand wackelt nicht der Stab, sondern das Kind pustet
      toy.scene.tweens.add({ targets: toy, angle: { from: -10, to: 10 }, duration: 90, yoyo: true, repeat: 2, onComplete: () => toy.setAngle(0) });
    },
    onUse: (kid) => {
      kid.act('blow');
      toy.scene.time.delayedCall(180, blow);
      return true;
    },
  };
};
