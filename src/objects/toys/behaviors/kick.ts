import Phaser from 'phaser';
import { GAME_WIDTH } from '../../../config';
import type { BehaviorFactory } from './types';

/** Antippen schießt das Spielzeug in einem Bogen weg, zur Bildmitte hin. */
export const kick: BehaviorFactory = (toy) => ({
  onTap: () => {
    const dir = toy.x > GAME_WIDTH / 2 ? -1 : 1;
    const speed = toy.params.kickSpeed * Phaser.Math.FloatBetween(0.8, 1.2);
    toy.physics.launch(dir * speed, -toy.params.kickLift);
  },
});
