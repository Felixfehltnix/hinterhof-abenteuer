import Phaser from 'phaser';
import type { BehaviorFactory } from './types';

/** Antippen schießt das Spielzeug in einem Bogen weg, zur Mitte des sichtbaren Ausschnitts hin. */
export const kick: BehaviorFactory = (toy) => ({
  onTap: () => {
    const dir = toy.x > toy.scene.cameras.main.worldView.centerX ? -1 : 1;
    const speed = toy.params.kickSpeed * Phaser.Math.FloatBetween(0.8, 1.2);
    // Kleine zufällige Tiefe, damit der Schuss nicht immer auf derselben Linie bleibt
    const depth = Phaser.Math.FloatBetween(-1, 1) * toy.params.kickDepth;
    toy.physics.launch(dir * speed, -toy.params.kickLift, undefined, depth);
    toy.scene.events.emit('sound', { kind: 'kick', x: toy.x });
  },
});
