import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config';
import { ARM, MIRROR, PEN_SIZE, RAINBOW, SHEET, STENCIL, SWITCH, type ShapeId } from '../../data/makeup';

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

// --- Glitzertattoos ---------------------------------------------------------------------------

const ci = (g: G, x: number, y: number, r: number) => g.fillCircle(x, y, r);
const poly = (g: G, pts: number[]) => {
  const out: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < pts.length; i += 2) out.push(v(pts[i], pts[i + 1]));
  g.fillPoints(out, true);
};

function star(g: G, cx: number, cy: number, r: number): void {
  const pts: number[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const d = i % 2 === 0 ? r : r * 0.45;
    pts.push(cx + Math.cos(a) * d, cy + Math.sin(a) * d);
  }
  poly(g, pts);
}

/** Umriss einer Vorlage (weiß auf durchsichtig) in einer Fläche von STENCIL.shapeSize². */
export function drawShape(g: G, id: ShapeId): void {
  g.fillStyle(0xffffff);
  switch (id) {
    case 'unicorn':
      poly(g, [60, 185, 75, 110, 70, 70, 95, 55, 125, 60, 150, 85, 172, 105, 178, 125, 160, 140, 140, 138, 130, 160, 122, 185]);
      poly(g, [95, 58, 104, 22, 120, 60]);
      poly(g, [118, 64, 152, 4, 136, 74]);
      for (const [x, y, r] of [[62, 88, 16], [52, 120, 16], [58, 152, 16], [68, 180, 12]]) ci(g, x, y, r);
      star(g, 150, 30, 12);
      break;
    case 'dragon':
      g.fillEllipse(96, 128, 112, 80);
      ci(g, 150, 86, 34);
      g.fillRoundedRect(150, 82, 46, 28, 12);
      poly(g, [132, 62, 138, 30, 152, 58]);
      poly(g, [154, 58, 166, 28, 174, 62]);
      poly(g, [70, 104, 28, 30, 60, 62, 76, 34, 100, 88]);
      for (const [x, y, r] of [[44, 150, 16], [26, 145, 12], [14, 132, 9], [10, 116, 7]]) ci(g, x, y, r);
      poly(g, [4, 108, 22, 96, 14, 120]);
      g.fillRoundedRect(76, 158, 24, 32, 8);
      g.fillRoundedRect(122, 158, 24, 32, 8);
      for (const x of [72, 96, 120]) poly(g, [x - 10, 94, x, 74, x + 10, 94]);
      break;
    case 'fairy':
      g.fillEllipse(62, 92, 48, 84);
      g.fillEllipse(138, 92, 48, 84);
      ci(g, 100, 50, 22);
      ci(g, 100, 26, 10);
      poly(g, [100, 70, 56, 152, 144, 152]);
      g.fillRoundedRect(86, 150, 12, 38, 5);
      g.fillRoundedRect(104, 150, 12, 38, 5);
      poly(g, [142, 100, 176, 62, 182, 68, 148, 108]);
      star(g, 178, 46, 17);
      break;
    case 'icecream':
      poly(g, [58, 102, 142, 102, 100, 192]);
      ci(g, 100, 74, 46);
      for (const x of [62, 100, 138]) ci(g, x, 102, 15);
      ci(g, 100, 24, 13);
      poly(g, [100, 14, 112, -2, 116, 2, 106, 18]);
      break;
    case 'strawberry':
      ci(g, 58, 92, 34);
      ci(g, 142, 92, 34);
      ci(g, 100, 110, 52);
      poly(g, [48, 120, 152, 120, 100, 192]);
      poly(g, [58, 62, 78, 24, 92, 52, 100, 14, 108, 52, 122, 24, 142, 62]);
      break;
    case 'pizza':
      poly(g, [30, 46, 170, 46, 100, 192]);
      g.fillRoundedRect(18, 22, 164, 34, 17);
      break;
    case 'butterfly':
      g.fillEllipse(62, 78, 74, 84);
      g.fillEllipse(138, 78, 74, 84);
      g.fillEllipse(70, 140, 52, 62);
      g.fillEllipse(130, 140, 52, 62);
      g.fillRoundedRect(92, 52, 16, 124, 8);
      poly(g, [96, 56, 76, 14, 82, 10, 102, 50]);
      poly(g, [104, 56, 124, 14, 118, 10, 98, 50]);
      ci(g, 79, 10, 8);
      ci(g, 121, 10, 8);
      break;
    case 'cat':
      ci(g, 100, 68, 42);
      poly(g, [64, 52, 66, 8, 98, 36]);
      poly(g, [136, 52, 134, 8, 102, 36]);
      g.fillEllipse(100, 142, 104, 96);
      g.fillRoundedRect(62, 168, 30, 24, 10);
      g.fillRoundedRect(108, 168, 30, 24, 10);
      for (const [x, y, r] of [[152, 172, 13], [168, 152, 12], [174, 128, 11], [168, 106, 10]]) ci(g, x, y, r);
      break;
    case 'fish':
      g.fillEllipse(86, 102, 134, 88);
      poly(g, [140, 102, 192, 56, 182, 102, 192, 148]);
      poly(g, [56, 62, 88, 26, 114, 62]);
      poly(g, [76, 140, 100, 176, 112, 138]);
      ci(g, 24, 44, 9);
      ci(g, 38, 22, 5);
      break;
  }
}

