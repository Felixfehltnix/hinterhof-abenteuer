import type { PlaygroundScene } from '../../../scenes/PlaygroundScene';
import type { BehaviorFactory } from './types';

/**
 * Schminkkoffer: Hält ein Kind ihn und man zieht ein anderes Kind darauf, öffnet sich das Schminken
 * (das gezogene Kind wird geschminkt). Sonst nimmt `handheld` das Kind als neuen Halter. Dieser Baustein
 * steht im Katalog vor `handheld`.
 */
export const makeup: BehaviorFactory = (toy) => ({
  onKidDropped: (kid) => {
    const holder = toy.heldBy;
    if (!holder || holder === kid) return false;
    (toy.scene as PlaygroundScene).openMakeup(kid);
    return true;
  },
});
