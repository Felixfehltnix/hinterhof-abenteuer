import type { PlaygroundScene } from '../../../scenes/PlaygroundScene';
import type { BehaviorFactory } from './types';

const TILT = 35; // Grad beim Gießen
const DROP_EVERY = 70; // ms
const FLOWER_EVERY = 280; // ms
const FALL = 140; // px: so tief fallen die Tropfen unter die Tülle
// Tülle relativ zum Fußpunkt (Platzhalter 120×90)
const SPOUT = { dx: 58, dy: -62 };

/** Gießkanne: Ziehen → kippt und tropft. Wo es gießt, wachsen Blumen; ein Kind darunter schüttelt sich lachend. */
export const water: BehaviorFactory = (toy) => {
  let nextDrop = 0;
  let nextFlower = 0;

  return {
    update: (delta) => {
      const scene = toy.scene as PlaygroundScene;
      const target = toy.isDragging ? TILT : 0;
      toy.setAngle(toy.angle + (target - toy.angle) * (1 - Math.exp(-10 * (delta / 1000))));
      if (!toy.isDragging || toy.angle < TILT * 0.6) return;

      const rad = (toy.angle * Math.PI) / 180;
      const sx = toy.x + (SPOUT.dx * Math.cos(rad) - SPOUT.dy * Math.sin(rad)) * toy.scaleX;
      const sy = toy.y + (SPOUT.dx * Math.sin(rad) + SPOUT.dy * Math.cos(rad)) * toy.scaleY;
      const now = scene.time.now;
      if (now >= nextDrop) {
        nextDrop = now + DROP_EVERY;
        const drop = scene.add.image(sx, sy, 'drop').setDepth(toy.depth + 1);
        scene.tweens.add({ targets: drop, y: sy + FALL, alpha: 0.2, duration: 350, ease: 'Quad.easeIn', onComplete: () => drop.destroy() });
      }
      if (now >= nextFlower) {
        nextFlower = now + FLOWER_EVERY;
        const ly = sy + FALL;
        // Ein Kind im Wasserstrahl schüttelt sich lachend
        const kid = scene.kidsOnMeadow().find((k) => k.getBounds().contains(sx, sy + FALL / 2) || k.getBounds().contains(sx, ly));
        if (kid) kid.giggle();
        else if (!scene.isInSandbox(sx, ly)) scene.garden.growFlower(sx, ly);
      }
    },
  };
};
