import type { PlaygroundScene } from '../../../scenes/PlaygroundScene';
import { stars } from '../../effects';
import type { Toy } from '../Toy';
import { ballsNear, speedOf } from './targets';
import type { BehaviorFactory } from './types';

// Großzügige Torzone relativ zum Fußpunkt des Tors (Tor ist 300 px breit, 170 hoch).
const HALF_WIDTH = 150;
const DEPTH_BEHIND = 90;
const DEPTH_FRONT = 45;
const MAX_HEIGHT = 170;
const MIN_SPEED = 90;

/** Fußballtor: Ein Ball rollt oder fliegt hinein → Netz beult sich, alle Kinder jubeln. */
export const goal: BehaviorFactory = (toy) => {
  const inside = new WeakSet<Toy>();
  let cooldownUntil = 0;

  const score = (ball: Toy) => {
    const scene = toy.scene as PlaygroundScene;
    // Das Netz fängt den Ball
    ball.physics.vx *= 0.1;
    ball.physics.vz = Math.min(ball.physics.vz, 0);
    stars(scene, ball.x, toy.y - 100, 8);
    scene.tweens.add({ targets: toy, scaleX: 1.06, scaleY: 0.95, duration: 110, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
    scene.kidsOnMeadow().forEach((kid, i) => scene.time.delayedCall(i * 70, () => kid.cheer()));
  };

  return {
    update: () => {
      if (toy.isDragging) return;
      const now = toy.scene.time.now;
      for (const ball of ballsNear(toy)) {
        const ph = ball.physics;
        const groundY = ph.active ? ph.groundY : ball.y;
        const inZone =
          Math.abs(ball.x - toy.x) < HALF_WIDTH &&
          groundY > toy.y - DEPTH_BEHIND &&
          groundY < toy.y + DEPTH_FRONT &&
          ph.z < MAX_HEIGHT;
        if (!inZone) {
          inside.delete(ball);
          continue;
        }
        if (inside.has(ball)) continue;
        inside.add(ball);
        // Nur wer hineinrollt zählt, nicht wer schon drin lag.
        if (speedOf(ball) < MIN_SPEED || now < cooldownUntil) continue;
        cooldownUntil = now + 1500;
        score(ball);
      }
    },
  };
};
