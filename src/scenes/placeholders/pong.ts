import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config';
import { BALL, PADDLE, TABLE } from '../../data/pong';

// Tischtennis (#90): Platte auf der Wiese, und fürs Pong-Spiel Rasen, Platte von oben, Schläger, Ball,
// Auswahlknöpfe 1P/2P.

type G = Phaser.GameObjects.Graphics;
const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

const TOP = 0x1f7a8c;
const TOP_DARK = 0x16606e;
const LEG = 0x495057;

/** Größe der Platte auf der Wiese (Katalog `pingpong`). */
export const PINGPONG_SIZE = { width: 300, height: 190 };

/** Tischtennisplatte auf der Wiese: schräg von vorn, mit Netz, zwei Schlägern und einem Ball. */
export function drawPingpongToy(g: G): void {
  const { width: w, height: h } = PINGPONG_SIZE;
  // Beine (hinten etwas kürzer)
  g.fillStyle(LEG);
  g.fillRect(40, 78, 10, 62);
  g.fillRect(w - 50, 78, 10, 62);
  g.fillRect(20, 110, 12, h - 110);
  g.fillRect(w - 32, 110, 12, h - 110);
  // Platte: Trapez (hinten schmaler), Kante vorn
  const top = [v(36, 40), v(w - 36, 40), v(w - 4, 112), v(4, 112)];
  g.fillStyle(TOP_DARK);
  g.fillRect(4, 112, w - 8, 12);
  g.fillStyle(TOP);
  g.fillPoints(top, true);
  g.lineStyle(4, 0xffffff);
  g.strokePoints(top, true);
  g.lineStyle(2, 0xffffff, 0.8);
  g.lineBetween(w / 2, 40, w / 2, 112);
  // Netz quer über die Mitte (von vorn gesehen schmal und hoch)
  g.fillStyle(0xf8f9fa, 0.85);
  g.fillPoints([v(w / 2 - 4, 22), v(w / 2 + 4, 22), v(w / 2 + 6, 114), v(w / 2 - 6, 114)], true);
  g.lineStyle(2, 0x343a40, 0.5);
  for (let y = 30; y < 112; y += 10) g.lineBetween(w / 2 - 5, y, w / 2 + 5, y);
  g.fillStyle(0x343a40);
  g.fillRect(w / 2 - 6, 16, 12, 8);
  // Schläger und Ball liegen darauf
  g.fillStyle(0x8d5524);
  g.fillRect(64, 82, 34, 8);
  g.fillStyle(0xd62828);
  g.fillEllipse(56, 84, 40, 26);
  g.fillStyle(0x8d5524);
  g.fillRect(w - 98, 60, 34, 7);
  g.fillStyle(0x212529);
  g.fillEllipse(w - 56, 62, 36, 22);
  g.fillStyle(0xff9f1c);
  g.fillCircle(w / 2 + 50, 86, 7);
  g.fillStyle(0xffffff, 0.6);
  g.fillCircle(w / 2 + 48, 84, 2.5);
}

/** Rasen von oben, mit Gänseblümchen. */
export function drawPongBg(g: G): void {
  g.fillStyle(0x6fbf4a);
  g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  let s = 7;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  // Grasbüschel
  for (let i = 0; i < 420; i++) {
    const x = rnd() * GAME_WIDTH;
    const y = rnd() * GAME_HEIGHT;
    g.fillStyle(rnd() < 0.5 ? 0x5ea83d : 0x82cc5c, 0.8);
    g.fillEllipse(x, y, 10 + rnd() * 16, 5 + rnd() * 6);
  }
  // Gänseblümchen
  for (let i = 0; i < 46; i++) {
    const x = rnd() * GAME_WIDTH;
    const y = rnd() * GAME_HEIGHT;
    g.fillStyle(0xffffff);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      g.fillCircle(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 4);
    }
    g.fillStyle(0xffd23f);
    g.fillCircle(x, y, 4);
  }
}

/** Rand um die Platte in der Textur (Schatten). */
export const TABLE_PAD = 30;