/** Vorlagen-Papier (ganz, die Form wird in BootScene ausgestanzt): hellblaue Folie mit Rand und Pünktchen. */
export function drawPaper(g: G): void {
  const w = STENCIL.size;
  g.fillStyle(0x000000, 0.14);
  g.fillRoundedRect(4, 6, w - 6, w - 6, 22);
  g.fillStyle(0xdff0ff);
  g.fillRoundedRect(0, 0, w - 6, w - 6, 22);
  g.lineStyle(4, 0x9bb7d4);
  g.strokeRoundedRect(3, 3, w - 12, w - 12, 20);
  g.fillStyle(0xffffff, 0.7);
  for (let i = 0; i < 8; i++) {
    ci(g, 20 + i * 31, 14, 3);
    ci(g, 20 + i * 31, w - 20, 3);
    ci(g, 14, 20 + i * 31, 3);
    ci(g, w - 20, 20 + i * 31, 3);
  }
}

/** Eingerollte Ecke, wenn sich die Vorlage lösen lässt. */
export const CURL_SIZE = 70;
export function drawCurl(g: G): void {
  const w = CURL_SIZE;
  g.fillStyle(0x000000, 0.18);
  poly(g, [6, 8, w, 4, w - 2, w]);
  g.fillStyle(0xffffff);
  poly(g, [0, 0, w - 6, 0, w - 6, w - 6]);
  g.fillStyle(0xb8d4ee);
  poly(g, [0, 0, w - 6, w - 6, 8, w - 24]);
}

/** Bogen mit den neun Feldern. */
export function drawSheet(g: G): void {
  const { size, pad, cell } = SHEET;
  g.fillStyle(0x000000, 0.16);
  g.fillRoundedRect(8, 10, size, size, 26);
  g.fillStyle(0xffffff);
  g.fillRoundedRect(0, 0, size, size, 26);
  g.lineStyle(5, 0xffb3d1);
  g.strokeRoundedRect(4, 4, size - 8, size - 8, 24);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      g.fillStyle([0xf1e6ff, 0xffe3ec, 0xdff5ff][r]);
      g.fillRoundedRect(pad + c * cell + 6, pad + r * cell + 6, cell - 12, cell - 12, 16);
    }
  }
}

export const MODE_SWITCH_SIZE = SWITCH.size;

/** Knopf unten: 'face' zeigt ein Gesicht, 'arm' einen Arm mit Stern. */
export function drawModeSwitch(g: G, kind: 'face' | 'arm'): void {
  const c = MODE_SWITCH_SIZE / 2;
  g.fillStyle(0x000000, 0.2);
  g.fillCircle(c + 3, c + 5, c - 4);
  g.fillStyle(0xffffff);
  g.fillCircle(c, c, c - 4);
  g.lineStyle(5, 0xff8fab);
  g.strokeCircle(c, c, c - 6);
  if (kind === 'face') {
    g.fillStyle(0xf4c9a3);
    g.fillCircle(c, c, 30);
    g.fillStyle(0x222222);
    g.fillCircle(c - 11, c - 6, 4);
    g.fillCircle(c + 11, c - 6, 4);
    g.lineStyle(4, 0x222222);
    g.beginPath();
    g.arc(c, c + 4, 12, 0.15 * Math.PI, 0.85 * Math.PI, false);
    g.strokePath();
    g.fillStyle(0xff8fab, 0.6);
    g.fillCircle(c - 20, c + 8, 6);
    g.fillCircle(c + 20, c + 8, 6);
  } else {
    g.fillStyle(0xf4c9a3);
    g.fillRoundedRect(c - 36, c - 16, 72, 32, 14);
    g.fillStyle(0xffd166);
    star(g, c + 2, c, 13);
  }
}

