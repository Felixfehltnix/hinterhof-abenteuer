import { PHOTO } from '../../../data/photos';
import type { PlaygroundScene } from '../../../scenes/PlaygroundScene';
import type { Kid } from '../../Kid';
import type { BehaviorFactory } from './types';

// Zwischen zwei Fotos (ms), damit Dauertippen nicht alles mit Blitzen flutet.
const COOLDOWN = 1300;

/**
 * Kamera: Hält ein Kind sie, Kind antippen = es hebt die Kamera vors Gesicht und fotografiert, was vor
 * ihm ist. Liegt sie auf der Wiese, löst Antippen sie direkt aus. Das Sofortbild hängt dann an der
 * Fotoleine (src/objects/Photos.ts).
 */
export const camera: BehaviorFactory = (toy) => {
  let readyAt = 0;

  const shoot = (x: number, y: number, dir: number, kid?: Kid): boolean => {
    const scene = toy.scene as PlaygroundScene;
    const now = scene.time.now;
    if (now < readyAt) return true;
    readyAt = now + COOLDOWN;
    kid?.act('photo');
    scene.time.delayedCall(kid ? PHOTO.shutterDelay : 50, () => {
      if (!toy.active) return;
      scene.events.emit('sound', { kind: 'camera', x: toy.x });
      scene.photos.take(x, y, dir, { x: toy.x, y: toy.y - toy.displayHeight / 2 });
    });
    return true;
  };

  return {
    onUse: (kid) => shoot(kid.x, kid.y, kid.flipX ? -1 : 1, kid),
    onTap: () => {
      if (toy.heldBy || toy.physics.active) return;
      shoot(toy.x, toy.y, toy.flipX ? -1 : 1);
    },
  };
};
