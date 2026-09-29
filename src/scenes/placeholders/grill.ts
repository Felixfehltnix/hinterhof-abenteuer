import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config';
import { FOODS, type FoodId } from '../../data/grill';

// Grill-Spiel (#66): Hintergrund (Felix' Garten), Grill mit Rost und Ablagen, Grillgut in
// 5 Garstufen, Teller, Soßenflaschen, Wischtuch, Bestellkarte. Alles in Bildschirmkoordinaten 1920 × 1080.

type G = Phaser.GameObjects.Graphics;
const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

/** Aufteilung des Bildes. */
export const GRILL = {
  /** Kochfläche des Rosts: Grillgut, das hier liegt, wird gar. */
  grate: { left: 600, right: 1320, top: 650, bottom: 950 },
  /** Linke Ablage zum Anrichten, rechte mit dem Vorrat. */
  shelfL: { left: 16, right: 560, top: 720, bottom: 1010 },
  shelfR: { left: 1360, right: 1904, top: 720, bottom: 1010 },
  /** Teller (Mitte); Gerichte liegen frei darauf. */
  plate: { x: 330, y: 885, w: 460, h: 200 },
  /** Soßenflaschen (Fußpunkt) hinten links auf der Ablage. */
  bottles: { ketchup: { x: 62, y: 782 }, mustard: { x: 128, y: 782 } },
  /** Wischtuch, hängt vorn über der linken Ablage (Mitte). */
  cloth: { x: 470, y: 1034 },
  /** Vorratsschalen auf der rechten Ablage (Mitte). */
  sources: {
    sausage: { x: 1500, y: 800 },
    bun: { x: 1760, y: 800 },
    baguette: { x: 1500, y: 935 },
    cheese: { x: 1760, y: 935 },
  } as Record<FoodId, { x: number; y: number }>,
  /** Holzschild mit Pfeil am Baum links: zurück auf die Wiese. */
  exit: { x: 30, y: 300, w: 200, h: 110 },
  /** Wo das bestellende Kind steht (Fußpunkt) und die Warteschlange dahinter. */
  front: { x: 960, y: 690, scale: 1.3 },
  queue: [
    { x: 1330, y: 640, scale: 1 },
    { x: 1500, y: 632, scale: 0.94 },
    { x: 1660, y: 624, scale: 0.88 },
    { x: 1800, y: 618, scale: 0.84 },
  ],
  /** Bestellkarte: hängt mit einer Klammer an der Pergola (Klammer oben Mitte). */
  card: { x: 960, y: 96, h: 196, cell: 250, gap: 40, pad: 30 },
};

// --- Hintergrund: Blick aus Felix' Garten auf die Wiese ------------------------------------

/**
 * Man steht in Felix' Garten unter der Pergola am Grill und schaut auf die Wiese: Himmel, am
 * Horizont Hecke und die roten Backsteinhäuser, davor Rasen (dort stehen die Kinder). Links ein
 * Stück vom dicken Baumstamm mit einem Holzschild (Pfeil) – der Weg zurück auf die Wiese.
 */
