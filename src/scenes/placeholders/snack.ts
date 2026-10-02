import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config';
import { SNACK, SNACKS, type SnackId } from '../../data/snacks';

// Snackbox-Spiel: Picknickwiese mit Decke, Teller, Box mit vier Fächern, Zahlenkarte, Snacks,
// Holzschild zurück. Ohne Text.

type G = Phaser.GameObjects.Graphics;
const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

export const SNACK_SIZE = 96;
export const CARD_SIZE = { width: 210, height: 270 };
export const PLATE_SIZE = { width: SNACK.plate.w + 40, height: SNACK.plate.h + 30 };
export const BOX_SIZE = { width: SNACK.box.w + 40, height: SNACK.box.h + 30 };

/** Wiese, Zaun, Picknickdecke. */
export function drawSnackBg(g: G): void {
  g.fillGradientStyle(0x9fdcff, 0x9fdcff, 0xe6f6ff, 0xe6f6ff, 1);
  g.fillRect(0, 0, GAME_WIDTH, 560);
  g.fillStyle(0xffffff, 0.85);
  for (const [x, y, s] of [[300, 120, 1], [1100, 90, 1.3], [1650, 170, 0.9]]) {
    g.fillEllipse(x, y, 190 * s, 56 * s);
    g.fillEllipse(x + 50 * s, y - 24 * s, 110 * s, 50 * s);
  }
  // Zaun
  g.fillStyle(0xd9b98a);
  g.fillRect(0, 380, GAME_WIDTH, 180);
  g.fillStyle(0xc49e68);
  for (let x = 0; x < GAME_WIDTH; x += 90) g.fillRect(x + 4, 380, 74, 180);
  g.fillStyle(0xa57b45);
  g.fillRect(0, 430, GAME_WIDTH, 16);
  g.fillRect(0, 500, GAME_WIDTH, 16);
  // Wiese
  g.fillGradientStyle(0x6bbf59, 0x6bbf59, 0x4a9d3f, 0x4a9d3f, 1);
  g.fillRect(0, 540, GAME_WIDTH, GAME_HEIGHT - 540);
  g.fillStyle(0x3f8c36, 0.5);
  for (let i = 0; i < 70; i++) {
    const x = (i * 337) % GAME_WIDTH;
    const y = 580 + ((i * 211) % 480);
    g.fillTriangle(x, y, x + 8, y - 22, x + 16, y);
  }
  // Picknickdecke (Karomuster)
  const bx = 250;
  const by = 640;
  const bw = 1420;
  const bh = 250;
  g.fillStyle(0x000000, 0.18);
  g.fillRoundedRect(bx + 8, by + 12, bw, bh, 14);
  g.fillStyle(0xfff4e6);
  g.fillRoundedRect(bx, by, bw, bh, 14);
  g.fillStyle(0xe63946, 0.55);
  for (let x = 0; x < bw; x += 70) if ((x / 70) % 2 === 0) g.fillRect(bx + x, by, 35, bh);
  for (let y = 0; y < bh; y += 70) if ((y / 70) % 2 === 0) g.fillRect(bx, by + y, bw, 35);
}

/** Teller mit Rand. */
export function drawSnackPlate(g: G): void {
  const { w, h } = SNACK.plate;
  const cx = PLATE_SIZE.width / 2;
  const cy = PLATE_SIZE.height / 2;
  g.fillStyle(0x000000, 0.2);
  g.fillEllipse(cx + 6, cy + 10, w, h);
  g.fillStyle(0xffffff);
  g.fillEllipse(cx, cy, w, h);
  g.lineStyle(6, 0xa8dadc);
  g.strokeEllipse(cx, cy, w - 14, h - 14);
  g.fillStyle(0xf1f5f9);
  g.fillEllipse(cx, cy, w - 110, h - 56);
}

/** Aufgeklappte Snackbox mit vier Fächern (die Snacks liegen als Bilder darauf). */
export function drawSnackBoxOpen(g: G): void {
  const { w, h } = SNACK.box;
  const ox = 20;
  const oy = 10;
  g.fillStyle(0x000000, 0.22);
  g.fillRoundedRect(ox + 8, oy + 12, w, h, 22);
  g.fillStyle(0x1d70b8);
  g.fillRoundedRect(ox, oy, w, h, 22);
  g.fillStyle(0x4aa3e0);
  g.fillRoundedRect(ox + 14, oy + 14, w - 28, h - 28, 16);
  const cw = w / SNACKS.length;
  for (let i = 0; i < SNACKS.length; i++) {
    g.fillStyle(0xfff8e7);
    g.fillRoundedRect(ox + i * cw + 22, oy + 28, cw - 44, h - 56, 14);
  }
}

