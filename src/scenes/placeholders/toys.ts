import Phaser from 'phaser';
import type { ToyId } from '../../data/toys';
import { drawRocket } from './space';

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
      g.fillPoints(pentagon(38 + Math.cos(a) * 26, 38 + Math.sin(a) * 26, 8), true);
    }
  },

  basketball: (g) => {
    g.fillStyle(0xf77f00);
    g.fillCircle(42, 42, 40);
    g.lineStyle(3, 0x3d2314);
    g.strokeCircle(42, 42, 40);
    g.lineBetween(4, 42, 80, 42);
    g.lineBetween(42, 4, 42, 80);
    // Seitliche Nähte: Bögen, deren Enden genau auf dem Ballrand liegen (nichts ragt heraus).
    for (const side of [-1, 1]) {
      const cx = 42 + side * 50;
      const r = 36;
      // Schnittwinkel des Naht-Kreises mit dem Ballkreis (Radius 40, Abstand 50)
      const a = Math.acos((50 * 50 + r * r - 40 * 40) / (2 * 50 * r));
      const toward = side < 0 ? 0 : Math.PI;
      g.beginPath();
      g.arc(cx, 42, r, toward - a, toward + a, false);
      g.strokePath();
    }
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

  ridecar: (g) => {
    // Niedriger roter Körper, gelber Sitz mit Lehne, gelbes Lenkrad (ohne Logo)
    g.fillStyle(0xd62828);
    g.fillRoundedRect(10, 42, 132, 36, 16);
    g.fillRoundedRect(84, 30, 50, 30, 12); // Motorhaube
    g.fillStyle(0xffc300);
    g.fillRoundedRect(22, 30, 56, 16, 7); // Sitz
    g.fillRoundedRect(16, 8, 18, 38, 8); // Lehne
    g.lineStyle(6, 0xffc300);
    g.lineBetween(112, 34, 118, 12); // Lenksäule
    g.fillStyle(0xffc300);
    g.fillEllipse(118, 10, 30, 10); // Lenkrad
    g.fillStyle(0xffffff);
    g.fillCircle(136, 50, 6); // Scheinwerfer
    g.fillStyle(0xffc300);
    g.fillRoundedRect(14, 64, 124, 8, 4); // gelber Streifen
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

  trampoline: (g) => {
    g.lineStyle(8, 0x495057);
    g.lineBetween(30, 50, 20, 90);
    g.lineBetween(200, 50, 210, 90);
    g.lineBetween(115, 60, 115, 90);
    g.fillStyle(0x4d96ff);
    g.fillEllipse(115, 44, 228, 50);
    g.fillStyle(0x2b2d42);
    g.fillEllipse(115, 42, 196, 34);
  },

  // Nur der Bock in der Mitte; das Brett (seesaw-beam) zeichnet der Baustein drehbar darüber.
  seesaw: (g) => {
    const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);
    g.fillStyle(0x6d4c41);
    g.fillPoints([v(180, 18), v(222, 90), v(138, 90)], true);
    g.fillStyle(0xffd166);
    g.fillCircle(180, 20, 9);
  },

  hopperball: (g) => {
    g.fillStyle(0xf77f00);
    g.fillCircle(45, 56, 43);
    g.lineStyle(9, 0xf77f00);
    g.beginPath();
    g.arc(28, 12, 12, Math.PI * 0.2, Math.PI * 1.2, true);
    g.strokePath();
    g.beginPath();
    g.arc(62, 12, 12, -Math.PI * 0.2, Math.PI * 0.8, false);
    g.strokePath();
    g.fillStyle(0xffffff, 0.45);
    g.fillEllipse(30, 40, 20, 28);
  },

  hulahoop: (g) => {
    g.lineStyle(9, 0xf15bb5);
    g.strokeEllipse(65, 20, 120, 30);
    g.lineStyle(3, 0xfee440);
    g.strokeEllipse(65, 20, 120, 30);
  },

  pool: (g) => {
    g.fillStyle(0x4d96ff);
    g.fillEllipse(160, 50, 316, 96);
    g.fillStyle(0x8ecae6);
    g.fillEllipse(160, 46, 276, 70);
    g.fillStyle(0xffffff, 0.5);
    g.fillEllipse(110, 38, 60, 10);
    g.fillEllipse(200, 52, 40, 8);
  },

  camera: (g) => {
    g.fillStyle(0x343a40);
    g.fillRoundedRect(8, 2, 22, 12, 3); // Sucher
    g.fillStyle(0xe63946);
    g.fillRoundedRect(0, 10, 72, 42, 8); // Gehäuse
    g.fillStyle(0xb5212e);
    g.fillRect(0, 40, 72, 6);
    g.fillStyle(0xf1f3f5);
    g.fillRoundedRect(54, 14, 13, 9, 2); // Blitz
    g.fillStyle(0xffd166);
    g.fillRoundedRect(46, 5, 12, 6, 2); // Auslöser
    g.fillStyle(0x212529);
    g.fillCircle(34, 31, 16); // Objektiv
    g.fillStyle(0x495057);
    g.fillCircle(34, 31, 11);
    g.fillStyle(0x74c0fc, 0.8);
    g.fillCircle(34, 31, 6);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(30, 27, 3);
  },

  shovel: (g) => {
    g.fillStyle(0xfb8500);
    g.fillRoundedRect(20, 0, 10, 72, 4); // Stiel
    g.fillRoundedRect(8, 0, 34, 12, 6); // Griff
    g.fillStyle(0x219ebc);
    g.fillRoundedRect(4, 68, 42, 40, { tl: 6, tr: 6, bl: 20, br: 20 }); // Schaufelblatt
    g.fillTriangle(8, 100, 42, 100, 25, 120);
  },

  sandmold: (g) => {
    g.fillStyle(0x9b5de5);
    for (let i = 0; i < 6; i++) g.fillCircle(10 + i * 11.2, 14, 9); // gewellter Rand
    g.fillPoints(
      [new Phaser.Math.Vector2(4, 14), new Phaser.Math.Vector2(72, 14), new Phaser.Math.Vector2(60, 50), new Phaser.Math.Vector2(16, 50)],
      true,
    );
    g.fillStyle(0xffffff, 0.35);
    g.fillRect(20, 22, 8, 22);
  },

  wateringcan: (g) => {
    g.lineStyle(9, 0x2a9d8f);
    g.lineBetween(84, 58, 116, 26); // Tülle
    g.beginPath();
    g.arc(46, 22, 22, Math.PI, 0, false); // Henkel
    g.strokePath();
    g.fillStyle(0x2a9d8f);
    g.fillRoundedRect(14, 28, 70, 62, 12);
    g.fillStyle(0x21867a);
    g.fillRect(110, 20, 10, 12); // Brause
  },

  sprinkler: (g) => {
    g.fillStyle(0x6c757d);
    g.fillEllipse(40, 52, 76, 16);
    g.fillStyle(0xffd166);
    g.fillRoundedRect(32, 10, 16, 44, 6);
    g.fillStyle(0xe63946);
    g.fillRoundedRect(20, 6, 40, 12, 6);
  },

  drum: (g) => {
    g.fillStyle(0xe63946);
    g.fillRect(8, 22, 94, 64);
    g.fillStyle(0xffd166);
    for (let x = 8; x < 102; x += 18) g.fillTriangle(x, 26, x + 18, 26, x + 9, 82);
    g.fillStyle(0xf1faee);
    g.fillEllipse(55, 22, 94, 26);
    g.lineStyle(4, 0x6d4c41);
    g.lineBetween(20, 14, 2, 0); // Schlegel
    g.lineBetween(90, 14, 108, 0);
    g.fillStyle(0xe63946);
    g.fillEllipse(55, 86, 94, 22);
  },

  xylophone: (g) => {
    g.fillStyle(0x6d4c41);
    g.fillRoundedRect(8, 30, 284, 16, 6);
    g.fillRoundedRect(8, 74, 284, 16, 6);
    g.fillRect(24, 88, 8, 22);
    g.fillRect(268, 88, 8, 22);
    const colors = [0xe63946, 0xf77f00, 0xffd166, 0x06d6a0, 0x118ab2, 0x4d96ff, 0x9b5de5, 0xf15bb5];
    colors.forEach((c, i) => {
      const h = 90 - i * 5;
      g.fillStyle(c);
      g.fillRoundedRect(20 + i * 34, 60 - h / 2, 28, h, 6);
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(34 + i * 34, 60 - h / 2 + 8, 3);
      g.fillCircle(34 + i * 34, 60 + h / 2 - 8, 3);
    });
  },

  tent: (g) => {
    const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);
    g.fillStyle(0xf77f00);
    g.fillPoints([v(125, 0), v(250, 180), v(0, 180)], true);
    g.fillStyle(0xffd166);
    g.fillPoints([v(125, 0), v(170, 180), v(125, 180)], true);
    g.fillStyle(0x3d2314);
    g.fillPoints([v(125, 70), v(165, 180), v(85, 180)], true); // Eingang
    g.fillStyle(0xe63946);
    g.fillTriangle(125, 0, 125, -1, 145, 10);
    g.lineStyle(3, 0x6d4c41);
    g.lineBetween(125, 0, 125, 12);
  },

  flashlight: (g) => {
    g.fillStyle(0x264653);
    g.fillRoundedRect(0, 10, 60, 22, 8);
    g.fillStyle(0x2a9d8f);
    g.fillRoundedRect(56, 2, 34, 36, 8);
    g.fillStyle(0xfff3b0);
    g.fillRoundedRect(82, 8, 8, 24, 3);
    g.fillStyle(0xe63946);
    g.fillRoundedRect(24, 6, 12, 6, 2); // Schalter
  },

  whirlpool: (g) => drawWhirlpool(g, false),
  rocket: (g) => drawRocket(g, 'back'),

  snowball: (g) => {
    g.fillStyle(0xffffff);
    g.fillCircle(35, 34, 32);
    g.fillStyle(0xdde7f3);
    g.fillEllipse(40, 50, 44, 18);
  },

  snowball2: (g) => {
    g.fillStyle(0xffffff);
    g.fillCircle(50, 102, 46);
    g.fillCircle(50, 38, 34);
    g.fillStyle(0xdde7f3);
    g.fillEllipse(56, 126, 60, 22);
    g.fillEllipse(54, 54, 40, 14);
  },

  snowman: (g) => {
    const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);
    g.fillStyle(0xffffff);
    g.fillCircle(75, 212, 56);
    g.fillCircle(75, 128, 42);
    g.fillCircle(75, 64, 32);
    g.fillStyle(0xdde7f3);
    g.fillEllipse(82, 240, 76, 24);
    // Knöpfe, Augen, Mund
    g.fillStyle(0x2b2d42);
    [112, 132, 152].forEach((y) => g.fillCircle(75, y, 5));
    g.fillCircle(63, 58, 5);
    g.fillCircle(87, 58, 5);
    [60, 68, 76, 84, 92].forEach((x, i) => g.fillCircle(x, 78 + Math.abs(i - 2) * -2 + 2, 2.5));
    // Möhrennase
    g.fillStyle(0xf77f00);
    g.fillPoints([v(75, 62), v(75, 72), v(104, 68)], true);
    // Mütze
    g.fillStyle(0xe63946);
    g.fillRoundedRect(46, 26, 58, 12, 5);
    g.fillRoundedRect(54, 2, 42, 28, 8);
    g.fillStyle(0xffffff);
    g.fillCircle(96, 6, 7);
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