export function drawGrillBackground(g: G): void {
  const W = GAME_WIDTH;
  const horizon = 430;
  // Himmel am späten Nachmittag
  g.fillGradientStyle(0x8ecdf7, 0x8ecdf7, 0xffe0b0, 0xffe0b0, 1);
  g.fillRect(0, 0, W, horizon + 20);
  // Weit hinten die roten Backsteinhäuser
  const houses: [number, number, number][] = [
    [120, 260, 180], [420, 300, 150], [700, 240, 200], [1000, 320, 140], [1260, 260, 190], [1560, 300, 160], [1800, 250, 180],
  ];
  for (const [x, w, h] of houses) {
    const top = horizon - h;
    g.fillStyle(0xb4533c);
    g.fillRect(x - w / 2, top + 50, w, h - 50);
    g.fillStyle(0x8a3a28);
    g.fillTriangle(x - w / 2 - 12, top + 54, x + w / 2 + 12, top + 54, x, top);
    g.fillStyle(0xf5f3ee);
    for (let wx = x - w / 2 + 24; wx < x + w / 2 - 30; wx += 56) g.fillRect(wx, top + 76, 26, 32);
  }
  // Hecke am Horizont
  const hedge = [0x3f7d3a, 0x4f9444, 0x2c5e33, 0xc0392b, 0xe07b2a];
  for (let i = 0; i < 90; i++) {
    g.fillStyle(hedge[i % 7 === 0 ? 3 + (i % 2) : i % 3]);
    g.fillCircle((i * 23) % W, horizon - 6 + ((i * 7) % 18), 28 + (i % 4) * 5);
  }
  // Wiese bis ganz nach vorn (dort stehen die Kinder)
  g.fillStyle(0x6cbf55);
  g.fillRect(0, horizon + 10, W, GAME_HEIGHT - horizon);
  g.fillStyle(0x5fae4b);
  g.fillRect(0, horizon + 10, W, 22);
  g.fillStyle(0xa3bf66, 0.6);
  for (const [x, y, w] of [[380, 520, 220], [1500, 500, 260], [1100, 560, 180], [250, 600, 160], [1750, 580, 200]]) g.fillEllipse(x, y, w, w * 0.2);
  g.lineStyle(2, 0x58a844, 0.8);
  for (let i = 0; i < 260; i++) {
    const x = (i * 71) % W;
    const y = horizon + 30 + ((i * 37) % 200);
    g.lineBetween(x, y, x - 3, y - 7);
    g.lineBetween(x, y, x + 3, y - 8);
  }
  g.fillStyle(0xffffff);
  for (let i = 0; i < 30; i++) g.fillCircle((i * 131) % W, horizon + 40 + ((i * 53) % 180), 4);

  // Links ein Stück vom dicken Baumstamm mit Efeu
  g.fillStyle(0x6e6258);
  g.fillRect(0, 0, 130, 720);
  g.lineStyle(3, 0x4a4038);
  for (let x = 12; x < 130; x += 16) g.lineBetween(x, 0, x + 4, 720);
  const ivy = [0x2e6b3a, 0x3c8446, 0x4f9a52];
  for (let y = 20; y < 700; y += 14) {
    g.fillStyle(ivy[(y / 14) % 3 | 0]);
    g.fillCircle(100 + Math.sin(y / 40) * 30, y, 9);
    g.fillCircle(108 + Math.sin(y / 40) * 30, y + 6, 7);
  }
  // Holzschild mit gemaltem Pfeil nach links: hier geht es zurück auf die Wiese
  const E = GRILL.exit;
  g.lineStyle(4, 0x5a4636);
  g.lineBetween(E.x + 40, E.y - 20, E.x + 40, E.y + 10);
  g.lineBetween(E.x + E.w - 40, E.y - 20, E.x + E.w - 40, E.y + 10);
  g.fillStyle(0x7a5536);
  g.fillRoundedRect(E.x + 4, E.y + 6, E.w, E.h, 14);
  g.fillStyle(0xb07f47);
  g.fillRoundedRect(E.x, E.y, E.w, E.h, 14);
  g.lineStyle(2, 0x8a5a2b, 0.7);
  for (let y = E.y + 22; y < E.y + E.h - 10; y += 22) g.lineBetween(E.x + 12, y, E.x + E.w - 12, y);
  g.fillStyle(0x2d6a4f);
  const cy = E.y + E.h / 2;
  g.fillPoints([v(E.x + 26, cy), v(E.x + 86, cy - 38), v(E.x + 86, cy - 16), v(E.x + E.w - 26, cy - 16), v(E.x + E.w - 26, cy + 16), v(E.x + 86, cy + 16), v(E.x + 86, cy + 38)], true);

  // Pergola-Balken mit wildem Wein oben (der Grill steht darunter)
  g.fillStyle(0x9a7552);
  g.fillRect(0, 60, W, 30);
  const vine = [0xc0392b, 0xd9483b, 0xe67e22, 0xf39c12, 0x4f8a3c, 0x6a9a3a];
  for (let i = 0; i < 520; i++) {
    const x = (i * 37) % W;
    const y = 30 + ((i * 29) % 90) + (i % 7 === 0 ? 60 : 0);
    g.fillStyle(vine[i % vine.length]);
    g.fillCircle(x, y, 9);
    g.fillCircle(x + 7, y + 5, 7);
  }
  // Lichterkette in Bögen
  g.lineStyle(2, 0x2b2b2b);
  const pts: Phaser.Math.Vector2[] = [];
  for (let x = 0; x <= W; x += 16) pts.push(v(x, 150 + Math.sin(((x % 320) / 320) * Math.PI) * 40));
  g.strokePoints(pts);
  for (let x = 20; x < W; x += 40) {
    const y = 150 + Math.sin(((x % 320) / 320) * Math.PI) * 40;
    g.fillStyle(0x3a3a3a);
    g.fillRect(x - 3, y, 6, 8);
    g.fillStyle(0xfff3c4);
    g.fillEllipse(x, y + 16, 12, 16);
  }
}

