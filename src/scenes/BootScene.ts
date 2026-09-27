import Phaser from 'phaser';
import { CHARACTERS } from '../data/characters';
import { TOYS } from '../data/toys';
import { drawKid, drawPortrait, KID_HEIGHT, KID_WIDTH, PORTRAIT_SIZE } from './placeholders/kids';
import { TOY_PLACEHOLDERS } from './placeholders/toys';

// Erzeugt Platzhalter-Grafiken per Code, damit das Spiel ohne Asset-Dateien läuft.
// Sobald echte Grafiken da sind: PNGs nach public/assets/ legen, hier in preload()
// mit this.load.image(key, 'assets/…png') laden und die passende make…-Funktion löschen.
// Die Texture-Keys bleiben gleich, der Rest des Codes merkt davon nichts.

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    // Hier später: this.load.image('kid-kind-a', 'assets/kinder/kind-a.png'); usw.
  }

  create(): void {
    CHARACTERS.forEach((c) => {
      this.makeTexture(`kid-${c.id}`, KID_WIDTH * c.size, KID_HEIGHT * c.size, (g) => drawKid(g, c));
      this.makeTexture(`portrait-${c.id}`, PORTRAIT_SIZE, PORTRAIT_SIZE, (g) => drawPortrait(g, c));
    });

    this.makeTexture('gate', 200, 150, (g) => {
      // Pfosten
      g.fillStyle(0x8d6e63);
      g.fillRoundedRect(0, 0, 22, 150, 6);
      g.fillRoundedRect(178, 0, 22, 150, 6);
      // Durchgang (dahinter sieht man den Weg)
      g.fillStyle(0xd7ccc8);
      g.fillRect(22, 20, 156, 130);
      g.fillStyle(0xbcaaa4);
      g.fillRect(60, 60, 80, 90);
    });

    this.makeTexture('gate-door', 156, 124, (g) => {
      g.fillStyle(0xe9c46a);
      for (let x = 0; x < 156; x += 26) g.fillRoundedRect(x + 2, 0, 22, 124, { tl: 11, tr: 11, bl: 0, br: 0 });
      g.fillStyle(0xd4a373);
      g.fillRect(0, 30, 156, 14);
      g.fillRect(0, 88, 156, 14);
      // Herz
      g.fillStyle(0xef476f);
      g.fillCircle(70, 62, 10);
      g.fillCircle(86, 62, 10);
      g.fillTriangle(61, 66, 95, 66, 78, 84);
    });

    this.makeTexture('slide', 400, 420, (g) => {
      // Leiter
      g.lineStyle(12, 0x8d6e63);
      g.lineBetween(55, 60, 55, 420);
      g.lineBetween(105, 60, 105, 420);
      g.lineStyle(8, 0xa1887f);
      for (let y = 100; y < 420; y += 45) g.lineBetween(55, y, 105, y);
      // Stütze
      g.lineStyle(12, 0x8d6e63);
      g.lineBetween(300, 250, 300, 420);
      // Plattform
      g.fillStyle(0xffb703);
      g.fillRoundedRect(40, 45, 130, 22, 6);
      // Rutschfläche
      g.lineStyle(38, 0xfb5607);
      g.lineBetween(160, 62, 385, 392);
      g.lineStyle(8, 0xffd166);
      g.lineBetween(160, 45, 390, 375);
    });

    this.makeTexture('swing-frame', 360, 420, (g) => {
      g.lineStyle(16, 0x6d4c41);
      g.lineBetween(20, 420, 60, 22);
      g.lineBetween(100, 420, 60, 22);
      g.lineBetween(260, 420, 300, 22);
      g.lineBetween(340, 420, 300, 22);
      g.lineStyle(20, 0x5d4037);
      g.lineBetween(40, 20, 320, 20);
    });

    this.makeTexture('sandbox', 360, 120, (g) => {
      g.fillStyle(0x8d6e63);
      g.fillRoundedRect(0, 20, 360, 100, 14);
      g.fillStyle(0xf6d186);
      g.fillRoundedRect(16, 34, 328, 72, 10);
      g.fillStyle(0xe9c46a);
      g.fillCircle(120, 70, 22);
      g.fillCircle(240, 60, 16);
    });

    this.makeTexture('tree', 300, 460, (g) => {
      g.fillStyle(0x795548);
      g.fillRoundedRect(125, 220, 50, 240, 12);
      g.fillStyle(0x2d6a4f);
      g.fillCircle(150, 130, 110);
      g.fillStyle(0x40916c);
      g.fillCircle(90, 170, 80);
      g.fillCircle(210, 170, 80);
      g.fillCircle(150, 90, 80);
      g.fillStyle(0xe63946);
      g.fillCircle(110, 150, 12);
      g.fillCircle(200, 120, 12);
      g.fillCircle(170, 200, 12);
    });

    this.makeTexture('toybox', 210, 140, (g) => {
      g.fillStyle(0xc0392b);
      g.fillRoundedRect(0, 0, 210, 140, 16);
      g.fillStyle(0xe74c3c);
      g.fillRoundedRect(10, 10, 190, 120, 12);
      g.fillStyle(0xffd166);
      g.fillRect(0, 60, 210, 20);
      // Stern vorne drauf
      g.fillStyle(0xffffff);
      g.fillPoints(starPoints(105, 70, 34, 15), true);
    });

    this.makeTexture('toybox-lid', 220, 36, (g) => {
      g.fillStyle(0xa93226);
      g.fillRoundedRect(0, 0, 220, 36, 12);
      g.fillStyle(0xffd166);
      g.fillRoundedRect(95, 22, 30, 14, 4);
    });

    this.makeTexture('bubble', 60, 60, (g) => {
      g.fillStyle(0xffffff, 0.18);
      g.fillCircle(30, 30, 28);
      g.lineStyle(3, 0xffffff, 0.85);
      g.strokeCircle(30, 30, 27);
      g.fillStyle(0xffffff, 0.9);
      g.fillEllipse(20, 18, 12, 8);
    });

    TOYS.forEach((t) => this.makeTexture(t.id, t.width, t.height, TOY_PLACEHOLDERS[t.id]));

    this.scene.start('Playground');
  }

  private makeTexture(
    key: string,
    width: number,
    height: number,
    draw: (g: Phaser.GameObjects.Graphics) => void,
  ): void {
    if (this.textures.exists(key)) return; // echte Grafik wurde in preload() geladen
    const g = this.add.graphics();
    draw(g);
    g.generateTexture(key, width, height);
    g.destroy();
  }
}

function starPoints(cx: number, cy: number, outer: number, inner: number): Phaser.Math.Vector2[] {
  const points: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  return points;
}