/** Platte von oben: blau-grün, weiße Linien, Netz quer in der Mitte, Schatten. */
export function drawPongTable(g: G): void {
  const { w, h } = TABLE;
  const p = TABLE_PAD;
  g.fillStyle(0x000000, 0.18);
  g.fillRoundedRect(p + 14, p + 18, w, h, 12);
  g.fillStyle(TOP_DARK);
  g.fillRoundedRect(p, p, w, h, 12);
  g.fillStyle(TOP);
  g.fillRoundedRect(p + 6, p + 6, w - 12, h - 12, 10);
  g.lineStyle(10, 0xffffff);
  g.strokeRect(p + 18, p + 18, w - 36, h - 36);
  g.lineStyle(4, 0xffffff, 0.8);
  g.lineBetween(p + 18, p + h / 2, p + w - 18, p + h / 2);
  // Netz: Pfosten über die Kante hinaus, Maschen
  const nx = p + w / 2;
  g.fillStyle(0x000000, 0.15);
  g.fillRect(nx - 4, p - 14, 22, h + 28);
  g.fillStyle(0xf1f3f5);
  g.fillRect(nx - 9, p - 16, 18, h + 32);
  g.lineStyle(2, 0x868e96, 0.8);
  for (let y = p - 10; y < p + h + 16; y += 12) g.lineBetween(nx - 9, y, nx + 9, y);
  g.fillStyle(0x343a40);
  g.fillRoundedRect(nx - 14, p - 30, 28, 22, 6);
  g.fillRoundedRect(nx - 14, p + h + 8, 28, 22, 6);
}

/** Schläger von oben: runder Belag (Farbe), Holzrand, Griff nach rechts. Mitte des Kopfs bei (PADDLE.radius + 4, Mitte). */
export const RACKET_SIZE = { width: PADDLE.radius * 2 + 100, height: PADDLE.radius * 2 + 8 };
/** Drehpunkt des Schlägers: Mitte des Kopfs. */
export const PADDLE_ORIGIN_X = (PADDLE.radius + 4) / RACKET_SIZE.width;

export function drawRacket(g: G, rubber: number): void {
  const r = PADDLE.radius;
  const cx = r + 4;
  const cy = RACKET_SIZE.height / 2;
  // Griff
  g.fillStyle(0x6f4518);
  g.fillRoundedRect(cx + r - 10, cy - 15, 104, 30, 12);
  g.fillStyle(0xa0682c);
  g.fillRoundedRect(cx + r - 10, cy - 12, 96, 20, 10);
  // Kopf
  g.fillStyle(0xd9a066);
  g.fillCircle(cx, cy, r + 2);
  g.fillStyle(rubber);
  g.fillCircle(cx, cy, r - 4);
  g.fillStyle(0xffffff, 0.18);
  g.fillEllipse(cx - r * 0.3, cy - r * 0.35, r * 0.9, r * 0.5);
}

export const BALL_SIZE = BALL.radius * 2 + 4;

/** Orangefarbener Ball mit Glanz. */
export function drawPongBall(g: G): void {
  const c = BALL_SIZE / 2;
  g.fillStyle(0xe8590c);
  g.fillCircle(c, c, BALL.radius);
  g.fillStyle(0xff922b);
  g.fillCircle(c - 2, c - 2, BALL.radius - 4);
  g.fillStyle(0xffffff, 0.7);
  g.fillCircle(c - 7, c - 7, 5);
}

/** Schatten des Balls (weich, wird mit der Höhe kleiner und blasser). */
export function drawBallShadow(g: G): void {
  const c = BALL_SIZE / 2;
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(c, c, BALL.radius * 2, BALL.radius * 1.4);
}

/** Runder Knopf für die Auswahl 1P/2P (die Porträts der Kinder liegen darüber). */
export function drawModeButton(g: G, size: number): void {
  const c = size / 2;
  g.fillStyle(0x000000, 0.2);
  g.fillCircle(c + 4, c + 6, c - 6);
  g.fillStyle(0xffffff);
  g.fillCircle(c, c, c - 6);
  g.lineStyle(Math.max(4, size / 24), 0x1f7a8c);
  g.strokeCircle(c, c, c - 8);
}