// --- Grill mit Deckel, Rost und Ablagen (liegt vor den Kindern) ------------------------

export function drawGrillFront(g: G): void {
  const R = GRILL.grate;
  // Aufgeklappter Deckel hinter dem Rost, flach nach hinten gekippt (verdeckt nur die Beine der Kinder)
  g.fillStyle(0x1a1a1a);
  g.fillRoundedRect(R.left - 50, 588, R.right - R.left + 100, 90, { tl: 40, tr: 40, bl: 0, br: 0 });
  g.fillStyle(0x2e2e2e);
  g.fillRoundedRect(R.left - 30, 602, R.right - R.left + 60, 66, { tl: 30, tr: 30, bl: 0, br: 0 });
  g.fillStyle(0xa3aab1);
  g.fillRoundedRect(R.left + 200, 592, R.right - R.left - 400, 9, 4);
  // Grillwanne mit glühender Kohle
  g.fillStyle(0x111111);
  g.fillRect(R.left - 40, R.top - 20, R.right - R.left + 80, R.bottom - R.top + 40);
  g.fillStyle(0x3a120a);
  g.fillRect(R.left - 16, R.top, R.right - R.left + 32, R.bottom - R.top);
  const coal = [0xff6b1a, 0xe8490f, 0xffa24a, 0x8c2a0e];
  for (let i = 0; i < 260; i++) {
    const x = R.left + ((i * 83) % (R.right - R.left));
    const y = R.top + 8 + ((i * 47) % (R.bottom - R.top - 16));
    g.fillStyle(coal[i % coal.length], 0.9);
    g.fillCircle(x, y, 7 + (i % 3) * 3);
  }
  // Rost: dicke Stäbe mit Glanz
  for (let x = R.left - 8; x <= R.right + 8; x += 36) {
    g.fillStyle(0x3b3b3b);
    g.fillRect(x - 5, R.top - 6, 10, R.bottom - R.top + 12);
    g.fillStyle(0x6c6c6c);
    g.fillRect(x - 5, R.top - 6, 3, R.bottom - R.top + 12);
  }
  g.fillStyle(0x3b3b3b);
  g.fillRect(R.left - 16, R.top - 10, R.right - R.left + 32, 10);
  g.fillRect(R.left - 16, R.bottom, R.right - R.left + 32, 10);
  // Grillkörper vorn mit Knöpfen
  g.fillStyle(0x1c1c1c);
  g.fillRect(R.left - 60, R.bottom + 20, R.right - R.left + 120, GAME_HEIGHT - R.bottom - 20);
  g.fillStyle(0xa3aab1);
  g.fillRect(R.left - 60, R.bottom + 20, R.right - R.left + 120, 26);
  g.fillStyle(0x111111);
  for (let i = 0; i < 4; i++) g.fillCircle(R.left + 120 + i * ((R.right - R.left - 240) / 3), R.bottom + 33, 10);
  // Ablagen (Edelstahl mit Holzbrett)
  for (const S of [GRILL.shelfL, GRILL.shelfR]) {
    g.fillStyle(0x2a2a2a);
    g.fillRect(S.left + 30, S.bottom, 16, GAME_HEIGHT - S.bottom);
    g.fillRect(S.right - 46, S.bottom, 16, GAME_HEIGHT - S.bottom);
    g.fillStyle(0xa3aab1);
    g.fillRoundedRect(S.left, S.top, S.right - S.left, S.bottom - S.top, 14);
    g.fillStyle(0x80878e);
    g.fillRect(S.left, S.bottom - 18, S.right - S.left, 18);
    g.fillStyle(0xc9975c);
    g.fillRoundedRect(S.left + 16, S.top + 14, S.right - S.left - 32, S.bottom - S.top - 44, 10);
    g.lineStyle(2, 0xb07f47, 0.7);
    for (let y = S.top + 40; y < S.bottom - 40; y += 26) g.lineBetween(S.left + 24, y, S.right - 24, y);
  }
  // Vorratsschalen
  for (const id of ['sausage', 'bun', 'baguette', 'cheese'] as FoodId[]) {
    const p = GRILL.sources[id];
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(p.x + 6, p.y + 34, 230, 60);
    g.fillStyle(id === 'bun' || id === 'baguette' ? 0xb07f47 : 0xe9ecef);
    g.fillEllipse(p.x, p.y + 20, 226, 90);
    g.fillStyle(id === 'bun' || id === 'baguette' ? 0x8a5a2b : 0xcfd4da);
    g.fillEllipse(p.x, p.y + 10, 196, 64);
  }
}

