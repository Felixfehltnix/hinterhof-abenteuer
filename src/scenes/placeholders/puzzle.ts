import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config';
import { BOARD, PUZZLE_LAYOUT } from '../../data/puzzle';

// Puzzlebrett: Spielzeug auf der Wiese, und fürs Puzzle-Spiel Tisch, Holzrahmen, Stufen-Knöpfe, Stern.
// Die Teile selbst schneidet die PuzzleScene aus dem Foto (Canvas).

type G = Phaser.GameObjects.Graphics;

const WOOD = 0xd9a066;
const WOOD_DARK = 0xa86f3c;
const WOOD_LIGHT = 0xf0c48a;
const PIECE_COLORS = [0xef476f, 0xffd166, 0x06d6a0, 0x4d96ff];

/** Größe des Puzzlebretts auf der Wiese (Katalog `puzzleboard`). */
export const PUZZLE_TOY_SIZE = { width: 130, height: 96 };

/** Puzzleteil als Fläche mit Nasen (rechts und unten), für Spielzeug und Knöpfe. */
function chunkyPiece(g: G, x: number, y: number, s: number, color: number, tabs: { right?: boolean; down?: boolean }): void {
  g.fillStyle(color);
  g.fillRect(x, y, s, s);
  if (tabs.right) g.fillCircle(x + s + s * 0.12, y + s / 2, s * 0.2);
  if (tabs.down) g.fillCircle(x + s / 2, y + s + s * 0.12, s * 0.2);
}

/** Holzbrett von schräg vorn mit vier bunten Teilen, eines liegt daneben. */
export function drawPuzzleToy(g: G): void {
  const { width: w, height: h } = PUZZLE_TOY_SIZE;
  // Brett: oben schmaler (liegt flach), dicke Kante vorn
  const top = [
    new Phaser.Math.Vector2(16, 20),
    new Phaser.Math.Vector2(w - 26, 20),
    new Phaser.Math.Vector2(w - 10, h - 22),
    new Phaser.Math.Vector2(4, h - 22),
  ];
  g.fillStyle(WOOD_DARK);
  g.fillRect(4, h - 22, w - 14, 12);
  g.fillStyle(WOOD);
  g.fillPoints(top, true);
  g.lineStyle(2, WOOD_DARK);
  g.strokePoints(top, true);
  // Vertiefung mit drei eingelegten Teilen, ein Platz frei
  g.fillStyle(0x8a5a2b);
  g.fillRect(22, 28, 74, 40);
  const s = 34;
  chunkyPiece(g, 24, 29, s, PIECE_COLORS[0], { right: true });
  chunkyPiece(g, 24 + s + 3, 29, s, PIECE_COLORS[1], {});
  g.fillStyle(PIECE_COLORS[2]);
  g.fillRect(24, 29 + s * 0.55, s, s * 0.6);
  // Das vierte Teil liegt daneben
  chunkyPiece(g, w - 30, h - 46, 22, PIECE_COLORS[3], { down: true });
  g.lineStyle(2, 0x1d3557, 0.4);
  g.strokeRect(w - 30, h - 46, 22, 22);
  g.fillStyle(0xffffff, 0.5);
  g.fillRect(16, 21, w - 44, 3);
}

/** Großer Spieltisch aus hellem Holz (Dielen), von oben. */
export function drawPuzzleBg(g: G): void {
  g.fillStyle(0xe8c99b);
  g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  const plank = 135;
  for (let y = 0; y < GAME_HEIGHT; y += plank) {
    g.fillStyle(y % (plank * 2) === 0 ? 0xe3c293 : 0xedd0a5);
    g.fillRect(0, y, GAME_WIDTH, plank - 3);
    g.fillStyle(0xc9a06b, 0.6);
    g.fillRect(0, y + plank - 3, GAME_WIDTH, 3);
    // Maserung
    g.lineStyle(2, 0xd2ab78, 0.45);
    for (let i = 0; i < 4; i++) {
      const yy = y + 22 + i * 28;
      const x0 = ((y * 7 + i * 311) % 900) - 100;
      g.beginPath();
      g.moveTo(x0, yy);
      for (let x = x0; x < x0 + 700; x += 70) g.lineTo(x + 70, yy + Math.sin((x + i * 40) / 90) * 4);
      g.strokePath();
    }
    // Stoßfugen
    g.fillStyle(0xc9a06b, 0.5);
    g.fillRect(((y * 13) % 1200) + 300, y, 3, plank - 3);
  }
}

