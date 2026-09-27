import type { PlaygroundScene } from '../../../scenes/PlaygroundScene';
import { sandSpray } from '../../Garden';
import type { BehaviorFactory } from './types';

const SPRAY_EVERY = 90; // ms
const FILL_PER_SPRAY = 0.05;
const BUCKET_RANGE = 180; // px: so nah muss ein Eimer sein, damit er sich füllt

/** Schaufel: Im Sandkasten ziehen → buddeln, Sand fliegt. Neben einem Eimer → der Eimer füllt sich. */
export const dig: BehaviorFactory = (toy) => {
  let last = { x: toy.x, y: toy.y };
  let nextSpray = 0;
  let digging = false;

  return {
    update: () => {
      const scene = toy.scene as PlaygroundScene;
      const moved = Math.hypot(toy.x - last.x, toy.y - last.y);
      last = { x: toy.x, y: toy.y };
      const inSand = toy.isDragging && scene.isInSandbox(toy.x, toy.y);
      if (!inSand) {
        if (digging) {
          digging = false;
          toy.setAngle(0);
        }
        return;
      }
      digging = true;
      const now = scene.time.now;
      toy.setAngle(Math.sin(now / 60) * 20);
      if (moved < 1.5 || now < nextSpray) return;
      nextSpray = now + SPRAY_EVERY;
      sandSpray(scene, toy.x, toy.y - 10, 4);
      const bucket = scene
        .toysOnMeadow()
        .find((t) => t.def.behaviors.includes('fillable') && Math.hypot(t.x - toy.x, t.y - toy.y) < BUCKET_RANGE);
      bucket?.receive('sand', FILL_PER_SPRAY);
    },
  };
};
