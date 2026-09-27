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
};
