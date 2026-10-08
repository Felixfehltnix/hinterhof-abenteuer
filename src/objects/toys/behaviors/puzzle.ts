import type { PlaygroundScene } from '../../../scenes/PlaygroundScene';
import type { BehaviorFactory } from './types';

/** Puzzlebrett: Antippen öffnet das Puzzle mit Tierfotos (PuzzleScene). */
export const puzzle: BehaviorFactory = (toy) => ({
  onTap: () => {
    if (toy.physics.active) return;
    (toy.scene as PlaygroundScene).openPuzzle();
  },
});
