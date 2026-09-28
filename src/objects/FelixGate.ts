import Phaser from 'phaser';

/**
 * Felix' grünes Gitter-Gartentor (#64). Vorerst nur Deko ohne Funktion und ohne Touch-Fläche
 * (es schluckt keine Berührungen). Später wird es der Eingang zum Grill-Spiel (#66):
 * dann hier `setInteractive()` und `setData('onTap', …)` ergänzen.
 */
export class FelixGate {
  readonly image: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.image = scene.add.image(x, y, 'felix-gate').setOrigin(0.5, 1).setDepth(y);
  }
}
