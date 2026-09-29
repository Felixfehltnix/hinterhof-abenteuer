import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config';

// Ankleidekiste (#70): die große Pappkiste auf der Wiese und ihr gemütlicher Innenraum.
// Maße der Kiste relativ zum Fußpunkt (Mitte unten), Raum in Bildschirmkoordinaten 1920 × 1080.

type G = Phaser.GameObjects.Graphics;
const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

const CARD = 0xc9a06a;
const CARD_DARK = 0xa87f4c;
const CARD_LIGHT = 0xdcb987;
const TAPE = 0xe8d7a8;

// --- Pappkiste auf der Wiese ---------------------------------------------------------

/** Bildfläche der Kiste; Fußpunkt (Mitte der Vorderkante unten) bei (BOX.footX, BOX.footY). */
export const BOX = {
  width: 480,
  height: 440,
  footX: 210,
  footY: 440,
  /** Vorderseite (im Bild) und Tür (Rundbogen) relativ zum Fußpunkt. */
  front: { left: -170, right: 170, top: -300 },
  door: { x: -40, width: 150, height: 210 },
  /** Tiefe der Kiste (Seitenwand schräg nach rechts oben). */
  depth: { x: 90, y: -60 },
};

/** Große Pappkiste mit ausgeschnittener Tür, offenen Klappen, Klebeband und Kritzeleien. */
export function drawDressBox(g: G): void {
  const { front: F, door: D, depth: P } = BOX;
  g.save();
  g.translateCanvas(BOX.footX, BOX.footY);
  const H = -F.top;
  // Klappen oben, nach außen geklappt (hinten, links, rechts)
  g.fillStyle(CARD_LIGHT);
  g.fillPoints([v(F.left + P.x, F.top + P.y), v(F.right + P.x, F.top + P.y), v(F.right + P.x - 30, F.top + P.y - 90), v(F.left + P.x + 30, F.top + P.y - 90)], true);
  g.fillStyle(CARD);
  g.fillPoints([v(F.right, F.top), v(F.right + P.x, F.top + P.y), v(F.right + P.x + 70, F.top + P.y - 40), v(F.right + 70, F.top - 30)], true);
  // Seitenwand (dunkler)
  g.fillStyle(CARD_DARK);
  g.fillPoints([v(F.right, 0), v(F.right, F.top), v(F.right + P.x, F.top + P.y), v(F.right + P.x, P.y)], true);
  g.lineStyle(2, 0x8c6a3c, 0.5);
  for (let i = 1; i < 6; i++) g.lineBetween(F.right + (P.x * i) / 6, (P.y * i) / 6, F.right + (P.x * i) / 6, F.top + (P.y * i) / 6);
  // Vorderseite
  g.fillStyle(CARD);
  g.fillRect(F.left, F.top, F.right - F.left, H);
  // Wellpappe-Kante oben
  g.fillStyle(CARD_LIGHT);
  g.fillRect(F.left, F.top, F.right - F.left, 10);
  g.lineStyle(2, CARD_DARK);
  for (let x = F.left + 6; x < F.right; x += 12) g.lineBetween(x, F.top + 1, x + 6, F.top + 9);
  // Vordere Klappe hängt nach vorn herunter
  g.fillStyle(CARD_LIGHT);
  g.fillPoints([v(F.left, F.top), v(F.right, F.top), v(F.right - 20, F.top - 70), v(F.left + 20, F.top - 70)], true);
  g.lineStyle(3, CARD_DARK);
  g.lineBetween(F.left, F.top, F.right, F.top);
  // Klebeband
  g.fillStyle(TAPE, 0.9);
  g.fillRect(-18, F.top - 70, 36, 110);
  // Tür (Rundbogen, innen gemütliches Licht und ein Kissen)
  const dl = D.x - D.width / 2;
  g.fillStyle(0x6b3f2a);
  g.fillRoundedRect(dl - 6, -D.height - 6, D.width + 12, D.height + 6, { tl: D.width / 2 + 6, tr: D.width / 2 + 6, bl: 0, br: 0 });
  g.fillStyle(0xffd9a0);
  g.fillRoundedRect(dl, -D.height, D.width, D.height, { tl: D.width / 2, tr: D.width / 2, bl: 0, br: 0 });
  g.fillStyle(0xffc2d9);
  g.fillEllipse(D.x + 20, -24, 90, 40);
  g.fillStyle(0x9bf6ff);
  g.fillEllipse(D.x - 34, -18, 60, 30);
  // Kritzeleien mit Wachsmalstiften: Sonne, Herz, Stern, Blume und ein T-Shirt
  g.lineStyle(5, 0xffc300);
  g.strokeCircle(80, -230, 22);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.lineBetween(80 + Math.cos(a) * 30, -230 + Math.sin(a) * 30, 80 + Math.cos(a) * 42, -230 + Math.sin(a) * 42);
  }
  g.fillStyle(0xe63946);
  g.fillCircle(118, -120, 13);
  g.fillCircle(140, -120, 13);
  g.fillTriangle(106, -114, 152, -114, 129, -86);
  g.lineStyle(4, 0x4361ee);
  g.strokePoints(starPoints(-120, -250, 26, 11), true);
  g.lineStyle(4, 0x2d6a4f);
  g.lineBetween(-140, -20, -140, -80);
  g.fillStyle(0xff70a6);
  for (let i = 0; i < 5; i++) g.fillCircle(-140 + Math.cos((i / 5) * Math.PI * 2) * 12, -90 + Math.sin((i / 5) * Math.PI * 2) * 12, 8);
  g.fillStyle(0xffd166);
  g.fillCircle(-140, -90, 6);
  // T-Shirt: Hinweis, dass es hier ums Anziehen geht
  g.fillStyle(0x9b5de5);
  g.fillPoints([v(62, -180), v(84, -192), v(100, -186), v(116, -192), v(138, -180), v(128, -162), v(120, -166), v(120, -130), v(80, -130), v(80, -166), v(72, -162)], true);
  g.restore();
}

