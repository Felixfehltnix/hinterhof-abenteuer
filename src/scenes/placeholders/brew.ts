import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config';
import { BREW, FAIRY_DEFS, INGREDIENT_DEFS, type FairyId, type IngredientId } from '../../data/brew';

// Zaubertrank: Gartenecke mit Topf (Eimer), Zutaten-Korb, Rührlöffel und Feen. Ohne Text.

type G = Phaser.GameObjects.Graphics;
const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

/** Gartenecke bei Dämmerlicht: Himmel, Zaun, Wiese. */
export function drawBrewBg(g: G): void {
  g.fillGradientStyle(0x5b4b9a, 0x5b4b9a, 0xe7a8c8, 0xe7a8c8, 1);
  g.fillRect(0, 0, GAME_WIDTH, 520);
  g.fillStyle(0xfff7c2, 0.9);
  for (const [x, y, s] of [[260, 110, 5], [620, 70, 4], [980, 140, 6], [1420, 90, 4], [1700, 160, 5], [1160, 60, 3]]) g.fillCircle(x, y, s);
  g.fillStyle(0x6b5a3a);
  g.fillRect(0, 380, GAME_WIDTH, 170);
  g.fillStyle(0x5a4a2e);
  for (let x = 0; x < GAME_WIDTH; x += 96) g.fillRect(x + 6, 380, 78, 170);
  g.fillStyle(0x3f8f3a);
  g.fillRect(0, 540, GAME_WIDTH, GAME_HEIGHT - 540);
  g.fillStyle(0x4aa244);
  for (let i = 0; i < 70; i++) g.fillEllipse((i * 197) % GAME_WIDTH, 560 + ((i * 89) % 480), 70, 16);
}

/** Der Topf: ein großer Holzeimer, oben offen (Öffnung in der Mitte, Rand darüber als eigene Textur). */
export const POT_SIZE = { width: BREW.pot.rx * 2 + 60, height: BREW.pot.bodyH + BREW.pot.ry * 2 + 30 };

export function drawPot(g: G): void {
  const { rx, ry, bodyH } = BREW.pot;
  const cx = POT_SIZE.width / 2;
  const top = ry + 10;
  g.fillStyle(0x000000, 0.2);
  g.fillEllipse(cx, top + bodyH + 8, rx * 2 - 40, ry * 1.4);
  g.fillStyle(0x219ebc);
  g.fillPoints([v(cx - rx, top), v(cx + rx, top), v(cx + rx - 50, top + bodyH), v(cx - rx + 50, top + bodyH)], true);
  g.fillEllipse(cx, top + bodyH, rx * 2 - 100, ry * 1.5);
  g.fillStyle(0xffffff, 0.2);
  g.fillRect(cx - rx + 40, top + 20, 36, bodyH - 50);
  g.fillStyle(0x023047, 0.35);
  g.fillRect(cx - 10, top + 20, 20, bodyH - 20);
  g.fillStyle(0x0e5a73);
  g.fillEllipse(cx, top, rx * 2, ry * 2);
}

/** Vorderer Rand der Öffnung (liegt über dem Trank). */
export function drawPotRim(g: G): void {
  const { rx, ry } = BREW.pot;
  const cx = POT_SIZE.width / 2;
  const cy = ry + 10;
  g.lineStyle(14, 0x1b7f9c);
  g.strokeEllipse(cx, cy, rx * 2, ry * 2);
  g.lineStyle(5, 0x8fdcf0, 0.8);
  g.beginPath();
  g.arc(cx, cy, rx - 8, Math.PI * 0.1, Math.PI * 0.9, false);
  g.strokePath();
}

/** Rührlöffel: langer Holzstiel mit Kelle unten. Fußpunkt (Kelle) unten Mitte. */
export const SPOON_SIZE = { width: 60, height: 300 };

export function drawSpoon(g: G): void {
  const { width: w, height: h } = SPOON_SIZE;
  g.fillStyle(0xb98a52);
  g.fillRoundedRect(w / 2 - 8, 0, 16, h - 50, 8);
  g.fillStyle(0xd9a866);
  g.fillRoundedRect(w / 2 - 3, 0, 5, h - 50, 3);
  g.fillStyle(0x9a6f3c);
  g.fillEllipse(w / 2, h - 28, 54, 56);
  g.fillStyle(0xc99458, 0.8);
  g.fillEllipse(w / 2 - 6, h - 34, 24, 28);
}

