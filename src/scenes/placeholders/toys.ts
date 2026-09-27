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

  paperplane: (g) => {
    const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);
    g.fillStyle(0xffffff);
    g.fillPoints([v(0, 10), v(100, 25), v(20, 48)], true);
    g.fillStyle(0xdde6ee);
    g.fillPoints([v(0, 10), v(100, 25), v(30, 28)], true);
    g.lineStyle(2, 0x9aa5b1);
    g.strokePoints([v(0, 10), v(100, 25), v(20, 48)], true);
    g.lineBetween(30, 28, 100, 25);
  },

  boomerang: (g) => {
    g.lineStyle(22, 0xbc6c25);
    g.beginPath();
    g.moveTo(14, 86);
    g.lineTo(50, 20);
    g.lineTo(86, 86);
    g.strokePath();
    g.fillStyle(0xbc6c25);
    g.fillCircle(14, 86, 11);
    g.fillCircle(86, 86, 11);
    g.fillCircle(50, 20, 11);
    g.fillStyle(0xfefae0);
    g.fillCircle(50, 24, 5);
  },

  kite: (g) => {
    const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);
    g.fillStyle(0xef476f);
    g.fillPoints([v(60, 0), v(118, 50), v(60, 110), v(2, 50)], true);
    g.fillStyle(0xffd166);
    g.fillPoints([v(60, 0), v(118, 50), v(60, 50)], true);
    g.fillPoints([v(60, 50), v(60, 110), v(2, 50)], true);
    g.lineStyle(3, 0x6d4c41);
    g.lineBetween(60, 0, 60, 110);
    g.lineBetween(2, 50, 118, 50);
    // Schwanz mit Schleifchen
    g.lineStyle(3, 0x4a4a4a);
    g.lineBetween(60, 110, 60, 150);
    g.fillStyle(0x118ab2);
    g.fillTriangle(50, 122, 70, 122, 60, 132);
    g.fillTriangle(50, 142, 70, 142, 60, 132);
  },

  balloon: (g) => {
    g.lineStyle(2, 0x4a4a4a);
    g.lineBetween(45, 108, 45, 150);
    g.fillStyle(0xe63946);
    g.fillEllipse(45, 55, 84, 104);
    g.fillTriangle(38, 110, 52, 110, 45, 100);
    g.fillStyle(0xffffff, 0.45);
    g.fillEllipse(30, 34, 18, 28);
  },

  bubblewand: (g) => {
    g.fillStyle(0x4d96ff);
    g.fillRoundedRect(25, 50, 10, 70, 4);
    g.lineStyle(7, 0x4d96ff);
    g.strokeCircle(30, 26, 22);
    g.lineStyle(2, 0xbde0fe, 0.8);
    g.strokeCircle(30, 26, 15);
  },

  hoop: (g) => {
    // Standfuß und Stange
    g.fillStyle(0x495057);
    g.fillRoundedRect(45, 312, 80, 18, 6);
    g.fillRect(78, 90, 14, 225);
    // Brett
    g.fillStyle(0xffffff);
    g.fillRoundedRect(25, 0, 120, 95, 8);
    g.lineStyle(4, 0xe63946);
    g.strokeRect(60, 40, 50, 38);
    g.lineStyle(3, 0xadb5bd);
    g.strokeRoundedRect(25, 0, 120, 95, 8);
    // Ring
    g.lineStyle(6, 0xf77f00);
    g.strokeEllipse(85, 108, 96, 18);
  },

  goal: (g) => {
    // Netz
    g.fillStyle(0xffffff, 0.25);
    g.fillRect(12, 12, 276, 158);
    g.lineStyle(2, 0xffffff, 0.8);
    for (let x = 12; x <= 288; x += 23) g.lineBetween(x, 12, x, 170);
    for (let y = 12; y <= 170; y += 20) g.lineBetween(12, y, 288, y);
    // Pfosten und Latte
    g.fillStyle(0xf8f9fa);
    g.fillRect(0, 0, 12, 170);
    g.fillRect(288, 0, 12, 170);
    g.fillRect(0, 0, 300, 12);
    g.lineStyle(2, 0xadb5bd);
    g.strokeRect(0, 0, 300, 12);
  },

  cans: (g) => {
    g.fillStyle(0xa0522d);
    g.fillRoundedRect(0, 0, 170, 60, 8);
    g.lineStyle(4, 0x7f3f1a);
    g.lineBetween(6, 20, 164, 20);
    g.lineBetween(6, 40, 164, 40);
    g.strokeRoundedRect(0, 0, 170, 60, 8);
  },

  pins: (g) => {
    g.fillStyle(0xe9c46a);
    g.fillEllipse(120, 20, 236, 28);
    g.lineStyle(3, 0xbc6c25);
    g.strokeEllipse(120, 20, 236, 28);
    g.fillStyle(0xbc6c25);
    g.fillCircle(56, 16, 3);
    g.fillCircle(120, 16, 3);
    g.fillCircle(184, 16, 3);
  },

  // Fahrzeuge ohne Räder (die zeichnet rideable als eigene, drehbare Bilder).
  bobbycar: (g) => {
    g.fillStyle(0xe63946);
    g.fillRoundedRect(8, 34, 164, 48, 22);
    g.fillRoundedRect(8, 12, 44, 40, 12); // Rückenlehne
    g.fillStyle(0xffffff);
    g.fillCircle(160, 56, 8); // Scheinwerfer
    g.lineStyle(6, 0x2b2d42);
    g.lineBetween(128, 36, 138, 10); // Lenksäule
    g.lineBetween(126, 10, 150, 10); // Lenkrad
  },

  balancebike: (g) => {
    g.lineStyle(9, 0x06d6a0);
    g.lineBetween(35, 83, 95, 50); // Rahmen hinten
    g.lineBetween(95, 50, 155, 83); // Gabel
    g.lineBetween(145, 60, 150, 12); // Lenkstange
    g.lineStyle(7, 0x2b2d42);
    g.lineBetween(135, 12, 168, 12); // Lenker
    g.fillStyle(0x2b2d42);
    g.fillRoundedRect(68, 36, 50, 14, 7); // Sattel
  },

  scooter: (g) => {
    g.fillStyle(0x4d96ff);
    g.fillRoundedRect(18, 118, 110, 16, 7); // Trittbrett
    g.fillRect(114, 18, 10, 104); // Lenksäule
    g.fillStyle(0x2b2d42);
    g.fillRoundedRect(98, 10, 44, 12, 6); // Lenker
  },

  wheelbarrow: (g) => {
    const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);
    g.lineStyle(8, 0x8d6e63);
    g.lineBetween(0, 40, 175, 86); // Griffe/Holm
    g.lineBetween(50, 70, 44, 110); // Stütze
    g.fillStyle(0x2a9d8f);
    g.fillPoints([v(22, 22), v(178, 22), v(150, 80), v(52, 80)], true); // Wanne
    g.fillStyle(0x21867a);
    g.fillRect(22, 22, 156, 8);
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
