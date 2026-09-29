import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config';
import { FOODS, type FoodId } from '../../data/grill';

// Grill-Spiel (#66): Hintergrund (Felix' Garten), Grill mit Rost und Ablagen, Grillgut in
// 5 Garstufen, Teller, Soßenflaschen, Bestellkarte. Alles in Bildschirmkoordinaten 1920 × 1080.

type G = Phaser.GameObjects.Graphics;
const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

/** Aufteilung des Bildes. */
export const GRILL = {
  /** Kochfläche des Rosts: Grillgut, das hier liegt, wird gar. */
  grate: { left: 600, right: 1320, top: 650, bottom: 950 },
  /** Linke Ablage zum Anrichten, rechte mit dem Vorrat. */
  shelfL: { left: 16, right: 560, top: 720, bottom: 1010 },
  shelfR: { left: 1360, right: 1904, top: 720, bottom: 1010 },
  /** Teller (Mitte) und Plätze für bis zu 3 Gerichte darauf. */
  plate: { x: 330, y: 880, w: 430, h: 180 },
  plateSlots: [-125, 0, 125],
  /** Soßenflaschen (Fußpunkt) hinten auf der linken Ablage. */
  bottles: { ketchup: { x: 60, y: 800 }, mustard: { x: 128, y: 800 } },
  /** Vorratsschalen auf der rechten Ablage (Mitte). */
  sources: {
    sausage: { x: 1500, y: 800 },
    bun: { x: 1760, y: 800 },
    baguette: { x: 1500, y: 935 },
    cheese: { x: 1760, y: 935 },
  } as Record<FoodId, { x: number; y: number }>,
  /** Das grüne Gartentor im Hintergrund: zurück auf die Wiese. */
  exit: { x: 40, y: 230, w: 210, h: 330 },
  /** Wo das bestellende Kind steht (Fußpunkt) und die Warteschlange dahinter. */
  front: { x: 960, y: 690, scale: 1.3 },
  queue: [
    { x: 1330, y: 640, scale: 1 },
    { x: 1500, y: 632, scale: 0.94 },
    { x: 1660, y: 624, scale: 0.88 },
    { x: 1800, y: 618, scale: 0.84 },
  ],
  /** Bestellkarte oben. */
  card: { x: 960, y: 120, w: 400, h: 190 },
};

// --- Hintergrund: Felix' Garten --------------------------------------------------------

export function drawGrillBackground(g: G): void {
  const W = GAME_WIDTH;
  // Himmel am späten Nachmittag
  g.fillGradientStyle(0x8ecdf7, 0x8ecdf7, 0xffe0b0, 0xffe0b0, 1);
  g.fillRect(0, 0, W, 560);
  // Zaun und schwarzer Schuppen
  g.fillStyle(0x8e8174);
  g.fillRect(0, 380, W, 200);
  g.lineStyle(2, 0x6f6357, 0.6);
  for (let y = 392; y < 580; y += 16) g.lineBetween(0, y, W, y);
  g.fillStyle(0x2c2c2c);
  g.fillRect(520, 250, 880, 330);
  g.lineStyle(2, 0x404040);
  for (let x = 540; x < 1400; x += 22) g.lineBetween(x, 256, x, 580);
  g.fillStyle(0x161616);
  g.fillRect(506, 236, 908, 22);
  // Baumstamm rechts
  g.fillStyle(0x6e6258);
  g.fillRect(1820, 0, 110, 600);
  g.lineStyle(3, 0x4a4038);
  for (let x = 1830; x < 1920; x += 14) g.lineBetween(x, 0, x + 4, 600);
  // Boden: Erde und Rindenmulch
  g.fillStyle(0x6b4f3a);
  g.fillRect(0, 560, W, GAME_HEIGHT - 560);
  const bark = [0x8a6446, 0x5a3f2c, 0x7a5a40];
  for (let i = 0; i < 700; i++) {
    g.fillStyle(bark[i % 3]);
    g.fillEllipse((i * 197) % W, 570 + ((i * 53) % 480), 12, 5);
  }
  // Grünes Gartentor links (der Weg zurück auf die Wiese): dahinter scheint die Wiese
  const E = GRILL.exit;
  g.fillStyle(0x7cc96a);
  g.fillRect(E.x + 18, E.y + 30, E.w - 36, E.h - 30);
  g.fillStyle(0x9fd8ff);
  g.fillRect(E.x + 18, E.y + 30, E.w - 36, 110);
  g.fillStyle(0x1f4d2e);
  g.fillRect(E.x, E.y + 10, 18, E.h - 10);
  g.fillRect(E.x + E.w - 18, E.y + 10, 18, E.h - 10);
  g.lineStyle(6, 0x2a5e3a);
  g.strokeRect(E.x + 26, E.y + 34, E.w - 52, E.h - 44);
  g.lineStyle(3, 0x2a5e3a);
  for (let x = E.x + 38; x < E.x + E.w - 30; x += 12) g.lineBetween(x, E.y + 34, x, E.y + E.h - 10);
  for (const y of [E.y + 90, E.y + 180, E.y + 260]) g.lineBetween(E.x + 26, y, E.x + E.w - 26, y);
  // Pergola-Balken mit wildem Wein oben
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

export function foodSize(id: FoodId | 'buncut'): { width: number; height: number } {
  if (id === 'buncut') return { width: 150, height: 86 };
  return { width: FOODS[id].width, height: FOODS[id].height };
}

/** Grillgut von oben, Garstufe 0 (roh) bis 4 (verkohlt). */
export function drawFood(g: G, id: FoodId | 'buncut', stage: number): void {
  const { width: w, height: h } = foodSize(id);
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

export function drawOrderCard(g: G): void {
  const { w, h } = GRILL.card;
  g.fillStyle(0x000000, 0.2);
  g.fillRoundedRect(6, 10, w - 6, h - 16, 22);
  g.fillStyle(0xfffdf7);
  g.fillRoundedRect(0, 0, w - 6, h - 16, 22);
  g.fillTriangle(w / 2 - 22, h - 18, w / 2 + 22, h - 18, w / 2, h);
  g.lineStyle(4, 0xf2c230);
  g.strokeRoundedRect(4, 4, w - 14, h - 24, 18);
}