/** Korb-Hintergrund: flache Holzschale am unteren Rand. */
export const BASKET_SIZE = { width: BREW.basket.dx * BREW.basket.cols + 60, height: BREW.basket.dy * 2 + 70 };

export function drawBasket(g: G): void {
  const { width: w, height: h } = BASKET_SIZE;
  g.fillStyle(0x000000, 0.18);
  g.fillRoundedRect(8, 14, w - 16, h - 10, 36);
  g.fillStyle(0xb98a52);
  g.fillRoundedRect(0, 0, w - 8, h - 14, 36);
  g.fillStyle(0xd9a866);
  g.fillRoundedRect(14, 14, w - 36, h - 44, 28);
  g.lineStyle(4, 0xa07638, 0.6);
  for (let x = 40; x < w - 40; x += 40) {
    g.beginPath();
    g.moveTo(x, h - 26);
    g.lineTo(x, h - 14);
    g.strokePath();
  }
}

export const INGREDIENT_SIZE = BREW.basket.item;

/** Eine Zutat (Bild, ohne Text). */
export function drawIngredient(g: G, id: IngredientId): void {
  const s = INGREDIENT_SIZE;
  const c = s / 2;
  const col = INGREDIENT_DEFS[id].color;
  switch (id) {
    case 'mud':
      g.fillStyle(col);
      g.fillEllipse(c, c + 12, 80, 50);
      g.fillCircle(c - 14, c - 4, 20);
      g.fillCircle(c + 14, c, 22);
      g.fillStyle(0xffffff, 0.2);
      g.fillCircle(c - 18, c - 10, 6);
      break;
    case 'leaf':
      g.fillStyle(col);
      g.fillEllipse(c, c, 46, 76);
      g.lineStyle(4, 0x2f7a22);
      g.lineBetween(c, c - 36, c, c + 40);
      g.lineBetween(c, c, c - 14, c - 14);
      g.lineBetween(c, c + 12, c + 14, c - 2);
      break;
    case 'root':
      g.lineStyle(14, col);
      g.beginPath();
      g.moveTo(c - 6, c - 36);
      g.lineTo(c + 4, c);
      g.lineTo(c - 8, c + 38);
      g.strokePath();
      g.lineStyle(7, col);
      g.lineBetween(c + 4, c, c + 30, c + 14);
      g.lineBetween(c + 2, c - 14, c - 26, c - 22);
      break;
    case 'flower':
      g.fillStyle(col);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.fillCircle(c + Math.cos(a) * 22, c + Math.sin(a) * 22, 15);
      }
      g.fillStyle(0xffd23f);
      g.fillCircle(c, c, 14);
      break;
    case 'grass':
      g.fillStyle(col);
      for (let i = -2; i <= 2; i++) g.fillTriangle(c + i * 14 - 8, c + 38, c + i * 14 + 8, c + 38, c + i * 18, c - 38 + Math.abs(i) * 10);
      break;
    case 'berry':
      g.fillStyle(col);
      for (const [dx, dy] of [[-16, 8], [16, 8], [0, -14]]) g.fillCircle(c + dx, c + dy, 18);
      g.fillStyle(0xffffff, 0.35);
      for (const [dx, dy] of [[-22, 2], [10, 2], [-6, -20]]) g.fillCircle(c + dx, c + dy, 5);
      g.fillStyle(0x3f8f3a);
      g.fillTriangle(c - 6, c - 30, c + 6, c - 30, c, c - 42);
      break;
    case 'mushroom':
      g.fillStyle(0xf3e9d2);
      g.fillRoundedRect(c - 13, c, 26, 38, 8);
      g.fillStyle(col);
      g.fillEllipse(c, c - 4, 80, 56);
      g.fillStyle(0xffffff);
      for (const [dx, dy, r] of [[-20, -8, 7], [8, -16, 8], [22, -2, 6]]) g.fillCircle(c + dx, c + dy, r);
      break;
    case 'sand':
      g.fillStyle(col);
      g.fillTriangle(c - 40, c + 36, c + 40, c + 36, c, c - 28);
      g.fillStyle(0xffffff, 0.3);
      g.fillTriangle(c - 14, c + 30, c - 4, c + 30, c - 8, c - 8);
      break;
    case 'drop':
      g.fillStyle(col);
      g.fillTriangle(c - 22, c + 4, c + 22, c + 4, c, c - 40);
      g.fillCircle(c, c + 14, 26);
      g.fillStyle(0xffffff, 0.6);
      g.fillCircle(c - 10, c + 8, 7);
      break;
    case 'snow':
      g.lineStyle(7, 0xbfe6ff);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI;
        g.lineBetween(c - Math.cos(a) * 36, c - Math.sin(a) * 36, c + Math.cos(a) * 36, c + Math.sin(a) * 36);
      }
      g.fillStyle(col);
      g.fillCircle(c, c, 12);
      break;
    case 'stone':
      g.fillStyle(col);
      g.fillPoints([v(c - 36, c + 22), v(c - 26, c - 20), v(c + 8, c - 32), v(c + 38, c - 6), v(c + 32, c + 24)], true);
      g.fillStyle(0xffffff, 0.3);
      g.fillPoints([v(c - 22, c - 12), v(c + 4, c - 24), v(c - 4, c - 6)], true);
      break;
    case 'shell':
      g.fillStyle(col);
      g.fillCircle(c, c, 34);
      g.lineStyle(4, 0xc08a78);
      g.beginPath();
      g.arc(c, c, 24, 0, Math.PI * 3.2, false);
      g.strokePath();
      g.beginPath();
      g.arc(c, c, 12, 0, Math.PI * 3.2, false);
      g.strokePath();
      break;
  }
}

