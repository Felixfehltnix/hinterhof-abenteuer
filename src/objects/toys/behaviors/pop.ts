import Phaser from 'phaser';
import type { PlaygroundScene } from '../../../scenes/PlaygroundScene';
import type { BehaviorFactory } from './types';

const CONFETTI_COLORS = [0xef476f, 0xffd166, 0x06d6a0, 0x118ab2, 0x9b5de5, 0xffffff];

/** Antippen: platzt mit Konfetti und verschwindet. */
export const pop: BehaviorFactory = (toy) => ({
  onTap: () => {
    const scene = toy.scene as PlaygroundScene;
    confetti(scene, toy.x, toy.y - toy.displayHeight * 0.6);
    scene.events.emit('sound', { kind: 'pop', x: toy.x });
    scene.removeToy(toy);
  },
});

export function confetti(scene: Phaser.Scene, x: number, y: number): void {
  for (let i = 0; i < 18; i++) {
    const piece = scene.add
      .rectangle(x, y, 12, 8, CONFETTI_COLORS[i % CONFETTI_COLORS.length])
      .setDepth(y + 500)
      .setAngle(Phaser.Math.Between(0, 180));
    const a = Math.random() * Math.PI * 2;
    const r = Phaser.Math.Between(60, 150);
    scene.tweens.add({
      targets: piece,
      x: x + Math.cos(a) * r,
      y: y + Math.sin(a) * r * 0.6 + 120,
      angle: piece.angle + Phaser.Math.Between(180, 540),
      alpha: 0,
      duration: Phaser.Math.Between(700, 1100),
      ease: 'Quad.easeOut',
      onComplete: () => piece.destroy(),
    });
  }
}
