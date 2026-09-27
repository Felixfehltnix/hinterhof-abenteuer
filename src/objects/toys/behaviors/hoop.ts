import { stars } from '../../effects';
import type { Toy } from '../Toy';
import { ballsNear } from './targets';
import type { BehaviorFactory } from './types';

// Lage des Rings relativ zum Fußpunkt (passend zur Platzhalter-Grafik 170×330).
const RING_Y = -222;
// Großzügig: So weit darf ein Ball waagerecht neben der Ringmitte sein (Ring ist 96 px breit).
const RING_TOLERANCE = 80;
// Zielhilfe: Bälle, die in diesem Bereich über dem Ring herunterfallen, werden so gelenkt,
// dass sie in der Ringmitte ankommen (kleine Kinder zielen schlecht).
const ASSIST_WIDTH = 450;
const ASSIST_HEIGHT = 450;
const ASSIST_RATE = 10;

/** Basketballkorb: Ein Ball fällt durch den Ring → Netz wackelt, Sterne sprühen, Ball fällt unten heraus. */
export const hoop: BehaviorFactory = (toy) => {
  const net = toy.scene.add.image(toy.x, toy.y + RING_Y, 'hoop-net').setOrigin(0.5, 0);
  const lastY = new WeakMap<Toy, number>();
  const cooldown = new WeakMap<Toy, number>();

  const score = (ball: Toy) => {
    const scene = toy.scene;
    // Mittig durchfallen lassen
    ball.x = toy.x;
    ball.physics.vx *= 0.15;
    stars(scene, toy.x, toy.y + RING_Y);
    scene.tweens.killTweensOf(net);
    net.setScale(1);
    scene.tweens.add({ targets: net, scaleY: 1.35, scaleX: 0.85, duration: 120, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' });
  };

  return {
    update: (delta) => {
      const ringY = toy.y + RING_Y;
      net.setPosition(toy.x, ringY + 2).setDepth(toy.depth + 2);
      if (toy.isDragging) return;
      const now = toy.scene.time.now;
      for (const ball of ballsNear(toy)) {
        const cy = ball.y - ball.displayHeight / 2;
        const prev = lastY.get(ball);
        lastY.set(ball, cy);
        if (prev === undefined || !ball.physics.active) continue;
        const ph = ball.physics;
        const dx = toy.x - ball.x;
        if (cy < ringY && cy > ringY - ASSIST_HEIGHT && Math.abs(dx) < ASSIST_WIDTH) {
          // Zeit bis der Ball (steigend oder fallend) wieder auf Ringhöhe ist
          const drop = ringY - cy;
          const v = -ph.vz;
          const g = ball.params.gravity;
          const t = (-v + Math.sqrt(v * v + 2 * g * drop)) / g;
          const wanted = dx / Math.max(t, 0.05);
          const k = 1 - Math.exp(-ASSIST_RATE * (delta / 1000));
          ph.vx += (wanted - ph.vx) * k;
        }
        if (ph.vz > 0) continue; // Treffer zählen nur beim Herunterfallen
        // Fällt ein Ball über dem Ring herunter, landet er in der Tiefe des Korbs
        // (sonst käme ein weiter hinten fallender Ball nie unter die Ringhöhe).
        if (cy < ringY && Math.abs(ball.x - toy.x) < RING_TOLERANCE && ph.groundY < toy.y) {
          ph.z += toy.y + 4 - ph.groundY;
          ph.groundY = toy.y + 4;
          ball.setDepth(ph.groundY);
        }
        const crossed = prev < ringY && cy >= ringY;
        if (!crossed || Math.abs(ball.x - toy.x) > RING_TOLERANCE) continue;
        if ((cooldown.get(ball) ?? 0) > now) continue;
        cooldown.set(ball, now + 800);
        score(ball);
      }
    },
    onDestroy: () => net.destroy(),
  };
};