// --- Grillgut in 5 Garstufen -------------------------------------------------------------

const COLORS: Record<FoodId | 'buncut', number[]> = {
  sausage: [0xf2a6a0, 0xe39370, 0xb86a3c, 0x8a4a24, 0x2b1d17],
  bun: [0xf3dcae, 0xe9c07c, 0xd49a52, 0xa8682f, 0x2e2118],
  baguette: [0xf2dcaa, 0xe8c27e, 0xd5a050, 0xa76a2e, 0x2e2118],
  cheese: [0xf7f3e6, 0xf2e3b8, 0xe6c37a, 0xb8864a, 0x3a2a1c],
  buncut: [0xf3dcae, 0xe9c07c, 0xd49a52, 0xa8682f, 0x2e2118],
};

function grillMarks(g: G, w: number, h: number, stage: number): void {
  if (stage < 2) return;
  g.lineStyle(Math.max(4, h * 0.12), stage >= 4 ? 0x0f0a08 : 0x4a2412, stage >= 3 ? 0.8 : 0.6);
  for (let x = 16; x < w; x += 30) g.lineBetween(x, h * 0.15, x - 14, h * 0.85);
}

/** Verkohlt: dunkle Flecken und glimmende Stellen. */
function charred(g: G, w: number, h: number, stage: number): void {
  if (stage < 4) return;
  g.fillStyle(0x0f0a08);
  for (let i = 0; i < 6; i++) g.fillEllipse((w * (i + 0.5)) / 6, h * (0.3 + (i % 2) * 0.35), w / 7, h / 4);
  g.fillStyle(0xff6b1a, 0.7);
  g.fillCircle(w * 0.3, h * 0.55, 3);
  g.fillCircle(w * 0.7, h * 0.4, 2.5);
}

/** Grillgut wird größer gezeichnet als in FOODS angegeben (gut zu greifen und zu erkennen). */
export const FOOD_SCALE = 1.3;

function baseSize(id: FoodId | 'buncut'): { width: number; height: number } {
  if (id === 'buncut') return { width: 150, height: 86 };
  return { width: FOODS[id].width, height: FOODS[id].height };
}

/** Größe der Grillgut-Textur (schon vergrößert). */
export function foodSize(id: FoodId | 'buncut'): { width: number; height: number } {
  const b = baseSize(id);
  return { width: Math.ceil(b.width * FOOD_SCALE), height: Math.ceil(b.height * FOOD_SCALE) };
}

/** Grillgut von oben, Garstufe 0 (roh) bis 4 (verkohlt). */
export function drawFood(g: G, id: FoodId | 'buncut', stage: number): void {
  g.save();
  g.scaleCanvas(FOOD_SCALE, FOOD_SCALE);
  drawFoodBase(g, id, stage);
  g.restore();
}

