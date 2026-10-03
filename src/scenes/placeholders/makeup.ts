import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config';
import { MIRROR, PEN_SIZE, RAINBOW } from '../../data/makeup';

// Kinderschminken: Hintergrund, Becher, Stifte, Puderdose und Quaste, Glitzerdosen, Schwamm, Spiegel.
// Was eingefärbt wird (Stiftkörper, Puder, Glitzer), ist weiß/grau gezeichnet und bekommt per Tint seine Farbe.

type G = Phaser.GameObjects.Graphics;
const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

/** Rosa Schminktisch-Zimmer: Tapete mit Punkten, Lichterreihe, Holztisch unten. */
export function drawMakeupBg(g: G): void {
  g.fillStyle(0xffd6e8);
  g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  g.fillStyle(0xffffff, 0.45);
  for (let y = 40; y < GAME_HEIGHT; y += 110) {
    for (let x = ((y / 110) % 2) * 55 + 30; x < GAME_WIDTH; x += 110) g.fillCircle(x, y, 9);
  }
  // Sanfter Schein hinter dem Kopf
  g.fillStyle(0xffffff, 0.35);
  g.fillCircle(GAME_WIDTH / 2, 580, 470);
  g.fillStyle(0xffffff, 0.3);
  g.fillCircle(GAME_WIDTH / 2, 580, 380);
  // Lichterkette oben
  g.lineStyle(4, 0x8d5a97);
  g.beginPath();
  g.moveTo(0, 30);
  for (let x = 0; x <= GAME_WIDTH; x += 40) g.lineTo(x, 30 + Math.sin(x / 150) * 22 + 22);
  g.strokePath();
  const cols = [0xffd166, 0xff8fab, 0x8ecae6, 0xb388eb, 0x95d5b2];
  for (let i = 0; i < 24; i++) {
    const x = 40 + i * 80;
    const y = 52 + Math.sin(x / 150) * 22 + 8;
    g.fillStyle(cols[i % cols.length], 0.35);
    g.fillCircle(x, y + 8, 22);
    g.fillStyle(cols[i % cols.length]);
    g.fillCircle(x, y + 8, 10);
  }
  // Tisch
  g.fillStyle(0x7a5536);
  g.fillRect(0, GAME_HEIGHT - 120, GAME_WIDTH, 120);
  g.fillStyle(0xb07f47);
  g.fillRect(0, GAME_HEIGHT - 120, GAME_WIDTH, 100);
  g.lineStyle(2, 0x8a5a2b, 0.6);
  for (let y = GAME_HEIGHT - 100; y < GAME_HEIGHT - 20; y += 26) g.lineBetween(0, y, GAME_WIDTH, y);
}

export const CUP_SIZE = { width: 420, height: 150 };

/** Stiftebecher (steht vor dem unteren Teil der Stifte). */
export function drawPenCup(g: G): void {
  const { width: w, height: h } = CUP_SIZE;
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(w / 2, h - 6, w - 10, 26);
  g.fillStyle(0x9d4edd);
  g.fillPoints([v(14, 8), v(w - 14, 8), v(w - 40, h - 10), v(40, h - 10)], true);
  g.fillStyle(0xc77dff);
  g.fillPoints([v(14, 8), v(w - 14, 8), v(w - 20, 44), v(20, 44)], true);
  g.fillStyle(0xffffff, 0.35);
  g.fillCircle(80, 80, 12);
  g.fillCircle(200, 100, 12);
  g.fillCircle(320, 80, 12);
  g.fillStyle(0xffffff, 0.25);
  g.fillRoundedRect(30, 56, 22, 70, 10);
}

/** Schminkstift mit der Spitze unten (weißer Körper, wird eingefärbt). */
export function drawPen(g: G): void {
  const { width: w, height: h } = PEN_SIZE;
  g.fillStyle(0xffffff);
  g.fillRoundedRect(4, 0, w - 8, h - 50, 10);
  g.fillPoints([v(4, h - 54), v(w - 4, h - 54), v(w / 2 + 6, h - 8), v(w / 2 - 6, h - 8)], true);
  // Kappe oben, dunkler Streifen und Spitze
  g.fillStyle(0x000000, 0.18);
  g.fillRoundedRect(4, 0, w - 8, 56, 10);
  g.fillStyle(0x000000, 0.12);
  g.fillRect(4, 96, w - 8, 12);
  g.fillStyle(0xffffff, 0.45);
  g.fillRoundedRect(10, 62, 8, 120, 4);
  g.fillStyle(0x3a2a22);
  g.fillPoints([v(w / 2 - 6, h - 12), v(w / 2 + 6, h - 12), v(w / 2, h)], true);
}

