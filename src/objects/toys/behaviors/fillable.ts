import { sandSpray } from '../../Garden';
import type { BehaviorFactory } from './types';

/** Eimer: füllt sich mit Sand (von der Schaufel). Voll antippen → wird ausgeschüttet. */
export const fillable: BehaviorFactory = (toy) => {
  let fill = 0;
  const sand = toy.scene.add.image(toy.x, toy.y, 'bucket-sand').setOrigin(0.5, 1).setVisible(false);

  return {
    onReceive: (kind, amount) => {
      if (kind !== 'sand') return;
      const before = fill;
      fill = Math.min(1, fill + amount);
      if (before < 1 && fill >= 1 && !toy.scene.tweens.isTweening(toy)) {
        toy.scene.tweens.add({ targets: toy, scaleY: 0.9, duration: 100, yoyo: true });
      }
    },
    onTap: () => {
      if (fill < 0.3) return;
      fill = 0;
      sandSpray(toy.scene, toy.x + 40, toy.y - 20, 16);
    },
    update: () => {
      sand.setVisible(fill > 0.02);
      // Sandhügel sitzt im Eimerrand und wächst mit dem Füllstand
      sand
        .setPosition(toy.x, toy.y - toy.displayHeight + 34)
        .setScale(toy.scaleX, Math.max(0.1, fill) * toy.scaleY)
        .setAngle(toy.angle)
        .setDepth(toy.depth + 0.1);
    },
    onDestroy: () => sand.destroy(),
  };
};
