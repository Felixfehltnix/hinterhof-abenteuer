import Phaser from 'phaser';
import { CHARACTERS } from '../data/characters';
import { TOYS } from '../data/toys';
import { drawKidPart, drawPortrait, partSize, PORTRAIT_SIZE } from './placeholders/kids';
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
    // Hier später: this.load.image('kid-kind-a-head', 'assets/kinder/kind-a/head.png'); usw.
    // (Format der Einzelteile: README, Abschnitt „Echte Figuren“)
  }

  create(): void {
    CHARACTERS.forEach((c) => {
      for (const part of ['head', 'body', 'arm', 'leg'] as const) {
        const { width, height } = partSize(c, part);
        this.makeTexture(`kid-${c.id}-${part}`, width, height, (g) => drawKidPart(g, c, part));
      }
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

    this.makeTexture('star', 28, 28, (g) => {
      g.fillStyle(0xffd166);
      g.fillPoints(starPoints(14, 14, 13, 6), true);
    });

    this.makeTexture('can', 40, 56, (g) => {
      g.fillStyle(0xadb5bd);
      g.fillRoundedRect(0, 0, 40, 56, 6);
      g.fillStyle(0xe63946);
      g.fillRect(0, 12, 40, 32);
      g.fillStyle(0xffffff);
      g.fillCircle(20, 28, 8);
    });

    this.makeTexture('pin', 30, 72, (g) => {
      g.fillStyle(0xffffff);
      g.fillEllipse(15, 50, 28, 42);
      g.fillCircle(15, 14, 11);
      g.fillRect(10, 18, 10, 18);
      g.fillStyle(0xe63946);
      g.fillRect(9, 24, 12, 4);
      g.fillRect(9, 31, 12, 4);
    });

    this.makeTexture('hoop-net', 96, 60, (g) => {
      g.lineStyle(3, 0xffffff, 0.95);
      for (let i = 0; i <= 6; i++) {
        g.lineBetween(4 + i * 14.6, 0, 20 + i * 9.3, 60);
      }
      for (let y = 15; y <= 60; y += 15) {
        const inset = (y / 60) * 16;
        g.lineBetween(4 + inset, y, 92 - inset, y);
      }
    });

    this.makeTexture('wheel', 44, 44, (g) => {
      g.fillStyle(0x2b2d42);
      g.fillCircle(22, 22, 22);
      g.fillStyle(0xadb5bd);
      g.fillCircle(22, 22, 10);
      g.lineStyle(4, 0xadb5bd);
      g.lineBetween(22, 4, 22, 40);
      g.lineBetween(4, 22, 40, 22);
    });

    this.makeTexture('seesaw-beam', 330, 22, (g) => {
      g.fillStyle(0xe76f51);
      g.fillRoundedRect(0, 0, 330, 22, 10);
      g.fillStyle(0x2b2d42);
      g.fillRoundedRect(22, -2, 12, 10, 4);
      g.fillRoundedRect(296, -2, 12, 10, 4);
    });

    // Vorderer Rand des Planschbeckens mit halbdurchsichtigem Wasser: liegt über Kindern
    // und Spielzeug im Becken, damit sie „im Wasser“ sitzen.
    this.makeTexture('pool-front', 320, 100, (g) => {
      const half = (cx: number, cy: number, rx: number, ry: number, reverse = false) => {
        const pts: Phaser.Math.Vector2[] = [];
        for (let i = 0; i <= 24; i++) {
          const a = (i / 24) * Math.PI;
          pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry));
        }
        return reverse ? pts.reverse() : pts;
      };
      g.fillStyle(0x8ecae6, 0.6);
      g.fillPoints(half(160, 46, 138, 35), true);
      g.fillStyle(0x4d96ff);
      g.fillPoints([...half(160, 50, 158, 48), ...half(160, 46, 138, 35, true)], true);
    });

    // Vorderer Rand des Whirlpools (über den Kindern, Wasser halbdurchsichtig)
    this.makeTexture('whirlpool-front', 360, 130, (g) => {
      const half = (cx: number, cy: number, rx: number, ry: number, reverse = false) => {
        const pts: Phaser.Math.Vector2[] = [];
        for (let i = 0; i <= 28; i++) {
          const a = (i / 28) * Math.PI;
          pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry));
        }
        return reverse ? pts.reverse() : pts;
      };
      g.fillStyle(0x48cae4, 0.55);
      g.fillPoints(half(180, 62, 150, 40), true);
      g.fillStyle(0xf1faee);
      g.fillPoints([...half(180, 70, 178, 58), ...half(180, 64, 158, 45, true)], true);
      g.fillStyle(0x2a9d8f);
      g.fillPoints([...half(180, 70, 178, 58), ...half(180, 70, 178, 50, true)], true);
    });

    this.makeTexture('drop', 10, 14, (g) => {
      g.fillStyle(0x4cc9f0);
      g.fillCircle(5, 9, 5);
      g.fillTriangle(1, 8, 9, 8, 5, 0);
    });

    this.makeTexture('bucket-sand', 72, 26, (g) => {
      g.fillStyle(0xe9c46a);
      g.fillEllipse(36, 18, 72, 16);
      g.fillEllipse(36, 12, 50, 24);
    });

    this.makeTexture('sandcake', 72, 44, (g) => {
      g.fillStyle(0xd4a373);
      g.fillPoints(
        [new Phaser.Math.Vector2(14, 0), new Phaser.Math.Vector2(58, 0), new Phaser.Math.Vector2(70, 40), new Phaser.Math.Vector2(2, 40)],
        true,
      );
      g.fillStyle(0xe9c46a);
      for (let i = 0; i < 6; i++) g.fillCircle(8 + i * 11.2, 38, 7);
      g.fillStyle(0xf4d9a4);
      g.fillEllipse(36, 3, 40, 8);
    });

    const flowerColors = [0xff70a6, 0xffd166, 0x9b5de5, 0xff9770];
    flowerColors.forEach((color, i) =>
      this.makeTexture(`flower-${i}`, 40, 60, (g) => {
        g.lineStyle(4, 0x2d6a4f);
        g.lineBetween(20, 24, 20, 60);
        g.fillStyle(0x40916c);
        g.fillEllipse(28, 46, 14, 7);
        g.fillStyle(color);
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2;
          g.fillCircle(20 + Math.cos(a) * 9, 18 + Math.sin(a) * 9, 7);
        }
        g.fillStyle(0xffffff);
        g.fillCircle(20, 18, 5);
      }),
    );

    this.makeTexture('note', 30, 42, (g) => {
      g.fillStyle(0xffffff);
      g.fillEllipse(10, 34, 20, 14);
      g.fillRect(16, 4, 5, 32);
      g.fillTriangle(21, 4, 30, 12, 21, 18);
    });

    // Lichtkegel der Taschenlampe (wird additiv über die Szene geblendet)
    this.makeTexture('lightcone', 340, 200, (g) => {
      for (let i = 10; i >= 1; i--) {
        const r = i / 10;
        g.fillStyle(0xfff3b0, 0.06);
        g.fillTriangle(0, 100, 340 * r, 100 - 100 * r, 340 * r, 100 + 100 * r);
      }
    });

    this.makeTexture('sun', 180, 180, (g) => {
      g.fillStyle(0xffffff, 0.25);
      g.fillCircle(90, 90, 90);
      g.fillStyle(0xffffff);
      g.fillCircle(90, 90, 70);
    });

    this.makeTexture('moon', 150, 150, (g) => {
      g.fillStyle(0xfff8dc, 0.18);
      g.fillCircle(75, 75, 75);
      g.fillStyle(0xfff3c4);
      g.fillCircle(75, 75, 55);
      g.fillStyle(0xe9dca4);
      g.fillCircle(55, 62, 11);
      g.fillCircle(88, 92, 8);
      g.fillCircle(92, 55, 6);
    });

    this.makeTexture('cloud', 240, 120, (g) => {
      g.fillStyle(0xf4faff);
      g.fillCircle(60, 70, 45);
      g.fillCircle(115, 50, 55);
      g.fillCircle(175, 70, 45);
      g.fillRect(60, 70, 115, 45);
    });

    // Kleiner Funkelstern (Sterne nachts, Tau morgens)
    this.makeTexture('twinkle', 20, 20, (g) => {
      g.fillStyle(0xffffff);
      g.fillPoints(starPoints(10, 10, 10, 3.5), true);
    });

    // Glühbirne der Lichterkette (weiß, wird eingefärbt und additiv geblendet)
    this.makeTexture('bulb', 36, 36, (g) => {
      g.fillStyle(0xffffff, 0.25);
      g.fillCircle(18, 18, 18);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(18, 18, 7);
    });

    this.makeTexture('raindrop', 4, 22, (g) => {
      g.fillStyle(0xcfe8ff);
      g.fillRoundedRect(0, 0, 4, 22, 2);
    });

    this.makeTexture('puddle', 220, 64, (g) => {
      g.fillStyle(0x6fa8dc, 0.85);
      g.fillEllipse(110, 32, 220, 64);
      g.fillStyle(0xa9d6f5, 0.9);
      g.fillEllipse(96, 26, 150, 34);
      g.fillStyle(0xffffff, 0.6);
      g.fillEllipse(70, 20, 50, 8);
    });

    this.makeTexture('rainbow', 1000, 500, (g) => {
      const colors = [0xff595e, 0xff924c, 0xffca3a, 0x8ac926, 0x1982c4, 0x4267ac, 0x6a4c93];
      colors.forEach((c, i) => {
        g.lineStyle(26, c, 0.8);
        g.beginPath();
        g.arc(500, 500, 480 - i * 26, Math.PI, 0, false);
        g.strokePath();
      });
    });

    this.makeTexture('leaf', 26, 16, (g) => {
      g.fillStyle(0xffffff);
      g.fillEllipse(13, 8, 26, 14);
      g.lineStyle(2, 0xdddddd);
      g.lineBetween(2, 8, 24, 8);
    });

    this.makeTexture('snowflake', 14, 14, (g) => {
      g.fillStyle(0xffffff, 0.35);
      g.fillCircle(7, 7, 7);
      g.fillStyle(0xffffff);
      g.fillCircle(7, 7, 4);
    });

    // Mütze (weiß, wird in der Pulli-Farbe des Kindes eingefärbt)
    this.makeTexture('beanie', 100, 62, (g) => {
      g.fillStyle(0xffffff);
      g.slice(50, 58, 46, Math.PI, 0, false);
      g.fillPath();
      g.fillRoundedRect(2, 46, 96, 16, 7);
      g.fillCircle(50, 10, 10);
      g.fillStyle(0xdddddd);
      for (let x = 10; x < 95; x += 12) g.fillRect(x, 48, 4, 12);
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
