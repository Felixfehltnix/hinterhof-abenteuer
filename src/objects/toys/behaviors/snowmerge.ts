import { getToyDef, type ToyId } from '../../../data/toys';
import type { PlaygroundScene } from '../../../scenes/PlaygroundScene';
import { stars } from '../../effects';
import type { BehaviorFactory } from './types';

// Wie viele Kugeln stecken in welchem Schnee-Spielzeug.
const SIZES: Partial<Record<ToyId, number>> = { snowball: 1, snowball2: 2, snowman: 3 };
const BY_SIZE: Record<number, ToyId> = { 2: 'snowball2', 3: 'snowman' };

/** Schneebälle aufeinanderziehen: 1+1 = zwei Kugeln, zusammen 3 = Schneemann mit Nase, Augen und Mütze. */
export const snowmerge: BehaviorFactory = (toy) => ({
  onToyDropped: (other) => {
    const a = SIZES[toy.def.id as ToyId];
    const b = SIZES[other.def.id as ToyId];
    if (!a || !b || a + b > 3) return false;
    const scene = toy.scene as PlaygroundScene;
    const x = toy.x;
    const y = toy.y;
    scene.removeToy(other);
    scene.removeToy(toy);
    const merged = scene.spawnToy(getToyDef(BY_SIZE[a + b]), x, y);
    if (merged) {
      merged.setScale(1.2, 0.8);
      scene.tweens.add({ targets: merged, scaleX: 1, scaleY: 1, duration: 350, ease: 'Back.easeOut' });
      if (a + b === 3) stars(scene, x, y - 200, 8);
    }
    return true;
  },
});
