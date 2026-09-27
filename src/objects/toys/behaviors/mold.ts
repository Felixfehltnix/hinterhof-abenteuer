import Phaser from 'phaser';
import type { PlaygroundScene } from '../../../scenes/PlaygroundScene';
import type { BehaviorFactory } from './types';

/** Sandförmchen: Im Sandkasten antippen → ein Sandkuchen erscheint daneben. Sonst wackelt es. */
export const mold: BehaviorFactory = (toy) => ({
  onTap: () => {
    const scene = toy.scene as PlaygroundScene;
    if (scene.tweens.isTweening(toy)) return;
    if (!scene.isInSandbox(toy.x, toy.y)) {
      scene.tweens.add({ targets: toy, angle: { from: -12, to: 12 }, duration: 90, yoyo: true, repeat: 2, onComplete: () => toy.setAngle(0) });
      return;
    }
    // Förmchen umdrehen, klopfen, und daneben steht ein Kuchen
    const side = scene.isInSandbox(toy.x + 75, toy.y) ? 1 : -1;
    scene.tweens.chain({
      targets: toy,
      tweens: [
        { angle: side * 180, y: toy.y - 40, duration: 200, ease: 'Quad.easeOut' },
        { angle: side * 360, y: toy.y, duration: 200, ease: 'Quad.easeIn' },
      ],
      onComplete: () => {
        toy.setAngle(0);
        scene.garden.addCake(toy.x + side * 75, Phaser.Math.Clamp(toy.y, toy.y - 20, toy.y + 20));
      },
    });
  },
});
