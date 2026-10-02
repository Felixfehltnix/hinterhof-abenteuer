import Phaser from 'phaser';

// Schwarzer Labrador aus Einzelteilen (Seitenansicht, schaut nach rechts): Rumpf, Kopf (normal,
// Maul offen, schlafend), Bein, Schwanz. Die Teile setzt src/objects/Dog.ts an Gelenken zusammen.

type G = Phaser.GameObjects.Graphics;
const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

export const DOG_BODY_SIZE = { width: 190, height: 90 };
export const DOG_HEAD_SIZE = { width: 124, height: 100 };
export const DOG_LEG_SIZE = { width: 30, height: 92 };
export const DOG_TAIL_SIZE = { width: 84, height: 22 };

const FUR = 0x1d1d21;
const FUR_LIGHT = 0x3b3b44;
const FUR_DARK = 0x0e0e10;
const COLLAR = 0xd62828;

export function drawDogBody(g: G): void {
  const { width: w, height: h } = DOG_BODY_SIZE;
  g.fillStyle(FUR);
  g.fillEllipse(w / 2, h / 2 + 2, w - 6, h - 12);
  // Brust vorn etwas tiefer, Hinterteil rund
  g.fillCircle(w - 42, h / 2 + 8, 36);
  g.fillCircle(38, h / 2, 36);
  // Glanz auf dem Rücken
  g.fillStyle(FUR_LIGHT, 0.7);
  g.fillEllipse(w / 2 - 6, 18, w - 70, 12);
  // Halsband vorn
  g.fillStyle(COLLAR);
  g.fillPoints([v(w - 34, 6), v(w - 20, 4), v(w - 12, 44), v(w - 26, 48)], true);
  g.fillStyle(0xffd166);
  g.fillCircle(w - 18, 50, 6);
}

/** Kopf, Halsgelenk bei (40, 82). face: normal, Maul offen (bellen, tragen, freuen) oder schlafend. */
export function drawDogHead(g: G, face: 'normal' | 'open' | 'sleep'): void {
  // Schädel und Schnauze
  g.fillStyle(FUR);
  g.fillCircle(48, 46, 36);
  g.fillRoundedRect(56, 42, 60, 30, 14);
  g.fillEllipse(40, 74, 44, 30); // Hals
  // Stirnglanz
  g.fillStyle(FUR_LIGHT, 0.7);
  g.fillEllipse(52, 20, 34, 9);
  // Nase
  g.fillStyle(0x050505);
  g.fillEllipse(113, 49, 18, 14);
  g.fillStyle(0x6b6b75);
  g.fillCircle(110, 46, 3);
  // Maul
  if (face === 'open') {
    g.fillStyle(0x6d1a2a);
    g.fillPoints([v(72, 68), v(112, 62), v(108, 80), v(78, 80)], true);
    g.fillStyle(0xf28482); // Zunge
    g.fillEllipse(92, 82, 22, 16);
    g.fillStyle(FUR);
    g.fillRoundedRect(76, 78, 34, 10, 5); // Unterkiefer
  } else {
    g.lineStyle(3, FUR_DARK);
    g.lineBetween(82, 70, 108, 64);
  }
  // Auge
  if (face === 'sleep') {
    g.lineStyle(3, 0x6b6b75);
    g.beginPath();
    g.arc(64, 36, 7, 0.2, Math.PI - 0.2, false);
    g.strokePath();
  } else {
    g.fillStyle(0x5a3a1a);
    g.fillCircle(64, 36, 8);
    g.fillStyle(0x000000);
    g.fillCircle(66, 36, 5);
    g.fillStyle(0xffffff);
    g.fillCircle(68, 33, 2.5);
  }
  // Schlappohr
  g.fillStyle(FUR_DARK);
  g.fillPoints([v(26, 22), v(44, 18), v(46, 60), v(30, 70), v(20, 58)], true);
  g.fillCircle(32, 62, 10);
}

/** Bein mit Pfote, Hüft-/Schultergelenk oben Mitte. */
export function drawDogLeg(g: G): void {
  const { width: w, height: h } = DOG_LEG_SIZE;
  g.fillStyle(FUR);
  g.fillRoundedRect(4, 0, w - 8, h - 8, 10);
  g.fillEllipse(w / 2 + 3, h - 8, w, 16);
}

/** Otterschwanz: dick an der Wurzel (rechts), spitz nach links. */
export function drawDogTail(g: G): void {
  const { width: w, height: h } = DOG_TAIL_SIZE;
  g.fillStyle(FUR);
  g.fillPoints([v(w, 1), v(w, h - 1), v(10, h / 2 + 3), v(2, h / 2), v(10, h / 2 - 3)], true);
  g.fillCircle(w - 8, h / 2, h / 2 - 1);
}
