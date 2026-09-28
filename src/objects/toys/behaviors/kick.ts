import Phaser from 'phaser';
import { GAME_WIDTH } from '../../../config';
import type { BehaviorFactory } from './types';

/** Antippen schießt das Spielzeug in einem Bogen weg, zur Bildmitte hin. */
export const kick: BehaviorFactory = (toy) => ({
  onTap: () => {
    const dir = toy.x > GAME_WIDTH / 2 ? -1 : 1;
    const speed = toy.params.kickSpeed * Phaser.Math.FloatBetween(0.8, 1.2);
    // Kleine zufällige Tiefe, damit der Schuss nicht immer auf derselben Linie bleibt
    const depth = Phaser.Math.FloatBetween(-1, 1) * toy.params.kickDepth;
    toy.physics.launch(dir * speed, -toy.params.kickLift, undefined, depth);
  },
});
