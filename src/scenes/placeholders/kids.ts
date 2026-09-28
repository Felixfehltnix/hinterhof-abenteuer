import Phaser from 'phaser';
import type { CharacterDef } from '../../data/characters';
import { KID_RIG, type PartTexture } from '../../data/poses';

// Platzhalter-Zeichnungen für die Kinder: Einzelteile (kid-<id>-head/-body/-arm/-leg, Maße und
// Drehpunkte in src/data/poses.ts) und Porträt fürs Tor (portrait-<id>).

export const PORTRAIT_SIZE = 130;

// Lage des Gesichtsmittelpunkts im Kopf-Bild (144 × 156): oben Platz für hohe Frisuren
// (Stacheln, Dutt), unten für lange Haare.
const FACE_X = 72;
const FACE_Y = 86;

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

/** Größe eines Teils in Pixeln für dieses Kind. */
export function partSize(c: CharacterDef, part: PartTexture): { width: number; height: number } {
  const rig = Object.values(KID_RIG).find((r) => r.texture === part)!;
  return { width: Math.ceil(rig.width * c.size), height: Math.ceil(rig.height * c.size) };
}

/** Ein Teil der Figur, gezeichnet in seine Bildfläche (Maße aus KID_RIG · size). */
export function drawKidPart(g: G, c: CharacterDef, part: PartTexture): void {
  const s = c.size;
  const k = (v: number) => v * s;
  switch (part) {
    case 'leg':
      g.fillStyle(c.pants);
      g.fillRoundedRect(0, 0, k(24), k(70), k(8));
      break;
    case 'arm':
      g.fillStyle(c.skin);
      g.fillRoundedRect(0, 0, k(22), k(70), k(10));
      break;
    case 'body':
      g.fillStyle(c.shirt);
      g.fillRoundedRect(0, 0, k(80), k(92), k(18));
      break;
    case 'head':
      drawHead(g, c, k(FACE_X), k(FACE_Y), s);
      break;
  }
}

/** Porträt fürs Gartentor: nur der Kopf, alle gleich groß. */
export function drawPortrait(g: G, c: CharacterDef): void {
  drawHead(g, c, PORTRAIT_SIZE / 2, PORTRAIT_SIZE / 2 + 18, 1);
}
