import Phaser from 'phaser';
import { GAME_WIDTH } from '../../../config';
import type { Kid } from '../../Kid';
import type { BehaviorFactory } from './types';
import type { PlaygroundScene } from '../../../scenes/PlaygroundScene';

/** Auf ein Kind fallen gelassen: Das Kind kickt den Ball weg, sobald er vor seinen Füßen landet. */
export const kidKick: BehaviorFactory = (toy) => {
  let kicker: Kid | undefined;

  const kickNow = () => {
    const kid = kicker;
    kicker = undefined;
    if (!kid || !kid.active || kid.mode !== 'idle') return;
    // Weg vom Kind, aber lieber zur Bildmitte hin, damit er nicht an der Bande klebt.
    let dir = toy.x < kid.x ? -1 : 1;
    if (Math.abs(toy.x - kid.x) < 20) dir = kid.x > GAME_WIDTH / 2 ? -1 : 1;
    kid.kick(dir);
    toy.physics.launch(dir * toy.params.kickSpeed * 1.4 * Phaser.Math.FloatBetween(0.9, 1.1), -toy.params.kickLift * 0.9);
  };

  toy.physics.landListeners.push(() => {
    if (kicker) kickNow();
  });

  return {
    onDragStart: () => {
      kicker = undefined;
    },
    onDragEnd: (release) => {
      const scene = toy.scene as PlaygroundScene;
      const cx = toy.x;
      const cy = toy.y - toy.displayHeight / 2;
      kicker = scene.kidsOnMeadow().find((k) => k.mode === 'idle' && k.getBounds().contains(cx, cy));
      if (!kicker) return;
      // Direkt vor die Füße des Kindes fallen lassen (gleiche Tiefe, knapp davor).
      toy.x = Phaser.Math.Clamp(toy.x, kicker.x - 50, kicker.x + 50);
      release.vx = 0;
      release.vy = 0;
      release.groundY = kicker.y + 2;
    },
  };
};
