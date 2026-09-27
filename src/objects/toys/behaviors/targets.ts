import type { PlaygroundScene } from '../../../scenes/PlaygroundScene';
import type { Toy } from '../Toy';

/** Alle Bälle auf der Wiese außer dem Spielzeug selbst, die gerade niemand festhält. */
export function ballsNear(toy: Toy): Toy[] {
  return (toy.scene as PlaygroundScene)
    .toysOnMeadow()
    .filter((t) => t !== toy && t.active && !t.isDragging && !t.heldBy && (t.def.tags?.includes('ball') ?? false));
}

/** Geschwindigkeit eines Spielzeugs in px/s (0, wenn es ruht). */
export function speedOf(toy: Toy): number {
  return toy.physics.active ? Math.hypot(toy.physics.vx, toy.physics.vz) : 0;
}