/** Zahlenkarte (die Zahl und der Snack kommen als eigene Objekte dazu). */
export function drawCard(g: G): void {
  const { width: w, height: h } = CARD_SIZE;
  g.fillStyle(0x000000, 0.2);
  g.fillRoundedRect(8, 10, w - 10, h - 10, 22);
  g.fillStyle(0xffffff);
  g.fillRoundedRect(0, 0, w - 10, h - 10, 22);
  g.lineStyle(8, 0xffb703);
  g.strokeRoundedRect(8, 8, w - 26, h - 26, 16);
}

export function drawSnack(g: G, id: SnackId): void {
  const c = SNACK_SIZE / 2;
  switch (id) {
    case 'apple':
      g.fillStyle(0xd62828);
      g.fillCircle(c - 14, c + 6, 30);
      g.fillCircle(c + 14, c + 6, 30);
      g.fillCircle(c, c + 14, 32);
      g.fillStyle(0xffffff, 0.45);
      g.fillEllipse(c - 18, c - 4, 12, 20);
      g.fillStyle(0x7a4a1d);
      g.fillRect(c - 3, c - 32, 6, 18);
      g.fillStyle(0x2d9d4a);
      g.fillPoints([v(c + 3, c - 26), v(c + 28, c - 38), v(c + 22, c - 16)], true);
      break;
    case 'banana':
      g.lineStyle(26, 0xffd23f);
      g.beginPath();
      g.arc(c, c - 18, 46, 0.35, Math.PI - 0.35, false);
      g.strokePath();
      g.lineStyle(8, 0xe0b020);
      g.beginPath();
      g.arc(c, c - 18, 56, 0.45, Math.PI - 0.45, false);
      g.strokePath();
      g.fillStyle(0x6b4423);
      g.fillCircle(c - 42, c + 2, 7);
      g.fillCircle(c + 42, c + 2, 7);
      break;
    case 'cookie':
      g.fillStyle(0xd4a056);
      g.fillCircle(c, c, 40);
      g.fillStyle(0xe6b970);
      g.fillCircle(c - 4, c - 4, 34);
      g.fillStyle(0x4a2c17);
      for (const [x, y] of [[-16, -14], [14, -18], [-4, 6], [20, 8], [-22, 16], [4, 26]]) g.fillEllipse(c + x, c + y, 12, 10);
      break;
    case 'strawberry':
      g.fillStyle(0xe5383b);
      g.fillPoints([v(c - 34, c - 20), v(c + 34, c - 20), v(c + 22, c + 18), v(c, c + 40), v(c - 22, c + 18)], true);
      g.fillCircle(c - 18, c - 14, 18);
      g.fillCircle(c + 18, c - 14, 18);
      g.fillStyle(0xffe066);
      for (const [x, y] of [[-16, -8], [4, -14], [18, -2], [-6, 8], [10, 16], [-14, 18]]) g.fillCircle(c + x, c + y, 3);
      g.fillStyle(0x2d9d4a);
      g.fillPoints([v(c, c - 22), v(c - 24, c - 34), v(c - 8, c - 28), v(c, c - 42), v(c + 8, c - 28), v(c + 24, c - 34)], true);
      break;
  }
}

/** Das Spielzeug: Brotdose mit Henkel und Apfel auf dem Deckel. */
export function drawSnackboxToy(g: G): void {
  g.lineStyle(6, 0x14456f);
  g.beginPath();
  g.arc(55, 18, 24, Math.PI, 0, false);
  g.strokePath();
  g.fillStyle(0x14456f);
  g.fillRoundedRect(0, 16, 110, 64, 12);
  g.fillStyle(0x1d70b8);
  g.fillRoundedRect(5, 20, 100, 54, 10);
  g.fillStyle(0xffe066);
  g.fillRect(5, 36, 100, 6);
  g.fillStyle(0xd62828);
  g.fillCircle(46, 56, 13);
  g.fillCircle(60, 56, 13);
  g.fillStyle(0x2d9d4a);
  g.fillPoints([v(54, 42), v(68, 38), v(62, 48)], true);
  g.fillStyle(0xffd23f);
  g.fillCircle(88, 56, 7);
}

/** Holzschild mit Pfeil zurück. */
export function drawSnackSign(g: G): void {
  const { w, h } = SNACK.exit;
  g.fillStyle(0x000000, 0.2);
  g.fillRoundedRect(8, 10, w, h, 14);
  g.fillStyle(0x7a5536);
  g.fillRoundedRect(4, 6, w, h, 14);
  g.fillStyle(0xb07f47);
  g.fillRoundedRect(0, 0, w, h, 14);
  g.lineStyle(2, 0x8a5a2b, 0.7);
  for (let y = 22; y < h - 10; y += 22) g.lineBetween(12, y, w - 12, y);
  g.fillStyle(0x2d6a4f);
  const cy = h / 2;
  g.fillPoints([v(26, cy), v(86, cy - 38), v(86, cy - 16), v(w - 26, cy - 16), v(w - 26, cy + 16), v(86, cy + 16), v(86, cy + 38)], true);
}
