import type { PlaygroundScene } from '../../../scenes/PlaygroundScene';
import type { BehaviorFactory } from './types';

/** Zaubertrank: Eimer antippen (am Boden) oder das Kind mit dem Eimer antippen öffnet das Brau-Spiel. */
export const brew: BehaviorFactory = (toy) => ({
  onTap: () => {
    if (toy.heldBy || toy.physics.active) return;
    (toy.scene as PlaygroundScene).openBrew(toy);
  },
  onUse: () => {
    if (toy.physics.active) return false;
    (toy.scene as PlaygroundScene).openBrew(toy);
    return true;
  },
});
