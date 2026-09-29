import Phaser from 'phaser';
import type { PlaygroundScene } from '../scenes/PlaygroundScene';

/**
 * Felix' grünes Gitter-Gartentor (#64): Antippen öffnet das Grill-Spiel (#66). Es ist Deko im
 * Sinne des Vorrangs (touchRank): Kinder und Spielzeug davor gehen vor.
 */
export class FelixGate {
  readonly image: Phaser.GameObjects.Image;

  constructor(scene: PlaygroundScene, x: number, y: number) {
    this.image = scene.add.image(x, y, 'felix-gate').setOrigin(0.5, 1).setDepth(y);
    const pad = 20;
    this.image.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-pad, 0, this.image.width + 2 * pad, this.image.height),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    this.image.setData('scenery', true);
    this.image.setData('onTap', () => scene.openGrill());
  }
}