/** Kleber-Töpfchen: blauer Tiegel mit weißem Kleber obenauf und einem Tropfen auf dem Etikett. */
export const GLUE_POT_SIZE = { width: 150, height: 150 };
export function drawGluePot(g: G): void {
  const { width: w, height: h } = GLUE_POT_SIZE;
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(w / 2 + 3, h - 8, w - 20, 24);
  g.fillStyle(0x1d70b8);
  g.fillRoundedRect(14, 44, w - 28, h - 56, 20);
  g.fillStyle(0x2f8fdf);
  g.fillRoundedRect(14, 44, w - 28, 26, 14);
  g.fillStyle(0xffffff);
  g.fillEllipse(w / 2, 46, w - 38, 28);
  g.fillStyle(0xdff3ff);
  g.fillEllipse(w / 2 - 6, 44, w - 70, 16);
  g.fillStyle(0xffffff);
  g.fillRoundedRect(36, 84, w - 72, 42, 12);
  g.fillStyle(0x4cc9f0);
  g.fillCircle(w / 2, 108, 12);
  poly(g, [w / 2 - 9, 104, w / 2, 86, w / 2 + 9, 104]);
}

/** Kleberpinsel, Spitze unten. */
export const GLUE_BRUSH_SIZE = { width: 36, height: 250 };
export function drawGlueBrush(g: G): void {
  const { width: w, height: h } = GLUE_BRUSH_SIZE;
  g.fillStyle(0xe9b872);
  g.fillRoundedRect(8, 0, w - 16, h - 90, 8);
  g.fillStyle(0xffffff, 0.4);
  g.fillRoundedRect(12, 8, 5, h - 110, 3);
  g.fillStyle(0xadb5bd);
  g.fillRoundedRect(4, h - 100, w - 8, 44, 6);
  g.fillStyle(0x6c757d);
  g.fillRect(4, h - 78, w - 8, 4);
  g.fillStyle(0xeaf6ff);
  g.fillPoints([v(5, h - 58), v(w - 5, h - 58), v(w / 2 + 3, h - 4), v(w / 2 - 3, h - 4)], true);
  g.fillStyle(0xbfe3ff);
  g.fillPoints([v(w / 2, h - 58), v(w - 5, h - 58), v(w / 2 + 3, h - 4)], true);
}

/** Arm in Hautfarbe mit Ärmel in der Farbe des Oberteils, von der Seite. Textur ARM.w × ARM.h. */
export function drawArm(g: G, skin: number, shirt: number): void {
  const { w, h } = ARM;
  const shade = Phaser.Display.Color.IntegerToColor(skin).darken(10).color;
  const light = Phaser.Display.Color.IntegerToColor(skin).lighten(8).color;
  // Hand (rechts): Handfläche, Daumen, Finger
  g.fillStyle(skin);
  g.fillEllipse(w - 90, h / 2, 190, 240);
  g.fillRoundedRect(w - 110, 0, 100, 74, 36);
  for (let i = 0; i < 3; i++) g.fillRoundedRect(w - 70, 78 + i * 62, 70, 52, 24);
  // Unterarm
  g.fillStyle(skin);
  g.fillRoundedRect(70, 16, w - 220, h - 32, 60);
  g.fillStyle(shade);
  g.fillRoundedRect(70, h - 62, w - 220, 46, 22);
  g.fillStyle(light, 0.6);
  g.fillRoundedRect(150, 26, w - 420, 26, 13);
  // Ärmel
  g.fillStyle(shirt);
  g.fillRoundedRect(0, 4, 140, h - 8, 36);
  g.fillStyle(0x000000, 0.12);
  g.fillRoundedRect(112, 4, 28, h - 8, 14);
}
