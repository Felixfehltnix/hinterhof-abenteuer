import type { PlaygroundScene } from '../../../scenes/PlaygroundScene';
import type { BehaviorFactory } from './types';

/** Elektro-Baukasten: Antippen öffnet die Strom-Werkstatt (CircuitScene). */
export const circuit: BehaviorFactory = (toy) => ({
  onTap: () => {
    if (toy.physics.active) return;
    (toy.scene as PlaygroundScene).openCircuit();
  },
});
