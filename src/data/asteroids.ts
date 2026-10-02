// Sternenflug: Asteroiden-Spiel ganz oben im Weltall. Man kommt hinein, wenn man die Rakete
// bis ans Ende des Weltalls fliegt und dort weiter nach oben zieht.
//
// Kein Verlieren: Zusammenstöße schubsen nur, es gibt keine Leben und keine Punkte.

/** Einstieg über der Wiese: so lange (s) oben am Rand weiter nach oben ziehen, dann Warp. */
export const WARP = {
  holdTime: 1.2,
  /** Der Finger muss mindestens so weit (px) über der Rakete sein, damit es als „weiter nach oben“ zählt. */
  pushMargin: 40,
};

/** Größen der Asteroiden: 0 groß, 1 mittel, 2 klein (zerfällt in Glitzer). */
export type RockSize = 0 | 1 | 2;

export interface RockSizeDef {
  /** Radius (px) der Zeichnung und der Treffer-Fläche. */
  radius: number;
  /** Tempo beim Erscheinen bzw. nach dem Zerfallen (px/s). */
  speed: [number, number];
  /** Tonhöhe beim Treffer (0–7). */
  pitch: number;
}

export const ROCK_SIZES: Record<RockSize, RockSizeDef> = {
  0: { radius: 118, speed: [55, 95], pitch: 0 },
  1: { radius: 74, speed: [85, 140], pitch: 2 },
  2: { radius: 44, speed: [110, 180], pitch: 4 },
};

/** Verschiedene Formen je Größe (Texturen `rock-<größe>-<form>`). */
export const ROCK_SHAPES = 3;

/** Wellen: so viele große Asteroiden in der ersten, jede Welle einer mehr bis höchstens max. */
export const WAVES = { first: 3, max: 6, pause: 2200 };

/** Abstand neuer Asteroiden zur Rakete (px), damit nichts sofort zusammenstößt. */
export const SPAWN_CLEARANCE = 520;

/** Schüsse (leuchtende Sterne). */
export const SHOT = {
  speed: 1500,
  /** Lebensdauer (s). */
  life: 0.85,
  /** Finger hält fest: so oft (s) ein neuer Schuss. */
  repeat: 0.22,
  /** Höchstens so viele gleichzeitig. */
  max: 8,
  radius: 22,
};

/** Rakete im Sternenflug. */
export const SHIP = {
  scale: 0.42,
  /** Kreis für Zusammenstöße (px, um die Mitte). */
  radius: 105,
  /** Kreis zum Anfassen (großzügig). */
  grabRadius: 190,
  maxSpeed: 1200,
  /** So stark zieht es die Rakete zum Finger (1/s). */
  pull: 6,
  /** So schnell passt sie ihre Geschwindigkeit an (1/s). */
  response: 6,
  /** Losgelassen: rollt aus (1/s). */
  friction: 1.6,
  /** So schnell dreht sie die Spitze (1/s). */
  turnRate: 9,
  /** Zusammenstoß: so stark werden Rakete und Asteroid auseinandergeschubst (px/s). */
  bump: 380,
};

/** Rückweg: die Erde unten links (Bildschirmkoordinaten). */
export const EARTH = { x: 130, y: 950, radius: 90 };

/** Goldene Sterne oben für geschaffte Wellen (ohne Zahl), höchstens so viele. */
export const WAVE_STARS_MAX = 10;