/** Holzrahmen um die Bildfläche, innen eine helle Pappe (darauf liegen Vorlage und Umrisse). */
export function drawPuzzleBoard(g: G): void {
  const f = BOARD.frame;
  const w = BOARD.w + f * 2;
  const h = BOARD.h + f * 2;
  // Schatten unter dem Rahmen
  g.fillStyle(0x000000, 0.18);
  g.fillRoundedRect(8, 12, w, h, 22);
  g.fillStyle(WOOD);
  g.fillRoundedRect(0, 0, w, h, 22);
  g.fillStyle(WOOD_LIGHT);
  g.fillRoundedRect(4, 4, w - 8, 10, 6);
  g.lineStyle(3, WOOD_DARK);
  g.strokeRoundedRect(1.5, 1.5, w - 3, h - 3, 22);
  // Vertiefung (oben/links dunkle Kante = tiefer)
  g.fillStyle(0x7a4e26);
  g.fillRect(f - 6, f - 6, BOARD.w + 12, BOARD.h + 12);
  g.fillStyle(0xf3e6cc);
  g.fillRect(f, f, BOARD.w, BOARD.h);
  g.fillStyle(0x000000, 0.12);
  g.fillRect(f, f, BOARD.w, 10);
  g.fillRect(f, f, 10, BOARD.h);
}

/** Stufen-Knopf: Pappkärtchen mit dem Raster der Teile (mehr Kästchen = schwerer). */
export function drawLevelTile(g: G, cols: number, rows: number): void {
  const { w, h } = PUZZLE_LAYOUT.levels;
  g.fillStyle(0x000000, 0.2);
  g.fillRoundedRect(4, 6, w - 4, h - 6, 14);
  g.fillStyle(WOOD);
  g.fillRoundedRect(0, 0, w - 4, h - 6, 14);
  g.lineStyle(3, WOOD_DARK);
  g.strokeRoundedRect(1.5, 1.5, w - 7, h - 9, 14);
  const pad = 14;
  const iw = w - 4 - pad * 2;
  const ih = h - 6 - pad * 2;
  const cw = iw / cols;
  const ch = ih / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      g.fillStyle(PIECE_COLORS[(r + c) % PIECE_COLORS.length]);
      g.fillRect(pad + c * cw + 1.5, pad + r * ch + 1.5, cw - 3, ch - 3);
    }
  }
}

/** Kleiner Rahmen um den gewählten Stufen-Knopf. */
export function drawLevelGlow(g: G): void {
  const { w, h } = PUZZLE_LAYOUT.levels;
  g.lineStyle(8, 0xfff3b0, 0.95);
  g.strokeRoundedRect(4, 4, w + 8, h + 8, 18);
}

export const PUZZLE_STAR_SIZE = 44;

/** Goldener Stern (Jubel, Fortschritt unter dem Knopf). */
export function drawPuzzleStar(g: G): void {
  const s = PUZZLE_STAR_SIZE;
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? s / 2 - 2 : s / 4.6;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(new Phaser.Math.Vector2(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r));
  }
  g.fillStyle(0xffd166);
  g.fillPoints(pts, true);
  g.lineStyle(2, 0xe09f1f);
  g.strokePoints(pts, true);
}

/** Leerer Punkt unter dem Knopf: so viele Bilder fehlen noch bis zur nächsten Stufe. */
export function drawPuzzleDot(g: G): void {
  const s = PUZZLE_STAR_SIZE;
  g.lineStyle(3, WOOD_DARK, 0.7);
  g.strokeCircle(s / 2, s / 2, s / 4);
}

/** Ersatzbild, falls ein Foto fehlt: bunte Wiese mit Sonne (das Puzzle geht trotzdem). */
export function drawPicturePlaceholder(g: G, i: number): void {
  const sky = [0x9fd8ff, 0xffd6a5, 0xcaffbf, 0xbdb2ff][i % 4];
  g.fillStyle(sky);
  g.fillRect(0, 0, BOARD.w, BOARD.h);
  g.fillStyle(0x52b04a);
  g.fillRect(0, BOARD.h * 0.62, BOARD.w, BOARD.h * 0.38);
  g.fillStyle(0xffd166);
  g.fillCircle(BOARD.w * 0.78, BOARD.h * 0.25, 90);
  g.fillStyle(PIECE_COLORS[i % PIECE_COLORS.length]);
  g.fillCircle(BOARD.w * 0.35, BOARD.h * 0.6, 150);
  g.fillStyle(0xffffff);
  g.fillCircle(BOARD.w * 0.3, BOARD.h * 0.54, 26);
  g.fillCircle(BOARD.w * 0.42, BOARD.h * 0.54, 26);
  g.fillStyle(0x222222);
  g.fillCircle(BOARD.w * 0.3, BOARD.h * 0.55, 12);
  g.fillCircle(BOARD.w * 0.42, BOARD.h * 0.55, 12);
}
