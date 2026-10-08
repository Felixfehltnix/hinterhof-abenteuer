import type { PlaygroundScene } from '../../../scenes/PlaygroundScene';
import type { BehaviorFactory } from './types';

/** Tischtennisplatte: Antippen öffnet Pong (PongScene), die Kinder an der Platte spielen. */
export const pong: BehaviorFactory = (toy) => ({
  onTap: () => {
    if (toy.physics.active) return;
    (toy.scene as PlaygroundScene).openPong(toy);
  },
});
