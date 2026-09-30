import Phaser from 'phaser';

// Bunker-Eingang (Buddeln mit der Schaufel): Loch, Erdhaufen, Betonrahmen mit Stahlluke und
// rotem Handrad. Alles liegt flach auf der Wiese (schräg von vorn gesehen), Mitte = Bildmitte.

type G = Phaser.GameObjects.Graphics;
const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

export const DIG_HOLE_SIZE = { width: 200, height: 70 };
export const DIRT_PILE_SIZE = { width: 120, height: 64 };
export const BUNKER_FRAME_SIZE = { width: 240, height: 100 };
export const BUNKER_LID_SIZE = { width: 170, height: 58 };
export const BUNKER_WHEEL_SIZE = { width: 76, height: 32 };

const SOIL = 0x7a5230;
const SOIL_DARK = 0x4a2f18;
const SOIL_LIGHT = 0x9c6d44;

/** Frisch gegrabenes Loch: aufgewühlter Rand, dunkle Mitte. */
export function drawDigHole(g: G): void {
  const { width: w, height: h } = DIG_HOLE_SIZE;
  g.fillStyle(SOIL_LIGHT);
  g.fillEllipse(w / 2, h / 2, w, h);
  g.fillStyle(SOIL);
  g.fillEllipse(w / 2, h / 2 + 2, w - 24, h - 16);
  g.fillStyle(SOIL_DARK);
  g.fillEllipse(w / 2, h / 2 + 6, w - 64, h - 32);
  // Krümel am Rand
  g.fillStyle(SOIL);
  for (const [x, y, r] of [[14, 30, 6], [40, 10, 5], [150, 8, 6], [186, 36, 7], [120, 64, 5], [60, 62, 6]]) g.fillCircle(x, y, r);
}

/** Aufgeschütteter Erdhaufen (steht, Fußpunkt unten Mitte). */
export function drawDirtPile(g: G): void {
  const { width: w, height: h } = DIRT_PILE_SIZE;
  g.fillStyle(SOIL);
  g.fillEllipse(w / 2, h - 14, w, 28);
  g.fillCircle(w / 2, h - 26, 30);
  g.fillCircle(w / 2 - 28, h - 18, 20);
  g.fillCircle(w / 2 + 26, h - 16, 22);
  g.fillStyle(SOIL_LIGHT);
  g.fillCircle(w / 2 - 8, h - 40, 12);
  g.fillCircle(w / 2 - 30, h - 26, 8);
  g.fillStyle(SOIL_DARK);
  for (const [x, y, r] of [[70, 34, 4], [44, 46, 3], [86, 48, 4], [58, 54, 3]]) g.fillCircle(x, y, r);
}

/** Betonrahmen im Erdloch mit dunkler Öffnung und gelb-schwarzer Warnkante. */
export function drawBunkerFrame(g: G): void {
  const { width: w } = BUNKER_FRAME_SIZE;
  g.fillStyle(SOIL);
  g.fillEllipse(w / 2, 55, w, 90);
  g.fillStyle(SOIL_DARK);
  g.fillEllipse(w / 2, 58, w - 30, 66);
  // Beton oben
  g.fillStyle(0xa8a8a0);
  g.fillPoints([v(40, 22), v(200, 22), v(222, 86), v(18, 86)], true);
  // Vorderkante mit Warnstreifen
  g.fillStyle(0xffc300);
  g.fillRect(18, 86, 204, 10);
  g.fillStyle(0x333333);
  for (let x = 18; x < 222; x += 24) g.fillPoints([v(x, 96), v(x + 10, 86), v(x + 20, 86), v(x + 10, 96)], true);
  // Öffnung (sieht man, wenn die Luke wackelt)
  g.fillStyle(0x151515);
  g.fillPoints([v(54, 30), v(186, 30), v(202, 80), v(38, 80)], true);
}

/** Stahlluke mit Nieten und Verstärkungsleisten. */
export function drawBunkerLid(g: G): void {
  const { width: w } = BUNKER_LID_SIZE;
  g.fillStyle(0x44573a);
  g.fillRect(0, 50, w, 8);
  g.fillStyle(0x5f7a4a);
  g.fillPoints([v(16, 0), v(w - 16, 0), v(w, 50), v(0, 50)], true);
  g.fillStyle(0x6f8c58);
  g.fillPoints([v(26, 6), v(w - 26, 6), v(w - 14, 44), v(14, 44)], true);
  // Leisten
  g.lineStyle(4, 0x4f6640);
  g.lineBetween(w / 2 - 50, 3, w / 2 - 58, 47);
  g.lineBetween(w / 2 + 50, 3, w / 2 + 58, 47);
  // Nieten
  g.fillStyle(0x9ab384);
  for (const [x, y] of [[22, 4], [w - 22, 4], [8, 46], [w - 8, 46], [w / 2, 3], [w / 2, 47]]) g.fillCircle(x, y, 3);
}

/** Rotes Handrad (flach auf der Luke). */
export function drawBunkerWheel(g: G): void {
  const { width: w, height: h } = BUNKER_WHEEL_SIZE;
  g.lineStyle(4, 0x8e1c1c);
  g.lineBetween(8, h / 2, w - 8, h / 2);
  g.lineBetween(w / 2, 4, w / 2, h - 4);
  g.lineStyle(7, 0xd62828);
  g.strokeEllipse(w / 2, h / 2, w - 8, h - 8);
  g.fillStyle(0x8e1c1c);
  g.fillEllipse(w / 2, h / 2, 16, 8);
}