/** Fee: Flügel, Kleid, Haare, Zauberstab mit Stern. Fußpunkt (Kleidsaum) unten Mitte. */
export const FAIRY_SIZE = { width: 150, height: 190 };

export function drawFairy(g: G, id: FairyId): void {
  const d = FAIRY_DEFS[id];
  const { width: w, height: h } = FAIRY_SIZE;
  const cx = w / 2;
  // Flügel hinten
  g.fillStyle(d.wing, 0.85);
  g.fillEllipse(cx - 36, 70, 56, 84);
  g.fillEllipse(cx + 36, 70, 56, 84);
  g.fillEllipse(cx - 28, 112, 40, 52);
  g.fillEllipse(cx + 28, 112, 40, 52);
  g.fillStyle(0xffffff, 0.35);
  g.fillEllipse(cx - 40, 56, 22, 36);
  g.fillEllipse(cx + 32, 56, 22, 36);
  // Haare hinten
  g.fillStyle(d.hair);
  g.fillEllipse(cx, 40, 62, 66);
  // Kleid
  g.fillStyle(d.dress);
  g.fillPoints([v(cx - 12, 82), v(cx + 12, 82), v(cx + 38, h - 12), v(cx - 38, h - 12)], true);
  g.fillStyle(0xffffff, 0.3);
  g.fillEllipse(cx - 12, 130, 10, 50);
  // Arme
  g.fillStyle(0xf6d1b0);
  g.fillEllipse(cx - 22, 100, 14, 36);
  g.fillEllipse(cx + 22, 100, 14, 36);
  // Kopf
  g.fillStyle(0xf6d1b0);
  g.fillCircle(cx, 52, 28);
  g.fillStyle(d.hair);
  g.fillEllipse(cx, 32, 60, 26);
  // Gesicht
  g.fillStyle(0x3a2a1a);
  g.fillCircle(cx - 10, 54, 3);
  g.fillCircle(cx + 10, 54, 3);
  g.lineStyle(3, 0xc0504d);
  g.beginPath();
  g.arc(cx, 60, 8, 0.2, Math.PI - 0.2, false);
  g.strokePath();
  g.fillStyle(0xff9aa2, 0.5);
  g.fillCircle(cx - 18, 62, 5);
  g.fillCircle(cx + 18, 62, 5);
  // Zauberstab mit Stern
  g.lineStyle(4, 0xb98a52);
  g.lineBetween(cx + 26, 104, cx + 50, 70);
  g.fillStyle(0xfff3b0);
  const sx = cx + 52;
  const sy = 62;
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 14 : 6;
    pts.push(v(sx + Math.cos(a) * r, sy + Math.sin(a) * r));
  }
  g.fillPoints(pts, true);
}

/** Kleiner Funke (weiß, wird eingefärbt). */
export const SPARK_SIZE = 24;

export function drawSpark(g: G): void {
  const c = SPARK_SIZE / 2;
  g.fillStyle(0xffffff, 0.3);
  g.fillCircle(c, c, c);
  g.fillStyle(0xffffff);
  g.fillPoints([v(c, 1), v(c + 3, c - 3), v(SPARK_SIZE - 1, c), v(c + 3, c + 3), v(c, SPARK_SIZE - 1), v(c - 3, c + 3), v(1, c), v(c - 3, c - 3)], true);
}
