import Phaser from 'phaser';
import { ToySeats } from '../seats';
import type { Toy } from '../Toy';
import type { BehaviorFactory } from './types';

const MAX_FLOATERS = 4;
const KID_SLOTS = [-70, 70];

/**
 * Planschbecken: Kinder hineinziehen → sitzen im Wasser, es spritzt.
 * Spielzeuge hineinziehen → schwimmen und schaukeln auf dem Wasser.
 */
export const pool: BehaviorFactory = (toy) => {
  const scene = toy.scene;
  const seats = new ToySeats(toy, KID_SLOTS.length, 'bathing');
  // Vorderer Beckenrand liegt über Kindern und Spielzeug im Wasser.
  const front = scene.add.image(toy.x, toy.y, 'pool-front').setOrigin(0.5, 1);
  let floaters: Toy[] = [];
  let nextSplash = 0;

  const splash = (x: number, y: number) => {
    scene.events.emit('sound', { kind: 'splash', x });
    for (let i = 0; i < 10; i++) {
      const drop = scene.add.circle(x, y, Phaser.Math.Between(4, 8), 0x8ecae6).setDepth(toy.depth + 1);
      const a = -Math.PI / 2 + Phaser.Math.FloatBetween(-1.1, 1.1);
      const r = Phaser.Math.Between(40, 110);
      scene.tweens.add({
        targets: drop,
        x: x + Math.cos(a) * r,
        y: y + Math.sin(a) * r * 0.8 + 50,
        alpha: 0,
        duration: Phaser.Math.Between(450, 700),
        ease: 'Quad.easeOut',
        onComplete: () => drop.destroy(),
      });
    }
  };

  return {
    onKidDropped: (kid) => {
      const slot = seats.mount(kid, kid.x < toy.x ? 0 : 1);
      if (slot < 0) return false;
      splash(toy.x + KID_SLOTS[slot], toy.y - 40);
      return true;
    },
    onToyDropped: (other) => {
      const unfit =
        other.displayWidth > 150 ||
        other.displayHeight > 150 ||
        other.def.behaviors.some((b) => b === 'float' || b === 'kite' || b === 'rideable' || b === 'pool');
      if (unfit || floaters.length >= MAX_FLOATERS) return false;
      floaters.push(other);
      other.physics.stop();
      splash(other.x, toy.y - 40);
      return true;
    },
    update: () => {
      seats.cleanup();
      const t = scene.time.now / 1000;
      front.setPosition(toy.x, toy.y).setDepth(toy.depth + 0.6).setScale(toy.scaleX, toy.scaleY);
      seats.riders.forEach((kid, i) => {
        if (!kid) return;
        kid.setPosition(toy.x + KID_SLOTS[i], toy.y - 16 + Math.sin(t * 2 + i) * 3).setDepth(toy.depth + 0.5);
      });
      floaters = floaters.filter((f) => f.active && !f.isDragging && !f.heldBy);
      floaters.forEach((f, i) => {
        f.physics.stop();
        f.setPosition(toy.x - 105 + i * 70, toy.y - 26 + Math.sin(t * 2 + i) * 4)
          .setAngle(Math.sin(t * 1.5 + i) * 10)
          .setDepth(toy.depth + 0.5);
      });
      // Wer im Wasser sitzt, planscht ab und zu.
      if (seats.count > 0 && scene.time.now > nextSplash) {
        nextSplash = scene.time.now + Phaser.Math.Between(1800, 3200);
        const kid = seats.riders.find(Boolean);
        if (kid) splash(kid.x, toy.y - 40);
      }
    },
    onRemove: () => {
      seats.dismountAll();
      floaters.forEach((f) => {
        f.setAngle(0);
        f.physics.launch(0, 0, toy.y + 20);
      });
      floaters = [];
    },
    onDestroy: () => front.destroy(),
  };
};