// Aufblasbarer Whirlpool (Stil Intex PureSpa, braun), 380 × 230: hohe gewölbte Seitenwand in
// Rattan-Optik, heller dicker Wulst oben, Wasser nur von oben sichtbar, Pumpe seitlich.
export const WHIRLPOOL = {
  cx: 190,
  /** Mittellinie des oberen Wulstes und Wasserfläche. */
  rimY: 62,
  /** Mittellinie der unteren Kante. */
  bottomY: 196,
  rx: 182,
  rimRy: 52,
  /** Innenkante des Wulstes = Wasserrand. */
  waterRx: 156,
  waterRy: 38,
  bottomRy: 32,
};

/** Untere (vordere) Hälfte einer Ellipse, von rechts nach links. */
function lowerHalf(cx: number, cy: number, rx: number, ry: number, reverse = false): Phaser.Math.Vector2[] {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i <= 32; i++) {
    const a = (i / 32) * Math.PI;
    pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry));
  }
  return reverse ? pts.reverse() : pts;
}

/**
 * Whirlpool zeichnen. front = nur der vordere Teil (Wand, vorderer Wulst, Wasser davor), der als
 * eigene Grafik über den Kindern liegt und sie ab Brusthöhe verdeckt.
 */
export function drawWhirlpool(g: Phaser.GameObjects.Graphics, front: boolean): void {
  const { cx, rimY, bottomY, rx, rimRy, waterRx, waterRy, bottomRy } = WHIRLPOOL;
  const wallTopAt = (x: number) => {
    const u = Math.max(-1, Math.min(1, (x - cx) / rx));
    return front ? rimY + rimRy * Math.sqrt(1 - u * u) - 6 : rimY;
  };
  const wallBottomAt = (x: number) => {
    const u = Math.max(-1, Math.min(1, (x - cx) / rx));
    return bottomY + bottomRy * Math.sqrt(1 - u * u);
  };

  if (front) {
    // Wasser vor den Kindern: halb durchsichtig, so sitzen sie „im“ Wasser
    g.fillStyle(0x48cae4, 0.55);
    g.fillPoints(lowerHalf(cx, rimY + 2, waterRx, waterRy), true);
  }

  // Seitenwand (vorn gewölbt bis zur unteren Kante)
  g.fillStyle(0x6f4e37);
  g.fillPoints(
    [
      ...(front ? lowerHalf(cx, rimY, rx, rimRy) : [new Phaser.Math.Vector2(cx + rx, rimY), new Phaser.Math.Vector2(cx - rx, rimY)]),
      ...lowerHalf(cx, bottomY, rx, bottomRy, true),
    ],
    true,
  );
  // Rattan-Streifen: senkrecht, zur Seite hin enger (Rundung)
  for (let i = 0; i < 30; i++) {
    const a = (Math.PI * (i + 0.5)) / 30;
    const x = cx - Math.cos(a) * rx;
    const w = 1.5 + 4 * Math.sin(a);
    g.fillStyle(i % 2 ? 0x9c7a55 : 0x8a6a48);
    g.fillRect(x - w / 2, wallTopAt(x), w, wallBottomAt(x) - wallTopAt(x) - 2);
  }
  // Gewölbt wie aufgeblasen: Seiten dunkler, Mitte etwas heller
  g.fillStyle(0x000000, 0.16);
  g.fillRect(cx - rx, wallTopAt(cx - rx + 10), 22, wallBottomAt(cx - rx + 10) - wallTopAt(cx - rx + 10));
  g.fillRect(cx + rx - 22, wallTopAt(cx + rx - 10), 22, wallBottomAt(cx + rx - 10) - wallTopAt(cx + rx - 10));
  g.fillStyle(0xffffff, 0.07);
  g.fillRect(cx - 70, wallTopAt(cx - 70), 60, wallBottomAt(cx - 40) - wallTopAt(cx - 70) - 4);
  // Unterer Wulst
  g.lineStyle(5, 0x5a3e2b);
  g.strokePoints(lowerHalf(cx, bottomY, rx - 2, bottomRy - 2), false);

  // Pumpe seitlich am Rand (nur Deko)
  g.fillStyle(0x3d3d3d);
  g.fillRoundedRect(cx + rx - 44, rimY + 70, 44, 54, 8);
  g.fillStyle(0x4cc9f0);
  g.fillCircle(cx + rx - 22, rimY + 88, 7);
  g.fillStyle(0xef476f);
  g.fillCircle(cx + rx - 22, rimY + 108, 4);

  if (front) {
    // Vorderer Wulst
    g.fillStyle(0xd8b98f);
    g.fillPoints([...lowerHalf(cx, rimY, rx + 2, rimRy + 2), ...lowerHalf(cx, rimY + 2, waterRx, waterRy, true)], true);
    g.fillStyle(0xffffff, 0.25);
    g.fillPoints([...lowerHalf(cx, rimY - 1, rx - 10, rimRy - 12), ...lowerHalf(cx, rimY + 2, waterRx + 4, waterRy + 3, true)], true);
    return;
  }
  // Ganzer Wulst und Wasser (von oben gesehen)
  g.fillStyle(0xd8b98f);
  g.fillEllipse(cx, rimY, (rx + 2) * 2, (rimRy + 2) * 2);
  g.fillStyle(0xe9d3b0);
  g.fillEllipse(cx, rimY - 4, (rx - 8) * 2, (rimRy - 10) * 2);
  g.fillStyle(0x2a9d8f);
  g.fillEllipse(cx, rimY + 2, waterRx * 2, waterRy * 2);
  g.fillStyle(0x48cae4);
  g.fillEllipse(cx, rimY + 5, (waterRx - 8) * 2, (waterRy - 6) * 2);
  g.fillStyle(0x90e0ef, 0.7);
  for (let i = 0; i < 5; i++) g.fillEllipse(cx - 100 + i * 50, rimY + (i % 2 ? 8 : -2), 34, 6);
}
