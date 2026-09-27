import { drawString } from '../string';
import type { BehaviorFactory } from './types';

// So weit über dem Finger fliegt der Drachen beim Ziehen.
const RISE_X = -70;
const RISE_Y = -380;

/**
 * Drachen: Beim Ziehen hält der Finger die Schnur, der Drachen steigt hoch und flattert.
 * Loslassen: sinkt langsam (params mit wenig Schwerkraft und viel Luftwiderstand).
 */
export const kite: BehaviorFactory = (toy) => {
  let anchor: { x: number; y: number } | undefined;
  let pos = { x: toy.x, y: toy.y };
  let line: Phaser.GameObjects.Graphics | undefined;

  return {
    onDragStart: () => {
      pos = { x: toy.x, y: toy.y };
      anchor = { x: toy.x, y: toy.y };
      line ??= toy.scene.add.graphics();
    },
    onDrag: (x, y) => {
      anchor = { x, y };
      toy.setPosition(pos.x, pos.y); // der Drachen folgt weich in update()
    },
    onDragEnd: (release) => {
      // Nicht werfen, sondern sanft dort herabsinken, wo der Finger die Schnur hielt.
      release.vx = 0;
      release.vy = 0;
      if (anchor) release.groundY = anchor.y;
      anchor = undefined;
      line?.clear();
    },
    update: (delta) => {
      const t = toy.scene.time.now / 1000;
      if (anchor && toy.isDragging && line) {
        const tx = anchor.x + RISE_X + Math.sin(t * 3) * 25;
        const ty = Math.max(toy.displayHeight + 10, anchor.y + RISE_Y + Math.sin(t * 2.3) * 15);
        const k = 1 - Math.exp(-4 * (delta / 1000));
        pos = { x: pos.x + (tx - pos.x) * k, y: pos.y + (ty - pos.y) * k };
        toy.setPosition(pos.x, pos.y);
        toy.setAngle(Math.sin(t * 4) * 8);
        line.setDepth(toy.depth - 1);
        drawString(line, anchor.x, anchor.y, toy.x, toy.y - 20, 30);
      } else if (toy.physics.active && toy.physics.z > 0) {
        toy.setAngle(Math.sin(t * 3) * 10); // flattert beim Herabsinken
      } else if (!toy.heldBy && toy.angle !== 0 && !toy.physics.active) {
        toy.setAngle(0);
      }
    },
    onDestroy: () => line?.destroy(),
  };
};
