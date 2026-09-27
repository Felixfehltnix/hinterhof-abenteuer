import { ToySeats } from '../seats';
import type { BehaviorFactory } from './types';

const CAPACITY = 4;
const PEEK_TIME = 4000; // ms, dann versteckt sich das Kind wieder

/**
 * Spielzelt: Kind hineinziehen → verschwindet, das Zelt wackelt. Antippen → ein Kind guckt
 * heraus (Kuckuck!). Nochmal antippen → es kommt heraus. Mehrere Kinder passen hinein.
 */
export const tent: BehaviorFactory = (toy) => {
  const scene = toy.scene;
  const seats = new ToySeats(toy, CAPACITY, 'hiding');
  let peek: { img: Phaser.GameObjects.Image; until: number } | undefined;

  const wobble = () => {
    if (scene.tweens.isTweening(toy)) return;
    scene.tweens.add({ targets: toy, angle: { from: -4, to: 4 }, duration: 90, yoyo: true, repeat: 3, onComplete: () => toy.setAngle(0) });
  };

  const hidePeek = () => {
    if (!peek) return;
    const img = peek.img;
    peek = undefined;
    scene.tweens.add({ targets: img, y: img.y + 40, alpha: 0, duration: 200, onComplete: () => img.destroy() });
  };

  return {
    onKidDropped: (kid) => {
      if (seats.mount(kid) < 0) return false;
      kid.setVisible(false);
      wobble();
      return true;
    },
    onTap: () => {
      const kid = seats.riders.find(Boolean);
      if (!kid) {
        wobble();
        return;
      }
      if (!peek) {
        // Kuckuck!
        const y = toy.y - 30;
        const img = scene.add.image(toy.x, y + 40, `portrait-${kid.def.id}`).setScale(0.75).setOrigin(0.5, 1).setAlpha(0);
        img.setDepth(toy.depth + 0.1);
        scene.tweens.add({ targets: img, y, alpha: 1, duration: 250, ease: 'Back.easeOut' });
        peek = { img, until: scene.time.now + PEEK_TIME };
        scene.events.emit('sound', { kind: 'peekaboo', x: toy.x });
        return;
      }
      // Rauskommen
      hidePeek();
      seats.release(kid);
      kid.setPosition(toy.x + 20, toy.y + 25).setDepth(toy.y + 25);
      kid.hop();
    },
    update: () => {
      seats.cleanup();
      seats.riders.forEach((kid) => kid?.setPosition(toy.x, toy.y).setVisible(false));
      if (peek) {
        peek.img.x = toy.x;
        if (scene.time.now > peek.until || seats.count === 0) hidePeek();
      }
    },
    onRemove: () => {
      hidePeek();
      seats.dismountAll();
    },
    onDestroy: () => peek?.img.destroy(),
  };
};
