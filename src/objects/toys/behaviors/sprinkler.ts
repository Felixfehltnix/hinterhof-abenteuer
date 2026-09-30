import Phaser from 'phaser';
import type { PlaygroundScene } from '../../../scenes/PlaygroundScene';
import type { BehaviorFactory } from './types';

const SWEEP = 55; // Grad nach links und rechts
const NEAR_X = 300;
const NEAR_Y = 160;
const HOP_EVERY = 1100; // ms

/** Rasensprenger: Antippen = an/aus. Wasserfontäne im Bogen, Kinder in der Nähe hüpfen fröhlich. */
export const sprinkler: BehaviorFactory = (toy) => {
  const scene = toy.scene as PlaygroundScene;
  let on = false;
  let aim = -90;
  let nextHop = 0;
  const emitter = scene.add.particles(toy.x, toy.y, 'drop', {
    speed: { min: 380, max: 470 },
    angle: { onEmit: () => aim + Phaser.Math.Between(-6, 6) },
    gravityY: 900,
    lifespan: 1100,
    frequency: 25,
    quantity: 2,
    scale: { start: 1, end: 0.6 },
    alpha: { start: 0.95, end: 0.2 },
    emitting: false,
  });

  return {
    onTap: () => {
      on = !on;
      if (on) emitter.start();
      else emitter.stop();
      scene.events.emit('sound', { kind: on ? 'sprinkler-on' : 'sprinkler-off', x: toy.x });
      if (!scene.tweens.isTweening(toy)) scene.tweens.add({ targets: toy, scaleY: 1.12, duration: 100, yoyo: true });
    },
    update: () => {
      const now = scene.time.now;
      aim = -90 + Math.sin(now / 900) * SWEEP;
      emitter.setPosition(toy.x, toy.y - toy.displayHeight + 10).setDepth(toy.depth + 1);
      if (!on || now < nextHop) return;
      nextHop = now + HOP_EVERY;
      scene
        .kidsOnMeadow()
        .filter((k) => Math.abs(k.x - toy.x) < NEAR_X && Math.abs(k.y - toy.y) < NEAR_Y)
        .forEach((k, i) => scene.time.delayedCall(i * 120, () => k.hop()));
      // Der Hund springt nach dem Wasser
      if (Math.abs(scene.dog.x - toy.x) < NEAR_X && Math.abs(scene.dog.y - toy.y) < NEAR_Y) scene.dog.soak(true);
    },
    onRemove: () => emitter.stop(),
    onDestroy: () => emitter.destroy(),
  };
};
