import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config';
import { rng } from './backdrop';

// Tor zur Steinterrasse (im Zaun), Steinplatten von oben fürs Kreide-Malspiel,
// Kreidestücke, Kreide-Tupfer (wird eingefärbt), Schwamm, Wassereimer, Holzschild zurück.

type G = Phaser.GameObjects.Graphics;
const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

export const TERRACE_GATE_SIZE = { width: 230, height: 214 };
export const CHALK_STICK_SIZE = { width: 46, height: 150 };
export const CHALK_DOT_SIZE = 40;
export const SPONGE_SIZE = { width: 150, height: 96 };
export const BUCKET_SIZE = { width: 190, height: 170 };
export const ERASER_SIZE = 160;

/** Wo im Malspiel was liegt (Bildschirmkoordinaten). */
export const CHALK_LAYOUT = {
  /** Kreideschachtel unten in der Mitte; die Stücke stehen nebeneinander darin. */
  tray: { x: 520, y: 940, w: 880, h: 140 },
  stickGap: 92,
  /** Wassereimer mit Schwamm unten rechts. */
  bucket: { x: 1700, y: 1070 },
  /** Holzschild zurück oben links. */
  exit: { x: 30, y: 40, w: 200, h: 110 },
};

const STONE = [0xcfc9bf, 0xc6c0b5, 0xd8d3ca, 0xbdb7ac];
const JOINT = 0x8f897e;

/** Steinplatten von oben (ganzer Bildschirm). */
export function drawChalkGround(g: G): void {
  const r = rng(11);
  const slab = 270;
  g.fillStyle(JOINT);
  g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  for (let row = 0; row * slab < GAME_HEIGHT + slab; row++) {
    const off = row % 2 ? slab / 2 : 0;
    for (let x = -off; x < GAME_WIDTH; x += slab) {
      const y = row * slab - 60;
      g.fillStyle(STONE[Math.floor(r() * STONE.length)]);
      g.fillRect(x + 4, y + 4, slab - 8, slab - 8);
      g.fillStyle(0xffffff, 0.12);
      g.fillRect(x + 4, y + 4, slab - 8, 6);
      g.fillStyle(0x7d776c, 0.3);
      for (let i = 0; i < 26; i++) g.fillCircle(x + 10 + r() * (slab - 20), y + 10 + r() * (slab - 20), 1.5 + r() * 2.5);
      if (r() < 0.3) {
        g.fillStyle(0x6a994e, 0.85);
        for (let i = 0; i < 4; i++) g.fillCircle(x + slab - 4 + r() * 6 - 3, y + 30 + r() * (slab - 60), 4 + r() * 3);
      }
    }
  }
}

/** Kreidetupfer: körnige weiße Scheibe (wird beim Malen eingefärbt). */
export function drawChalkDot(g: G): void {
  const r = rng(3);
  const c = CHALK_DOT_SIZE / 2;
  for (let i = 0; i < 140; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * (c - 3);
    g.fillStyle(0xffffff, 0.45 + r() * 0.55);
    g.fillCircle(c + Math.cos(a) * d, c + Math.sin(a) * d, 1.4 + r() * 2.2);
  }
}

/** Radierer des Schwamms: weiche volle Scheibe. */
export function drawEraser(g: G): void {
  const c = ERASER_SIZE / 2;
  g.fillStyle(0xffffff);
  g.fillCircle(c, c, c - 2);
}

/** Ein Stück Kreide (steht hochkant, Spitze oben); rainbow = bunt gestreift. */
export function drawChalkStick(g: G, color: number | 'rainbow'): void {
  const { width: w, height: h } = CHALK_STICK_SIZE;
  const stripes = [0xff6b6b, 0xffa94d, 0xffe066, 0x8ce99a, 0x74c0fc, 0xb197fc];
  if (color === 'rainbow') {
    const sh = (h - 10) / stripes.length;
    stripes.forEach((c, i) => {
      g.fillStyle(c);
      g.fillRect(2, 10 + i * sh, w - 4, sh + 1);
    });
  } else {
    g.fillStyle(color);
    g.fillRect(2, 10, w - 4, h - 10);
  }
  // Abgerundete, abgenutzte Spitze
  g.fillStyle(color === 'rainbow' ? stripes[0] : color);
  g.fillEllipse(w / 2, 12, w - 4, 22);
  // Licht und Schatten (rund)
  g.fillStyle(0xffffff, 0.3);
  g.fillRect(8, 14, 7, h - 18);
  g.fillStyle(0x000000, 0.12);
  g.fillRect(w - 12, 14, 8, h - 18);
}

