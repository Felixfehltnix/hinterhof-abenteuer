// Puzzlebrett: Spielzeug `puzzleboard` antippen öffnet das Puzzle mit Tierfotos. Die Teile liegen links
// und rechts verstreut und werden auf ihren Platz im Holzrahmen gezogen (rastet großzügig ein).
//
// Steigender Schwierigkeitsgrad: Jede Stufe hat mehr Teile und eine blassere Vorlage im Rahmen.
// Nach `PUZZLE_LEVEL_UP` gelösten Bildern geht es eine Stufe höher; erreichte Stufen kann man oben
// jederzeit wieder antippen (auch leichtere). Kein Verlieren, nichts geht kaputt.
//
// Alles in Bildschirmkoordinaten der PuzzleScene (1920×1080).

export interface PuzzleLevel {
  cols: number;
  rows: number;
  /** Deckkraft des Bildes als Vorlage im Rahmen (0 = nur die Umrisse der Teile). */
  ghost: number;
}

export const PUZZLE_LEVELS: PuzzleLevel[] = [
  { cols: 2, rows: 2, ghost: 0.45 },
  { cols: 3, rows: 2, ghost: 0.35 },
  { cols: 3, rows: 3, ghost: 0.25 },
  { cols: 4, rows: 3, ghost: 0.15 },
  { cols: 5, rows: 4, ghost: 0.08 },
  { cols: 6, rows: 4, ghost: 0 },
];

/** So viele gelöste Bilder auf einer Stufe, dann kommt die nächste. */
export const PUZZLE_LEVEL_UP = 2;

/**
 * Die Bilder (`public/assets/puzzle/<id>.webp`, 1020×680, alle CC0 von Wikimedia Commons, Herkunft in
 * `public/assets/puzzle/QUELLEN.md`). Reihenfolge: leicht erkennbar zuerst, kleine Tiere im Bild zuletzt.
 */
export const PUZZLE_PICTURES = [
  'dog',
  'ladybug',
  'rabbit',
  'frog',
  'cat',
  'squirrel',
  'owlet',
  'butterfly',
  'owl',
  'goat',
  'elephant',
  'horse',
] as const;
export type PuzzlePicture = (typeof PUZZLE_PICTURES)[number];

/** Fortschritt (Weltzustand `puzzle`). */
export interface PuzzleProgress {
  /** Gerade gewählte Stufe (Index in PUZZLE_LEVELS). */
  level: number;
  /** Höchste erreichte Stufe. */
  unlocked: number;
  /** Gelöste Bilder auf der höchsten Stufe (bis PUZZLE_LEVEL_UP). */
  streak: number;
  /** Das nächste Bild (Index in PUZZLE_PICTURES), die Bilder kommen reihum. */
  picture: number;
}

export const PUZZLE_START: PuzzleProgress = { level: 0, unlocked: 0, streak: 0, picture: 0 };

/** Liest gespeicherten Fortschritt; Kaputtes wird zum Anfang. */
export function parsePuzzleProgress(v: unknown): PuzzleProgress {
  const o = (typeof v === 'object' && v !== null ? v : {}) as Record<string, unknown>;
  const int = (x: unknown, max: number) => (Number.isInteger(x) && (x as number) >= 0 && (x as number) <= max ? (x as number) : 0);
  const unlocked = int(o.unlocked, PUZZLE_LEVELS.length - 1);
  return {
    level: Math.min(int(o.level, PUZZLE_LEVELS.length - 1), unlocked),
    unlocked,
    streak: int(o.streak, PUZZLE_LEVEL_UP - 1),
    picture: int(o.picture, PUZZLE_PICTURES.length - 1),
  };
}

/** Ein Bild gelöst: nächstes Bild, ggf. nächste Stufe. Gibt zurück, ob eine neue Stufe dazukam. */
export function advancePuzzle(p: PuzzleProgress): boolean {
  p.picture = (p.picture + 1) % PUZZLE_PICTURES.length;
  if (p.level < p.unlocked || p.unlocked >= PUZZLE_LEVELS.length - 1) return false;
  p.streak++;
  if (p.streak < PUZZLE_LEVEL_UP) return false;
  p.streak = 0;
  p.unlocked++;
  p.level = p.unlocked;
  return true;
}

/** Der Rahmen mit dem Bild: obere linke Ecke und Größe der Bildfläche, Breite der Holzleiste. */
export const BOARD = { x: 450, y: 250, w: 1020, h: 680, frame: 36 };

/** Hier liegen die losen Teile verstreut (links und rechts vom Rahmen). */
export const PILES = [
  { x0: 40, x1: 410, y0: 190, y1: 1040 },
  { x0: 1510, x1: 1880, y0: 190, y1: 1040 },
];

export const PIECE = {
  /** Nase eines Teils: so hoch wie dieser Anteil der kleineren Seite. */
  tab: 0.27,
  /** Lose Teile höchstens so groß (px, längere Seite); beim Anfassen wachsen sie auf volle Größe. */
  looseMax: 300,
  /** Einrasten, wenn so nah am Platz (Anteil der kleineren Seite, mindestens snapMin px). */
  snap: 0.4,
  snapMin: 70,
};

/** Holzschild oben links (zurück), Stufen-Knöpfe oben in der Mitte. */
export const PUZZLE_LAYOUT = {
  exit: { x: 30, y: 24, w: 200, h: 110 },
  levels: { y: 105, gap: 150, w: 120, h: 92 },
};

/** Zeiten (ms): Bild ganz zeigen, bevor es zerfällt; Pause nach dem Lösen bis zum nächsten Bild. */
export const PUZZLE_TIMING = { preview: 1300, scatter: 700, next: 3200 };
