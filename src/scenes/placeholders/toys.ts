import Phaser from 'phaser';
import type { ToyId } from '../../data/toys';

// Platzhalter-Zeichnungen für die Spielzeuge aus src/data/toys.ts, gezeichnet in die
// Fläche width × height aus dem Katalog. Fehlt eine Zeichnung, meckert tsc.
// Liegt eine echte Grafik unter derselben id vor, wird die Zeichnung übersprungen.

type Draw = (g: Phaser.GameObjects.Graphics) => void;

export const TOY_PLACEHOLDERS: Record<ToyId, Draw> = {
  ball: (g) => {
    g.fillStyle(0xef476f);
    g.fillCircle(40, 40, 38);
    g.fillStyle(0xffffff);
    g.fillCircle(40, 40, 14);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(26, 24, 8);
  },

  bucket: (g) => {
    g.lineStyle(5, 0x023047);
    g.beginPath();
    g.arc(45, 30, 30, Math.PI, 0, false);
    g.strokePath();
    g.fillStyle(0x219ebc);
    g.fillPoints(
      [
        new Phaser.Math.Vector2(10, 28),
        new Phaser.Math.Vector2(80, 28),
        new Phaser.Math.Vector2(70, 90),
        new Phaser.Math.Vector2(20, 90),
      ],
      true,
    );
  },

  football: (g) => {
    g.fillStyle(0xffffff);
    g.fillCircle(38, 38, 36);
    g.lineStyle(3, 0x222222);
    g.strokeCircle(38, 38, 36);
    g.fillStyle(0x222222);
    g.fillPoints(pentagon(38, 38, 12), true);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      g.fillPoints(pentagon(38 + Math.cos(a) * 29, 38 + Math.sin(a) * 29, 8), true);
    }
  },

  basketball: (g) => {
    g.fillStyle(0xf77f00);
    g.fillCircle(42, 42, 40);
    g.lineStyle(3, 0x3d2314);
    g.strokeCircle(42, 42, 40);
    g.lineBetween(2, 42, 82, 42);
    g.lineBetween(42, 2, 42, 82);
    g.beginPath();
    g.arc(0, 42, 30, -Math.PI / 2, Math.PI / 2, false);
    g.strokePath();
    g.beginPath();
    g.arc(84, 42, 30, Math.PI / 2, (3 * Math.PI) / 2, false);
    g.strokePath();
  },

  beachball: (g) => {
    const colors = [0xef476f, 0xffffff, 0x118ab2, 0xffffff, 0xffd166, 0xffffff];
    colors.forEach((c, i) => {
      g.fillStyle(c);
      g.slice(65, 65, 62, (i * Math.PI) / 3, ((i + 1) * Math.PI) / 3, false);
      g.fillPath();
    });
    g.fillStyle(0xffffff);
    g.fillCircle(65, 65, 12);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(42, 38, 12);
  },

  frisbee: (g) => {
    g.fillStyle(0x7209b7);
    g.fillEllipse(55, 20, 108, 28);
    g.fillStyle(0xb5179e);
    g.fillEllipse(55, 16, 80, 16);
    g.lineStyle(3, 0xf1c0e8);
    g.strokeEllipse(55, 16, 52, 9);
  },
};

function pentagon(cx: number, cy: number, r: number): Phaser.Math.Vector2[] {
  const points: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    points.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  return points;
}
