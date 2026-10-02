import Phaser from 'phaser';
import { EARTH, ROCK_SIZES, SHOT, type RockSize } from '../../data/asteroids';

// Sternenflug: Asteroiden (3 Größen × mehrere Formen), Schuss-Stern, Erde (Rückweg), goldener Stern.

type G = Phaser.GameObjects.Graphics;
const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

/** Rand um die Zeichnung (Umriss und Glanz passen hinein). */
const PAD = 8;

/** Texturgröße eines Asteroiden (quadratisch). */
export function rockTextureSize(size: RockSize): number {
  return Math.ceil(ROCK_SIZES[size].radius * 2 + PAD * 2);
}

/** Feste Zufallsfolge, damit jede Form immer gleich aussieht. */
function seeded(seed: number): () => number {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const ROCK_COLORS = [
  { base: 0x9a8c7e, dark: 0x6f6359, light: 0xc2b5a6 },
  { base: 0x8d8a9e, dark: 0x625f74, light: 0xb8b5c8 },
  { base: 0xa08672, dark: 0x735d4c, light: 0xc9b09a },
];

/** Freundlicher Weltraum-Stein: knubbelig rund, mit Kratern und Glanz oben links. */
export function drawRock(g: G, size: RockSize, shape: number): void {
  const r = ROCK_SIZES[size].radius;
  const c = rockTextureSize(size) / 2;
  const rnd = seeded(shape * 31 + size * 7 + 3);
  const col = ROCK_COLORS[shape % ROCK_COLORS.length];

  // Umriss: Kreis mit sanften Beulen
  const n = 14;
  const bumps = Array.from({ length: n }, () => 0.84 + rnd() * 0.16);
  const outline = (scale: number) => {
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < n * 3; i++) {
      const a = (i / (n * 3)) * Math.PI * 2;
      const f = i / 3;
      const i0 = Math.floor(f) % n;
      const i1 = (i0 + 1) % n;
      const t = f - Math.floor(f);
      const k = bumps[i0] + (bumps[i1] - bumps[i0]) * (0.5 - 0.5 * Math.cos(t * Math.PI));
      pts.push(v(c + Math.cos(a) * r * k * scale, c + Math.sin(a) * r * k * scale));
    }
    return pts;
  };
  g.fillStyle(col.dark);
  g.fillPoints(outline(1), true);
  g.fillStyle(col.base);
  g.fillPoints(
    outline(0.93).map((p) => v(p.x - r * 0.03, p.y - r * 0.03)),
    true,
  );
  // Glanz oben links
  g.fillStyle(col.light, 0.7);
  g.fillEllipse(c - r * 0.35, c - r * 0.38, r * 0.7, r * 0.42);

  // Krater
  const count = size === 2 ? 2 : 4;
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2;
    const d = rnd() * r * 0.5;
    const cr = r * (0.12 + rnd() * 0.12);
    const x = c + Math.cos(a) * d;
    const y = c + Math.sin(a) * d;
    g.fillStyle(col.dark);
    g.fillCircle(x, y, cr);
    g.fillStyle(col.light, 0.5);
    g.fillCircle(x - cr * 0.3, y - cr * 0.3, cr * 0.5);
  }
}

export const SHOT_SIZE = { width: SHOT.radius * 3, height: SHOT.radius * 3 };

/** Fünfzackiger Stern (Mitte cx/cy, Außenradius r). */
function starPoints(cx: number, cy: number, r: number, inner = 0.45): Phaser.Math.Vector2[] {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const d = i % 2 === 0 ? r : r * inner;
    pts.push(v(cx + Math.cos(a) * d, cy + Math.sin(a) * d));
  }
  return pts;
}

/** Schuss: leuchtender gelber Stern mit weichem Schein. */
export function drawShot(g: G): void {
  const { width: w } = SHOT_SIZE;
  const c = w / 2;
  g.fillStyle(0xfff3b0, 0.25);
  g.fillCircle(c, c, w / 2);
  g.fillStyle(0xfff3b0, 0.4);
  g.fillCircle(c, c, w / 3);
  g.fillStyle(0xffd166);
  g.fillPoints(starPoints(c, c, SHOT.radius), true);
  g.fillStyle(0xffffff);
  g.fillPoints(starPoints(c, c, SHOT.radius * 0.45), true);
}

export const GOLD_STAR_SIZE = 64;

/** Goldener Stern für eine geschaffte Welle. */
export function drawGoldStar(g: G): void {
  const c = GOLD_STAR_SIZE / 2;
  g.fillStyle(0xb8860b);
  g.fillPoints(starPoints(c, c + 2, c - 2), true);
  g.fillStyle(0xffd166);
  g.fillPoints(starPoints(c, c, c - 4), true);
  g.fillStyle(0xffffff, 0.5);
  g.fillCircle(c - 6, c - 6, 5);
}

export const EARTH_SIZE = EARTH.radius * 2 + 24;

/** Die Erde (Rückweg zur Wiese): blau mit grünen Kontinenten, Wolken und Lichtschein. */
export function drawEarth(g: G): void {
  const c = EARTH_SIZE / 2;
  const r = EARTH.radius;
  g.fillStyle(0x8ecae6, 0.25);
  g.fillCircle(c, c, r + 12);
  g.fillStyle(0x2a7fd4);
  g.fillCircle(c, c, r);
  // Kontinente (Blobs aus Kreisen)
  g.fillStyle(0x52b04a);
  for (const [dx, dy, s] of [
    [-0.35, -0.3, 0.32],
    [-0.15, -0.45, 0.22],
    [-0.42, 0.05, 0.2],
    [0.3, 0.2, 0.3],
    [0.45, -0.05, 0.2],
    [0.15, 0.45, 0.18],
  ]) {
    g.fillCircle(c + dx * r, c + dy * r, s * r);
  }
  // Wolken
  g.fillStyle(0xffffff, 0.75);
  g.fillEllipse(c - r * 0.1, c + r * 0.05, r * 0.6, r * 0.14);
  g.fillEllipse(c + r * 0.35, c - r * 0.45, r * 0.4, r * 0.12);
  g.fillEllipse(c - r * 0.3, c + r * 0.55, r * 0.45, r * 0.12);
  // Schatten rechts unten, Glanz links oben
  g.fillStyle(0x000000, 0.18);
  g.fillCircle(c + r * 0.14, c + r * 0.14, r * 0.8);
  g.fillStyle(0xffffff, 0.25);
  g.fillCircle(c - r * 0.42, c - r * 0.42, r * 0.22);
}
