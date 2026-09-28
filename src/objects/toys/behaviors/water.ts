import { GROUND_MAX_Y } from '../../../config';
import type { PlaygroundScene } from '../../../scenes/PlaygroundScene';
import type { BehaviorFactory } from './types';

const TILT = 35; // Grad beim Gießen
const DROP_EVERY = 70; // ms
const FLOWER_EVERY = 280; // ms
const FALL = 140; // px: so tief fallen die Tropfen unter die Tülle
// Tülle relativ zum Fußpunkt (Platzhalter 120×90)
const SPOUT = { dx: 58, dy: -62 };
// So lange gießt ein Kind nach dem Antippen (ms)
const POUR_TIME = 1600;

/**
 * Gießkanne: Ziehen → kippt und tropft. Wo es gießt, wachsen Blumen; ein Kind darunter schüttelt
 * sich lachend. Hält sie ein Kind: Kind antippen = es gießt eine Weile dort, wo es steht.
 */
export const water: BehaviorFactory = (toy) => {
  let nextDrop = 0;
  let nextFlower = 0;
  let pourUntil = 0;

  return {
    onUse: () => {
      pourUntil = toy.scene.time.now + POUR_TIME;
      return true;
    },
    update: (delta) => {
      const scene = toy.scene as PlaygroundScene;
      const k = 1 - Math.exp(-10 * (delta / 1000));
      let tilt: number;
      if (toy.heldBy) {
        // In der Hand kippt das Kind die Kanne (handheld setzt den Winkel)
        toy.handTilt += ((scene.time.now < pourUntil ? TILT : 0) - toy.handTilt) * k;
        tilt = toy.handTilt;
      } else {
        toy.setAngle(toy.angle + ((toy.isDragging ? TILT : 0) - toy.angle) * k);
        tilt = toy.isDragging ? toy.angle : 0;
      }
      if (tilt < TILT * 0.6) return;

      // Tülle (gespiegelt, wenn die Kanne nach links zeigt)
      const dir = toy.flipX ? -1 : 1;
      const rad = (toy.angle * Math.PI) / 180;
      const sx = toy.x + (dir * SPOUT.dx * Math.cos(rad) - SPOUT.dy * Math.sin(rad)) * toy.scaleX;
      const sy = toy.y + (dir * SPOUT.dx * Math.sin(rad) + SPOUT.dy * Math.cos(rad)) * toy.scaleY;
      const now = scene.time.now;
      // Wo die Tropfen aufkommen: in der Hand eines Kindes vor seinen Füßen, sonst unter der Tülle
      const ly = toy.heldBy ? Math.min(GROUND_MAX_Y, toy.heldBy.y + 14) : sy + FALL;
      if (now >= nextDrop) {
        nextDrop = now + DROP_EVERY;
        const drop = scene.add.image(sx, sy, 'drop').setDepth(toy.depth + 1);
        scene.tweens.add({ targets: drop, y: ly, alpha: 0.2, duration: 350, ease: 'Quad.easeIn', onComplete: () => drop.destroy() });
      }
      if (now >= nextFlower) {
        nextFlower = now + FLOWER_EVERY;
        // Ein Kind gießt im Stehen ein kleines Beet: Blumen verteilen sich etwas um die Tülle
        const fx = toy.heldBy ? sx + (Math.random() * 2 - 1) * 60 : sx;
        // Ein Kind im Wasserstrahl schüttelt sich lachend
        const kid = scene.kidsOnMeadow().find((k) => k !== toy.heldBy && (k.getBounds().contains(sx, sy + FALL / 2) || k.getBounds().contains(sx, ly)));
        if (kid) kid.giggle();
        else if (!scene.isInSandbox(fx, ly)) scene.garden.growFlower(fx, ly);
      }
    },
  };
};