export const PAN_SIZE = 150;

/** Puderdose von oben: runde Schale (Rand pink, Rahmen), innen der Puder (Textur `mk-pan-fill`, eingefärbt). */
export function drawPan(g: G): void {
  const c = PAN_SIZE / 2;
  g.fillStyle(0x000000, 0.18);
  g.fillCircle(c + 4, c + 6, c - 6);
  g.fillStyle(0xf8f9fa);
  g.fillCircle(c, c, c - 6);
  g.lineStyle(5, 0xced4da);
  g.strokeCircle(c, c, c - 6);
}

export function drawPanFill(g: G): void {
  const c = PAN_SIZE / 2;
  g.fillStyle(0xffffff);
  g.fillCircle(c, c, c - 22);
  g.fillStyle(0x000000, 0.1);
  g.fillCircle(c + 8, c + 8, c - 36);
  g.fillStyle(0xffffff, 0.5);
  g.fillCircle(c - 18, c - 20, 12);
}

export const PUFF_HANDLE = { width: 24, height: 210 };
export const PUFF_HEAD = 120;

/** Puderquaste: Stiel (Holz mit Ring) und flauschiger Kopf (weiß, wird eingefärbt). */
export function drawPuffHandle(g: G): void {
  const { width: w, height: h } = PUFF_HANDLE;
  g.fillStyle(0xe9b872);
  g.fillRoundedRect(2, 0, w - 4, h, 10);
  g.fillStyle(0xffffff, 0.4);
  g.fillRoundedRect(5, 10, 5, h - 30, 3);
  g.fillStyle(0xd4a017);
  g.fillRect(0, h - 40, w, 10);
}

export function drawPuffHead(g: G): void {
  const c = PUFF_HEAD / 2;
  g.fillStyle(0xffffff);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.fillCircle(c + Math.cos(a) * 34, c + Math.sin(a) * 34, 24);
  }
  g.fillCircle(c, c, 38);
  g.fillStyle(0x000000, 0.08);
  g.fillCircle(c + 12, c + 14, 30);
  g.fillStyle(0xffffff, 0.7);
  g.fillCircle(c - 16, c - 18, 12);
}

export const JAR_SIZE = { width: 100, height: 130 };

/** Glitzerdose (Deckel oben, Streulöcher), Glas mit durchscheinendem Inhalt. */
export function drawJar(g: G): void {
  const { width: w, height: h } = JAR_SIZE;
  g.fillStyle(0xdbeafe, 0.55);
  g.fillRoundedRect(8, 30, w - 16, h - 34, 16);
  g.lineStyle(4, 0x9bb7d4);
  g.strokeRoundedRect(8, 30, w - 16, h - 34, 16);
  g.fillStyle(0xffffff, 0.5);
  g.fillRoundedRect(16, 44, 9, h - 62, 4);
  g.fillStyle(0x6c757d);
  g.fillRoundedRect(14, 6, w - 28, 30, 8);
  g.fillStyle(0xadb5bd);
  g.fillRoundedRect(14, 6, w - 28, 12, 8);
  g.fillStyle(0x343a40);
  for (let i = 0; i < 4; i++) g.fillCircle(30 + i * 13, 26, 3);
}

/** Glitzer im Glas (weiß, wird eingefärbt). */
export function drawJarFill(g: G): void {
  const { width: w, height: h } = JAR_SIZE;
  g.fillStyle(0xffffff);
  g.fillRoundedRect(14, 56, w - 28, h - 66, 12);
  g.fillStyle(0x000000, 0.12);
  g.fillRoundedRect(w / 2, 56, w / 2 - 14, h - 66, 12);
  g.fillStyle(0xffffff);
  for (let i = 0; i < 9; i++) g.fillCircle(24 + ((i * 29) % (w - 48)), 66 + ((i * 17) % 30), 3);
}

