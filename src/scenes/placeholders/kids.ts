import Phaser from 'phaser';
import type { CharacterDef } from '../../data/characters';

// Platzhalter-Zeichnungen für die Kinder: ganze Figur (kid-<id>) und Porträt (portrait-<id>).

export const KID_WIDTH = 140;
// Oben etwas Platz für hohe Frisuren (Stacheln, Dutt).
const TOP = 24;
export const KID_HEIGHT = 240 + TOP;
export const PORTRAIT_SIZE = 130;

type G = Phaser.GameObjects.Graphics;

/** Kopf mit Frisur, Mittelpunkt des Gesichts bei (cx, cy), Maßstab s. */
export function drawHead(g: G, c: CharacterDef, cx: number, cy: number, s: number): void {
  const k = (v: number) => v * s;
  // Haare hinter dem Gesicht
  g.fillStyle(c.hair);
  switch (c.hairStyle) {
    case 'long':
      g.fillCircle(cx, cy - k(12), k(48));
      g.fillRoundedRect(cx - k(48), cy - k(12), k(96), k(78), k(14));
      break;
    case 'pigtails':
      g.fillCircle(cx, cy - k(12), k(48));
      g.fillCircle(cx - k(50), cy + k(8), k(18));
      g.fillCircle(cx + k(50), cy + k(8), k(18));
      break;
    case 'curly':
      for (let i = 0; i < 9; i++) {
        const a = Math.PI + (i / 8) * Math.PI;
        g.fillCircle(cx + Math.cos(a) * k(42), cy - k(8) + Math.sin(a) * k(40), k(17));
      }
      g.fillCircle(cx, cy - k(10), k(44));
      break;
    case 'spiky':
      g.fillCircle(cx, cy - k(12), k(46));
      for (let i = 0; i < 5; i++) {
        const x = cx - k(36) + i * k(18);
        g.fillTriangle(x - k(12), cy - k(40), x + k(12), cy - k(40), x, cy - k(72));
      }
      break;
    case 'bun':
      g.fillCircle(cx, cy - k(12), k(47));
      g.fillCircle(cx, cy - k(62), k(20));
      break;
    case 'short':
      g.fillCircle(cx, cy - k(12), k(48));
      break;
  }
  // Gesicht
  g.fillStyle(c.skin);
  g.fillCircle(cx, cy, k(40));
  // Augen + Lächeln
  g.fillStyle(0x222222);
  g.fillCircle(cx - k(14), cy - k(2), k(5));
  g.fillCircle(cx + k(14), cy - k(2), k(5));
  g.lineStyle(k(4), 0x222222);
  g.beginPath();
  g.arc(cx, cy + k(10), k(14), 0.15 * Math.PI, 0.85 * Math.PI, false);
  g.strokePath();
  // Bäckchen
  g.fillStyle(0xff8fa3, 0.35);
  g.fillCircle(cx - k(24), cy + k(12), k(7));
  g.fillCircle(cx + k(24), cy + k(12), k(7));
}

/** Ganze Figur in der Fläche KID_WIDTH·size × KID_HEIGHT·size. */
export function drawKid(g: G, c: CharacterDef): void {
  const s = c.size;
  const k = (v: number) => v * s;
  const ky = (v: number) => (v + TOP) * s;
  // Beine
  g.fillStyle(c.pants);
  g.fillRoundedRect(k(42), ky(170), k(24), k(70), k(8));
  g.fillRoundedRect(k(74), ky(170), k(24), k(70), k(8));
  // Arme
  g.fillStyle(c.skin);
  g.fillRoundedRect(k(14), ky(100), k(22), k(70), k(10));
  g.fillRoundedRect(k(104), ky(100), k(22), k(70), k(10));
  // Körper
  g.fillStyle(c.shirt);
  g.fillRoundedRect(k(30), ky(92), k(80), k(92), k(18));
  drawHead(g, c, k(70), ky(62), s);
}

/** Porträt fürs Gartentor: nur der Kopf, alle gleich groß. */
export function drawPortrait(g: G, c: CharacterDef): void {
  drawHead(g, c, PORTRAIT_SIZE / 2, PORTRAIT_SIZE / 2 + 18, 1);
}
