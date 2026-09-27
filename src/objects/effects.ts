import Phaser from 'phaser';

// Kleine Effekte, die mehrere Objekte benutzen. Alles räumt sich selbst wieder auf.

/** Sterne sprühen nach oben und außen (Treffer!). */
export function stars(scene: Phaser.Scene, x: number, y: number, count = 10): void {
  for (let i = 0; i < count; i++) {
    const star = scene.add.image(x, y, 'star').setDepth(y + 600).setScale(Phaser.Math.FloatBetween(0.7, 1.3));
    const a = -Math.PI / 2 + Phaser.Math.FloatBetween(-1.2, 1.2);
    const r = Phaser.Math.Between(80, 180);
    scene.tweens.add({
      targets: star,
      x: x + Math.cos(a) * r,
      y: y + Math.sin(a) * r,
      angle: Phaser.Math.Between(-180, 180),
      alpha: 0,
      scale: 0.2,
      duration: Phaser.Math.Between(600, 900),
      ease: 'Quad.easeOut',
      onComplete: () => star.destroy(),
    });
  }
}