function drawFoodBase(g: G, id: FoodId | 'buncut', stage: number): void {
  const { width: w, height: h } = baseSize(id);
  const c = COLORS[id][stage];
  switch (id) {
    case 'sausage':
      g.fillStyle(c);
      g.fillRoundedRect(2, 2, w - 4, h - 4, (h - 4) / 2);
      g.fillStyle(0xffffff, stage >= 4 ? 0.05 : 0.25);
      g.fillRoundedRect(14, 7, w - 28, 6, 3);
      grillMarks(g, w, h, stage);
      charred(g, w, h, stage);
      break;
    case 'bun':
      g.fillStyle(0x000000, 0.15);
      g.fillEllipse(w / 2, h / 2 + 4, w - 4, h - 6);
      g.fillStyle(c);
      g.fillEllipse(w / 2, h / 2, w - 4, h - 8);
      g.fillStyle(0xffffff, stage >= 4 ? 0.05 : 0.25);
      g.fillEllipse(w / 2 - 12, h / 2 - 12, w * 0.5, h * 0.25);
      if (stage < 4) {
        g.fillStyle(0xfff6de);
        for (let i = 0; i < 9; i++) g.fillEllipse(30 + ((i * 37) % 80), 18 + ((i * 23) % 36), 5, 3);
      }
      grillMarks(g, w, h, stage);
      charred(g, w, h, stage);
      break;
    case 'buncut':
      // Aufgeschnittenes Brötchen: zwei Hälften mit hellem Inneren
      g.fillStyle(c);
      g.fillEllipse(w / 2, h / 2, w - 4, h - 4);
      g.fillStyle(stage >= 4 ? 0x3a2a1c : 0xfaeed2);
      g.fillEllipse(w / 2, h / 2, w - 22, h - 30);
      g.lineStyle(3, stage >= 4 ? 0x1a120c : 0xe6d2a8);
      g.lineBetween(20, h / 2, w - 20, h / 2);
      break;
    case 'baguette':
      g.fillStyle(c);
      g.fillRoundedRect(2, 4, w - 4, h - 8, (h - 8) / 2);
      // Schnitte mit grüner Kräuterbutter
      for (let x = 30; x < w - 20; x += 30) {
        g.fillStyle(stage >= 4 ? 0x1a120c : 0x6aa84f);
        g.fillEllipse(x, h / 2, 9, h * 0.6);
        g.fillStyle(stage >= 4 ? 0x1a120c : 0xf7e08a);
        g.fillEllipse(x + 2, h / 2, 4, h * 0.45);
      }
      g.fillStyle(0xffffff, stage >= 4 ? 0.05 : 0.2);
      g.fillRoundedRect(14, 8, w - 28, 5, 3);
      charred(g, w, h, stage);
      break;
    case 'cheese':
      g.fillStyle(0x000000, 0.12);
      g.fillRoundedRect(4, 6, w - 6, h - 6, 12);
      g.fillStyle(c);
      g.fillRoundedRect(2, 2, w - 6, h - 8, 12);
      g.fillStyle(0xffffff, stage >= 4 ? 0.04 : 0.3);
      g.fillRoundedRect(10, 8, w - 30, 8, 4);
      grillMarks(g, w, h, stage);
      charred(g, w, h, stage);
      break;
  }
}

// --- Kleinteile ---------------------------------------------------------------------------

export function drawPlate(g: G): void {
  const { w, h } = GRILL.plate;
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(w / 2 + 6, h / 2 + 10, w, h);
  g.fillStyle(0xf8f9fa);
  g.fillEllipse(w / 2, h / 2, w - 4, h - 4);
  g.fillStyle(0xe9ecef);
  g.fillEllipse(w / 2, h / 2 + 4, w - 70, h - 50);
  g.lineStyle(3, 0x4d96ff, 0.6);
  g.strokeEllipse(w / 2, h / 2, w - 22, h - 20);
}

export const BOTTLE_SIZE = { width: 58, height: 150 };

/** Quetschflasche (Ketchup rot, Senf gelb), Fußpunkt unten Mitte. */
export function drawBottle(g: G, color: number, cap: number): void {
  const { width: w, height: h } = BOTTLE_SIZE;
  g.fillStyle(cap);
  g.fillTriangle(w / 2 - 6, 30, w / 2 + 6, 30, w / 2, 0);
  g.fillRoundedRect(w / 2 - 16, 24, 32, 20, 6);
  g.fillStyle(color);
  g.fillRoundedRect(3, 40, w - 6, h - 42, 16);
  g.fillStyle(0xffffff, 0.35);
  g.fillRoundedRect(10, 52, 10, h - 70, 5);
  g.fillStyle(0xffffff);
  g.fillCircle(w / 2, h * 0.62, 14);
  g.fillStyle(color);
  g.fillCircle(w / 2, h * 0.62, 8);
}

/** Geschirrtuch (rot-weiß kariert), hängt über der Ablagekante; Mitte = Bildmitte. */
export const CLOTH_SIZE = { width: 124, height: 96 };

export function drawCloth(g: G): void {
  const { width: w, height: h } = CLOTH_SIZE;
  g.fillStyle(0x000000, 0.15);
  g.fillRoundedRect(6, 6, w - 6, h - 6, 10);
  g.fillStyle(0xffffff);
  g.fillRoundedRect(0, 0, w - 6, h - 6, 10);
  g.fillStyle(0xd9483b, 0.75);
  const n = 6;
  const cw = (w - 6) / n;
  for (let i = 0; i < n; i++) g.fillRect(i * cw + cw * 0.25, 0, cw * 0.5, h - 6);
  for (let j = 0; j < 4; j++) g.fillRect(0, j * ((h - 6) / 4) + 6, w - 6, (h - 6) / 8);
  // Falte oben (hier hängt es über der Kante)
  g.fillStyle(0x000000, 0.12);
  g.fillRect(0, 16, w - 6, 5);
  g.lineStyle(3, 0xb33a2e);
  g.strokeRoundedRect(1.5, 1.5, w - 9, h - 9, 9);
}

