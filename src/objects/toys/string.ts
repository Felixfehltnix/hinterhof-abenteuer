import Phaser from 'phaser';

/** Zeichnet eine leicht durchhängende Schnur von (x1, y1) nach (x2, y2). */
export function drawString(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number, sag = 18): void {
  g.clear();
  g.lineStyle(3, 0x4a4a4a, 0.9);
  const curve = new Phaser.Curves.QuadraticBezier(
    new Phaser.Math.Vector2(x1, y1),
    new Phaser.Math.Vector2((x1 + x2) / 2, (y1 + y2) / 2 + sag),
    new Phaser.Math.Vector2(x2, y2),
  );
  curve.draw(g, 16);
}