/** Glitzer im Glas, bunt. */
export function drawJarRainbow(g: G): void {
  const { width: w, height: h } = JAR_SIZE;
  const bands = RAINBOW.length;
  for (let i = 0; i < bands; i++) {
    g.fillStyle(RAINBOW[i]);
    const y = 56 + (i * (h - 66)) / bands;
    g.fillRect(14, y, w - 28, (h - 66) / bands + 1);
  }
  g.fillStyle(0xffffff, 0.35);
  g.fillCircle(30, 70, 5);
  g.fillCircle(66, 96, 4);
}

export const MAKEUP_SPONGE_SIZE = { width: 170, height: 120 };

/** Gelber Schwamm mit Poren, Unterseite grün. */
export function drawMakeupSponge(g: G): void {
  const { width: w, height: h } = MAKEUP_SPONGE_SIZE;
  g.fillStyle(0x2d9d4a);
  g.fillRoundedRect(4, 34, w - 8, h - 36, 20);
  g.fillStyle(0xffd23f);
  g.fillRoundedRect(4, 8, w - 8, h - 50, 22);
  g.fillStyle(0xe6b422);
  for (const [x, y, r] of [[34, 36, 8], [80, 28, 6], [120, 44, 9], [58, 56, 6], [138, 26, 5], [100, 62, 6]]) g.fillCircle(x, y, r);
  g.fillStyle(0xffffff, 0.4);
  g.fillRoundedRect(14, 12, 60, 10, 5);
}

/** Handspiegel mit Rahmen und Glanz. */
export function drawMirror(g: G): void {
  const { w, h } = MIRROR;
  g.fillStyle(0xe9b872);
  g.fillRoundedRect(w / 2 - 14, h * 0.55, 28, h * 0.45, 12);
  g.fillStyle(0xff8fab);
  g.fillEllipse(w / 2, h * 0.34, w - 4, h * 0.68);
  g.fillStyle(0xcfeaff);
  g.fillEllipse(w / 2, h * 0.34, w - 28, h * 0.68 - 24);
  g.fillStyle(0xffffff, 0.8);
  g.fillPoints([v(w / 2 - 30, h * 0.14), v(w / 2 - 12, h * 0.1), v(w / 2 - 44, h * 0.42), v(w / 2 - 52, h * 0.34)], true);
  g.fillStyle(0xffd166);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.fillCircle(w / 2 + Math.cos(a) * (w / 2 - 14), h * 0.34 + Math.sin(a) * (h * 0.34 - 6), 4);
  }
}

/** Runder Pinselpunkt (weiß, wird eingefärbt) für Stift und Schwamm. */
export function drawBrushDot(g: G): void {
  g.fillStyle(0xffffff);
  g.fillCircle(32, 32, 31);
}

/** Glitzerkörnchen: kleine Raute mit Glanz. */
export function drawGrain(g: G): void {
  g.fillStyle(0xffffff);
  g.fillPoints([v(8, 0), v(16, 8), v(8, 16), v(0, 8)], true);
  g.fillStyle(0x000000, 0.18);
  g.fillPoints([v(8, 8), v(16, 8), v(8, 16)], true);
  g.fillStyle(0xffffff);
  g.fillCircle(6, 6, 2);
}

/** Das Spielzeug: Schminkkoffer mit Henkel, Stern und Pinsel-Symbol. */
export function drawMakeupCaseToy(g: G): void {
  g.lineStyle(6, 0x7b2d8b);
  g.beginPath();
  g.arc(55, 18, 24, Math.PI, 0, false);
  g.strokePath();
  g.fillStyle(0x7b2d8b);
  g.fillRoundedRect(0, 16, 110, 64, 12);
  g.fillStyle(0xff8fab);
  g.fillRoundedRect(5, 20, 100, 54, 10);
  g.fillStyle(0xffd166);
  g.fillRect(5, 36, 100, 6);
  // Stern
  g.fillStyle(0xffffff);
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const d = i % 2 === 0 ? 14 : 6;
    pts.push(v(36 + Math.cos(a) * d, 58 + Math.sin(a) * d));
  }
  g.fillPoints(pts, true);
  // Lippenstift
  g.fillStyle(0xe63946);
  g.fillRoundedRect(68, 46, 12, 22, 3);
  g.fillStyle(0xadb5bd);
  g.fillRect(66, 62, 16, 8);
  // Verschluss
  g.fillStyle(0xffd23f);
  g.fillCircle(92, 56, 7);
}