/** Kreideschachtel (Pappe, nach vorn offen), in der die Stücke stehen. */
export function drawChalkTray(g: G): void {
  const { w, h } = CHALK_LAYOUT.tray;
  g.fillStyle(0x000000, 0.18);
  g.fillRoundedRect(8, 14, w, h, 18);
  g.fillStyle(0xf4a261);
  g.fillRoundedRect(0, 0, w, h, 18);
  g.fillStyle(0xe76f51);
  g.fillRoundedRect(0, 0, w, 26, { tl: 18, tr: 18, bl: 0, br: 0 });
  // Regenbogen-Bogen und Punkte als Aufdruck (ohne Text)
  const arc = [0xff6b6b, 0xffe066, 0x74c0fc];
  arc.forEach((c, i) => {
    g.lineStyle(10, c);
    g.beginPath();
    g.arc(w - 90, h + 10, 60 - i * 12, Math.PI, 0, false);
    g.strokePath();
  });
  g.fillStyle(0xffffff, 0.6);
  for (let i = 0; i < 6; i++) g.fillCircle(40 + i * 26, h - 26, 6);
}

export function drawSponge(g: G): void {
  const { width: w, height: h } = SPONGE_SIZE;
  g.fillStyle(0x3a86ff);
  g.fillRoundedRect(0, 0, w, h * 0.35, 12);
  g.fillStyle(0xffd60a);
  g.fillRoundedRect(0, h * 0.3, w, h * 0.7, 16);
  g.fillStyle(0xe0b100);
  const r = rng(5);
  for (let i = 0; i < 26; i++) g.fillCircle(10 + r() * (w - 20), h * 0.38 + r() * (h * 0.55), 2 + r() * 4);
}

export function drawBucket(g: G): void {
  const { width: w, height: h } = BUCKET_SIZE;
  // Henkel
  g.lineStyle(8, 0x6c757d);
  g.beginPath();
  g.arc(w / 2, 40, w / 2 - 14, Math.PI, 0, false);
  g.strokePath();
  // Eimer (oben breiter)
  g.fillStyle(0x2a9d8f);
  g.fillPoints([v(10, 40), v(w - 10, 40), v(w - 30, h), v(30, h)], true);
  g.fillStyle(0x21867a);
  g.fillPoints([v(w - 40, 40), v(w - 10, 40), v(w - 30, h), v(w - 52, h)], true);
  // Wasser oben
  g.fillStyle(0x8ecae6);
  g.fillEllipse(w / 2, 42, w - 24, 26);
  g.fillStyle(0xffffff, 0.5);
  g.fillEllipse(w / 2 - 30, 38, 40, 6);
}

/** Holzschild mit gemaltem Pfeil nach links (zurück auf die Wiese), mit Pfosten. */
export function drawExitSign(g: G): void {
  const { w, h } = CHALK_LAYOUT.exit;
  g.fillStyle(0x000000, 0.18);
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

/**
 * Tor zur Steinterrasse: graue Steinpfosten, hellblaue Holztür mit Kreide-Sonne; oben ein kleiner
 * Durchblick auf Steinplatten mit bunten Kreidestrichen. Fußpunkt unten Mitte.
 */
export function drawTerraceGate(g: G): void {
  const { width: w, height: h } = TERRACE_GATE_SIZE;
  // Durchblick oben: Steinplatten mit Kreide
  g.fillStyle(JOINT);
  g.fillRect(30, 22, w - 60, 50);
  g.fillStyle(STONE[0]);
  g.fillRect(32, 24, 54, 22);
  g.fillRect(90, 24, 54, 22);
  g.fillRect(148, 24, 50, 22);
  g.fillStyle(STONE[2]);
  g.fillRect(32, 48, 80, 22);
  g.fillRect(116, 48, 82, 22);
  g.lineStyle(4, 0xff6b6b);
  g.lineBetween(44, 64, 70, 54);
  g.lineStyle(4, 0x74c0fc);
  g.lineBetween(130, 34, 170, 40);
  // Steinpfosten mit Kappen
  const post = (x: number) => {
    g.fillStyle(0x9b958a);
    g.fillRect(x, 14, 30, h - 14);
    g.fillStyle(0xb5afa4);
    for (let y = 20; y < h; y += 26) g.fillRect(x + 2, y, 26, 22);
    g.fillStyle(0x7d776c);
    g.fillRect(x - 4, 6, 38, 12);
  };
  post(0);
  post(w - 30);
  // Torbogen
  g.lineStyle(10, 0x9b958a);
  g.beginPath();
  g.arc(w / 2, 30, w / 2 - 22, Math.PI, 0, false);
  g.strokePath();
  // Holztür (halbhoch), hellblau gestrichen
  const top = 78;
  g.fillStyle(0x5fa8d3);
  g.fillRect(34, top, w - 68, h - top - 4);
  g.lineStyle(2, 0x3d7ea6);
  for (let x = 34 + 27; x < w - 34; x += 27) g.lineBetween(x, top, x, h - 4);
  g.fillStyle(0x3d7ea6);
  g.fillRect(34, top + 18, w - 68, 10);
  g.fillRect(34, h - 40, w - 68, 10);
  // Kreide-Sonne auf der Tür (ohne Text)
  g.lineStyle(4, 0xffe066);
  g.strokeCircle(w / 2, top + 66, 18);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.lineBetween(w / 2 + Math.cos(a) * 25, top + 66 + Math.sin(a) * 25, w / 2 + Math.cos(a) * 34, top + 66 + Math.sin(a) * 34);
  }
  // Griff
  g.fillStyle(0x495057);
  g.fillCircle(w - 50, top + 70, 6);
}
