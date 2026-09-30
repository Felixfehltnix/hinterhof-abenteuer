// Rakete und Himmel über der Wiese (#75): Höhen, Wolkenschicht, Weltall und was dort schwebt.
//
// Höhe = wie weit die Kamera über der Wiese steht (−scrollY). Die Welt reicht nach oben bis
// ALTITUDE_MAX; alles darüber sind negative y-Koordinaten.

/** So hoch kann die Kamera steigen (px über der Wiese). */
export const ALTITUDE_MAX = 6400;

/** Wolkenschicht, durch die man fliegt (Welt-y, von oben nach unten). */
export const CLOUD_LAYER = { top: -2500, bottom: -1600 };

/** Ab dieser Höhe wird der Himmel dunkler, ab SPACE_FULL ist man im Weltall. */
export const SPACE_START = 1200;
export const SPACE_FULL = 3600;

/** Ab dieser Höhe schweben die Kinder in der Rakete (schwerelos). */
export const WEIGHTLESS_FROM = 3300;

/** Farben des Weltalls (oben/unten am Bildschirm). */
export const SPACE_SKY = { top: 0x05071a, bottom: 0x151c46 };

/** Parallaxe der Himmelskörper: Sie ziehen langsamer vorbei als die Rakete (weit weg). */
export const PLANET_PARALLAX = 0.5;

export type SpaceBodyKind = 'moon' | 'saturn' | 'mars' | 'bluePlanet' | 'ufo';

export interface SpaceBody {
  kind: SpaceBodyKind;
  /**
   * Weltposition (Bild mit PLANET_PARALLAX): Bei Kamera (scrollX, Höhe) steht er auf dem
   * Bildschirm bei (x − 0,5·scrollX, y + 0,5·Höhe). Sichtbar ab etwa y + 0,5·Höhe > 0.
   */
  x: number;
  y: number;
  scale: number;
  /** Tonhöhe beim Antippen (0–7). */
  pitch: number;
}

/** Himmelskörper im Weltall, über die ganze Breite verteilt (mit Abstand, damit nichts überlappt). */
export const SPACE_BODIES: SpaceBody[] = [
  { kind: 'moon', x: 1400, y: -1950, scale: 1, pitch: 2 },
  { kind: 'mars', x: 400, y: -2700, scale: 0.8, pitch: 5 },
  { kind: 'ufo', x: 2050, y: -1650, scale: 1, pitch: 6 },
  { kind: 'saturn', x: 2600, y: -2350, scale: 1, pitch: 0 },
  { kind: 'moon', x: 3050, y: -1500, scale: 0.55, pitch: 4 },
  { kind: 'bluePlanet', x: 3450, y: -2550, scale: 1, pitch: 3 },
];

/** Wie weit man im Weltall ist (0 = blauer Himmel, 1 = Weltall). */
export function spaceAmount(altitude: number): number {
  const t = (altitude - SPACE_START) / (SPACE_FULL - SPACE_START);
  return Math.min(1, Math.max(0, t));
}

/** Tiefe der fliegenden Rakete: vor allem auf der Wiese, aber hinter den vorderen Wolken. */
export const ROCKET_FLY_DEPTH = 6100;
/** Tiefe der Wolken, die vor der Rakete vorbeiziehen (unter gezogenen Objekten und der Einfärbung). */
export const CLOUD_FRONT_DEPTH = 6300;

/** Rakete: Fluggefühl. */
export const ROCKET = {
  /** Höchstgeschwindigkeit nach oben/zur Seite und nach unten (px/s). */
  maxSpeed: 1100,
  maxSpeedDown: 1600,
  /** So stark zieht es die Rakete zum Finger (1/s). */
  pull: 4,
  /** So schnell passt sie ihre Geschwindigkeit an (1/s): etwas träge wie ein Raumschiff. */
  response: 4,
  /** Losgelassen in der Luft: sinkt langsam. */
  sinkSpeed: 190,
  /** Größte Neigung beim Seitwärtsfliegen (rad). */
  maxTilt: 0.32,
  /** Kinder sitzen verkleinert in der Kabine. */
  kidScale: 0.55,
  seats: 4,
};