function starPoints(cx: number, cy: number, r: number, inner: number): Phaser.Math.Vector2[] {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? inner : r;
    pts.push(v(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr));
  }
  return pts;
}

// --- Innenraum (Ankleide-Spiel) ----------------------------------------------------------

export const ROOM = {
  floorY: 780,
  /** Ausgang: ausgeschnittene Tür in der linken Wand, draußen scheint die Sonne. */
  door: { x: 30, y: 360, w: 190, h: 460 },
  /** Großer Spiegel im Hintergrund (Glasfläche). */
  mirror: { x: 330, y: 90, w: 420, h: 640 },
  /** Wo das Kind steht (Fußpunkt) und wie groß es gezeigt wird. */
  kid: { x: 790, y: 1010, scale: 1.9 },
  /** Kleiderständer rechts: 4 Reihen (Kopf, Oberteil, Hose/Rock, Schuhe) mit je 10 Plätzen. */
  rack: { left: 955, right: 1885, rows: [200, 430, 660, 930], cell: 93 },
};

/** Innenraum der Kiste: Pappwände, Wimpelkette, Lampe, Bilder, Spiegel, Kissen, Kleiderständer, Tür. */
export function drawDressRoom(g: G): void {
  const W = GAME_WIDTH;
  const H = GAME_HEIGHT;
  const { floorY, door: D, mirror: M, rack: R } = ROOM;
  // Wände aus Pappe mit warmem Licht
  g.fillStyle(0xd9b27c);
  g.fillRect(0, 0, W, floorY);
  g.fillStyle(0xe6c492, 0.6);
  g.fillEllipse(W / 2, 260, 1500, 520);
  g.lineStyle(2, 0xc49a62, 0.5);
  for (let x = 40; x < W; x += 90) g.lineBetween(x, 0, x, floorY);
  // Boden: Holzdielen und ein runder bunter Teppich
  g.fillStyle(0xb07d4f);
  g.fillRect(0, floorY, W, H - floorY);
  g.lineStyle(3, 0x8f6239);
  for (let y = floorY + 50; y < H; y += 60) g.lineBetween(0, y, W, y);
  const rug = [0xff8fab, 0xffc8dd, 0xbde0fe, 0xffe066, 0xcdb4db];
  rug.forEach((c, i) => {
    g.fillStyle(c);
    g.fillEllipse(640, 985, 760 - i * 120, 180 - i * 30);
  });
  // Wimpelkette oben
  const flags = [0xe63946, 0xffc300, 0x06d6a0, 0x4cc9f0, 0x9b5de5, 0xff70a6];
  g.lineStyle(3, 0x6b4a2b);
  const pts: Phaser.Math.Vector2[] = [];
  for (let x = 0; x <= W; x += 20) pts.push(v(x, 40 + Math.sin((x / W) * Math.PI * 3) * 26 + 30));
  g.strokePoints(pts);
  for (let i = 0; i < pts.length - 3; i += 3) {
    const p = pts[i];
    const q = pts[i + 2];
    g.fillStyle(flags[(i / 3) % flags.length]);
    g.fillTriangle(p.x, p.y, q.x, q.y, (p.x + q.x) / 2, (p.y + q.y) / 2 + 46);
  }
  // Hängelampe mit warmem Schein
  g.fillStyle(0xffe8b0, 0.35);
  g.fillCircle(820, 170, 110);
  g.lineStyle(3, 0x5a4636);
  g.lineBetween(820, 0, 820, 120);
  g.fillStyle(0xff8fab);
  g.fillPoints([v(780, 170), v(860, 170), v(840, 118), v(800, 118)], true);
  g.fillStyle(0xfff3b0);
  g.fillCircle(820, 178, 12);
  // Gemalte Bilder an der Wand (Regenbogen, Haus, Katze)
  const frame = (x: number, y: number, w: number, h: number, draw: () => void) => {
    g.fillStyle(0xffffff);
    g.fillRect(x, y, w, h);
    draw();
    g.fillStyle(0xe8d7a8, 0.9);
    g.fillRect(x + w / 2 - 20, y - 8, 40, 16);
  };
  frame(1020, 60, 150, 110, () => {
    [0xe63946, 0xffc300, 0x06d6a0, 0x4361ee].forEach((c, i) => {
      g.lineStyle(8, c);
      g.beginPath();
      g.arc(1095, 160, 60 - i * 10, Math.PI, 0, false);
      g.strokePath();
    });
  });
  frame(1250, 70, 120, 100, () => {
    g.fillStyle(0xe63946);
    g.fillTriangle(1270, 120, 1350, 120, 1310, 84);
    g.fillStyle(0xffc300);
    g.fillRect(1280, 120, 60, 40);
    g.fillStyle(0x6b4a2b);
    g.fillRect(1302, 136, 16, 24);
  });
  frame(1450, 60, 120, 110, () => {
    g.fillStyle(0x6c757d);
    g.fillCircle(1510, 125, 26);
    g.fillTriangle(1488, 108, 1496, 82, 1506, 102);
    g.fillTriangle(1532, 108, 1524, 82, 1514, 102);
    g.fillStyle(0x222222);
    g.fillCircle(1500, 122, 3);
    g.fillCircle(1520, 122, 3);
  });

  // Tür nach draußen: Ausschnitt in der Pappe, draußen Himmel und Wiese
  g.fillStyle(0x8f6a3c);
  g.fillRoundedRect(D.x - 12, D.y - 12, D.w + 24, D.h + 12, { tl: D.w / 2 + 12, tr: D.w / 2 + 12, bl: 0, br: 0 });
  g.fillStyle(0x9fd8ff);
  g.fillRoundedRect(D.x, D.y, D.w, D.h, { tl: D.w / 2, tr: D.w / 2, bl: 0, br: 0 });
  g.fillStyle(0x7cc96a);
  g.fillRect(D.x, D.y + D.h * 0.62, D.w, D.h * 0.38);
  g.fillStyle(0xffe066);
  g.fillCircle(D.x + D.w * 0.7, D.y + 110, 26);
  g.fillStyle(0xffffff);
  g.fillEllipse(D.x + 60, D.y + 170, 70, 26);
  g.fillStyle(0x2d6a4f);
  g.fillCircle(D.x + 50, D.y + D.h * 0.62, 30);

  // Spiegel auf Füßen mit goldenem Rahmen (die Glasfläche zeichnet die Szene darüber)
  g.fillStyle(0xc9a227);
  g.fillRoundedRect(M.x - 26, M.y - 26, M.w + 52, M.h + 52, 60);
  g.fillStyle(0xe9c46a);
  g.fillRoundedRect(M.x - 14, M.y - 14, M.w + 28, M.h + 28, 52);
  g.fillStyle(0xc9a227);
  g.fillRect(M.x + 40, M.y + M.h + 20, 20, 60);
  g.fillRect(M.x + M.w - 60, M.y + M.h + 20, 20, 60);
  g.fillStyle(0xdff3ff);
  g.fillRoundedRect(M.x, M.y, M.w, M.h, 44);

  // Viele Kissen auf dem Boden
  const cushion = (x: number, y: number, w: number, h: number, c: number, dot: number) => {
    g.fillStyle(c);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2.2);
    g.fillStyle(dot);
    for (let i = -1; i <= 1; i++) g.fillCircle(x + i * (w / 4), y, 6);
  };
  cushion(260, 900, 200, 110, 0xffafcc, 0xffffff);
  cushion(130, 980, 230, 120, 0x9bf6ff, 0x4cc9f0);
  cushion(370, 1000, 170, 90, 0xffe066, 0xf77f00);
  cushion(800, 930, 190, 100, 0xcdb4db, 0x9b5de5);
  cushion(880, 1030, 220, 100, 0xa0c4ff, 0xffffff);
  cushion(720, 1040, 150, 80, 0xb9fbc0, 0x06d6a0);
  // Teddy auf dem Kissen
  g.fillStyle(0xa0754b);
  g.fillCircle(260, 820, 34);
  g.fillCircle(236, 790, 13);
  g.fillCircle(284, 790, 13);
  g.fillEllipse(260, 870, 70, 60);
  g.fillStyle(0xd8b58a);
  g.fillCircle(260, 830, 13);
  g.fillStyle(0x222222);
  g.fillCircle(250, 815, 3);
  g.fillCircle(270, 815, 3);

  // Kleiderständer: Hutbrett oben, zwei Kleiderstangen, Schuhregal unten
  const wood = 0x8b5a2b;
  const gold = 0xd4a017;
  g.fillStyle(wood);
  g.fillRect(R.left - 20, R.rows[0] + 50, R.right - R.left + 40, 16);
  g.fillRect(R.left - 30, 80, 18, 1000 - 80);
  g.fillRect(R.right + 12, 80, 18, 1000 - 80);
  g.fillStyle(gold);
  g.fillRoundedRect(R.left - 20, R.rows[1] - 70, R.right - R.left + 40, 12, 6);
  g.fillRoundedRect(R.left - 20, R.rows[2] - 70, R.right - R.left + 40, 12, 6);
  g.fillStyle(wood);
  g.fillRect(R.left - 20, R.rows[3] + 50, R.right - R.left + 40, 18);
  g.fillRect(R.left - 20, 1000, R.right - R.left + 40, 20);
}

/** Kleiderbügel (für Oberteile und Hosen am Kleiderständer). */
export function drawHanger(g: G): void {
  g.lineStyle(4, 0x6b4a2b);
  g.beginPath();
  g.arc(40, 12, 8, Math.PI, Math.PI * 2.2, false);
  g.strokePath();
  g.lineBetween(40, 20, 6, 42);
  g.lineBetween(40, 20, 74, 42);
  g.lineBetween(6, 42, 74, 42);
}

/** Weicher Schein hinter dem angezogenen Teil. */
export function drawItemGlow(g: G): void {
  for (let i = 10; i >= 1; i--) {
    g.fillStyle(0xfff3b0, 0.09);
    g.fillCircle(60, 60, i * 6);
  }
}
