import Phaser from 'phaser';
import { CHARACTERS } from '../data/characters';

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
    CHARACTERS.forEach((c) =>
      this.makeTexture(`kid-${c.id}`, 140, 240, (g) => {
        // Beine
        g.fillStyle(c.pants);
        g.fillRoundedRect(42, 170, 24, 70, 8);
        g.fillRoundedRect(74, 170, 24, 70, 8);
        // Arme
        g.fillStyle(c.skin);
        g.fillRoundedRect(14, 100, 22, 70, 10);
        g.fillRoundedRect(104, 100, 22, 70, 10);
        // Körper
        g.fillStyle(c.shirt);
        g.fillRoundedRect(30, 92, 80, 92, 18);
        // Haare + Gesicht
        g.fillStyle(c.hair);
        g.fillCircle(70, 50, 48);
        g.fillStyle(c.skin);
        g.fillCircle(70, 62, 40);
        // Augen + Lächeln
        g.fillStyle(0x222222);
        g.fillCircle(56, 60, 5);
        g.fillCircle(84, 60, 5);
        g.lineStyle(4, 0x222222);
        g.beginPath();
        g.arc(70, 72, 14, 0.15 * Math.PI, 0.85 * Math.PI, false);
        g.strokePath();
      }),
    );

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

    this.makeTexture('ball', 80, 80, (g) => {
      g.fillStyle(0xef476f);
      g.fillCircle(40, 40, 38);
      g.fillStyle(0xffffff);
      g.fillCircle(40, 40, 14);
      g.fillStyle(0xffffff, 0.5);
      g.fillCircle(26, 24, 8);
    });

    this.makeTexture('bucket', 90, 90, (g) => {
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
    });

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
