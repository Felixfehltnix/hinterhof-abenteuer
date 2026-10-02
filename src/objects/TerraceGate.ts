import Phaser from 'phaser';
import type { PlaygroundScene } from '../scenes/PlaygroundScene';

/**
 * Tor zur Steinterrasse (graue Steinpfosten, hellblaue Holztür): Antippen öffnet das
 * Kreide-Malspiel. Deko im Sinne des Vorrangs (touchRank): Kinder und Spielzeug davor gehen vor.
 */
export class TerraceGate {
  readonly image: Phaser.GameObjects.Image;

  constructor(scene: PlaygroundScene, x: number, y: number) {
    this.image = scene.add.image(x, y, 'terrace-gate').setOrigin(0.5, 1).setDepth(y);
    const pad = 20;
    this.image.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-pad, 0, this.image.width + 2 * pad, this.image.height),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    this.image.setData('scenery', true);
    this.image.setData('onTap', () => {
      // Kurz aufschwingen, dann hinein
      scene.tweens.add({ targets: this.image, scaleX: 0.92, duration: 120, yoyo: true });
      scene.openChalk();
    });
  }
}