/** Soße als Klecks-Spur: runde Tupfen, nahe Tupfen zu einer Linie verbunden. */
export function drawSauce(g: G, pts: readonly { x: number; y: number }[], color: number): void {
  if (!pts.length) return;
  g.lineStyle(11, color);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) < 30) g.lineBetween(a.x, a.y, b.x, b.y);
  }
  g.fillStyle(color);
  for (const p of pts) g.fillCircle(p.x, p.y, 6.5);
  // Glanzpunkte
  g.fillStyle(0xffffff, 0.35);
  for (let i = 0; i < pts.length; i += 5) g.fillCircle(pts[i].x - 2, pts[i].y - 2, 2);
}

/** Soßen-Zickzack, wie es auf der Bestellkarte gezeigt wird (lokale Koordinaten eines Gerichts). */
export function sauceZigzag(offset: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let k = 0; k <= 20; k++) pts.push({ x: -70 + k * 7, y: Math.sin(k * 0.9) * 10 + offset });
  return pts;
}

/**
 * Bestellkarte wie ein Bon mit Klammer: Papier mit Picknick-Karo oben, gezackte Unterkante,
 * für jedes Gericht ein eigener kleiner Teller mit Abstand. Oben Mitte (0, 0) sitzt die Klammer.
 */
export function drawOrderCard(g: G, items: number): { centers: number[]; y: number } {
  const C = GRILL.card;
  const w = items * C.cell + (items - 1) * C.gap + 2 * C.pad;
  const h = C.h;
  const top = 18;
  const x0 = -w / 2;
  // Schatten
  g.fillStyle(0x000000, 0.18);
  g.fillRoundedRect(x0 + 8, top + 12, w, h, 18);
  // Papier mit gezackter Unterkante
  g.fillStyle(0xfffaf0);
  g.fillRoundedRect(x0, top, w, h - 12, { tl: 18, tr: 18, bl: 0, br: 0 });
  const teeth = Math.round(w / 24);
  const tw = w / teeth;
  for (let i = 0; i < teeth; i++) g.fillTriangle(x0 + i * tw, top + h - 13, x0 + (i + 1) * tw, top + h - 13, x0 + (i + 0.5) * tw, top + h);
  // Picknick-Karo oben
  const band = 26;
  g.fillStyle(0xffffff);
  g.fillRoundedRect(x0, top, w, band, { tl: 18, tr: 18, bl: 0, br: 0 });
  g.fillStyle(0xe63946, 0.55);
  for (let x = x0; x < x0 + w - 1; x += 26) g.fillRect(x, top, 13, band);
  g.fillStyle(0xe63946, 0.55);
  g.fillRect(x0, top + band / 2 - 1, w, band / 2);
  g.fillStyle(0xfffaf0);
  g.fillRect(x0, top + band, w, 4);
  // Für jedes Gericht ein Teller
  const centers: number[] = [];
  const y = top + band + (h - band - 12) / 2 + 2;
  for (let i = 0; i < items; i++) {
    const cx = x0 + C.pad + C.cell / 2 + i * (C.cell + C.gap);
    centers.push(cx);
    g.fillStyle(0x000000, 0.1);
    g.fillEllipse(cx + 4, y + 20, C.cell - 4, 100);
    g.fillStyle(0xffffff);
    g.fillEllipse(cx, y + 14, C.cell - 8, 100);
    g.lineStyle(3, 0x4d96ff, 0.55);
    g.strokeEllipse(cx, y + 14, C.cell - 30, 82);
    // Pünktchen-Trenner zwischen den Gerichten
    if (i > 0) {
      g.fillStyle(0xe0c9a6);
      const dx = cx - C.cell / 2 - C.gap / 2;
      for (let k = 0; k < 5; k++) g.fillCircle(dx, top + band + 24 + k * 30, 4);
    }
  }
  // Holzklammer oben Mitte
  g.fillStyle(0x8a5a2b);
  g.fillRoundedRect(-13, -6, 26, 52, 6);
  g.fillStyle(0xc9975c);
  g.fillRoundedRect(-10, -4, 20, 48, 5);
  g.fillStyle(0x9aa3ab);
  g.fillRect(-12, 16, 24, 6);
  return { centers, y };
}
