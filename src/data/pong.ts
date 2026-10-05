// Tischtennis (#90): Platte auf der Wiese antippen öffnet Pong. Zwei Kinder von der Wiese stehen an
// den Enden der Platte, man führt die Schläger mit dem Finger. Allein (1P: der rechte Schläger spielt
// von selbst, gutmütig) oder zu zweit (2P: jede Bildschirmhälfte ein Schläger).
//
// Kein Verlieren, keine Punkte: Ein Ball, der vorbeigeht, kommt einfach neu. Gezählt werden nur
// Ballwechsel (kleine Bälle oben), alle `rally` Treffer gibt es einen goldenen Stern.
//
// Alles in Bildschirmkoordinaten der PongScene (1920×1080), Platte von oben gesehen.

export type PongMode = 1 | 2;

/** Spielfläche (Platte von oben): Mitte und Maße. Die langen Seiten oben/unten sind eine Bande. */
export const TABLE = { x: 960, y: 590, w: 1300, h: 700 };

export const PADDLE = {
  /** Radius des Schlägerkopfs (Zeichnung). */
  radius: 64,
  /** So weit (px) über/unter der Schlägermitte trifft er noch (großzügig, kleine Finger). */
  reach: 100,
  /** Für Finger zusätzlich (der Computer bekommt das nicht). */
  assist: 30,
  /** Schläger stehen so weit vor dem Ende der Platte. */
  inset: 30,
  /** Der Schläger folgt dem Finger so schnell (1/s). */
  follow: 22,
  /** Flugwinkel am Rand des Schlägers (Grad). */
  maxAngle: 50,
};

export const BALL = {
  radius: 20,
  /** Tempo beim Aufschlag und nach jedem Treffer etwas mehr (px/s). */
  serve: 520,
  speedUp: 35,
  max: 950,
  /** Pause (ms), bevor ein neuer Ball kommt. */
  serveDelay: 1000,
  /** Flughöhe (nur fürs Bild): Bogen bis zum Aufsetzen und danach wieder hoch. */
  arc: 70,
  /** Der Ball setzt nach diesem Anteil des Wegs zum anderen Schläger auf. */
  bounceAt: 0.62,
};

/** Der Computer im 1P-Spiel: folgt dem Ball nur so schnell und zielt nicht genau. */
export const AI = {
  speed: 620,
  /** Zufällige Abweichung vom Treffpunkt (px), neu bei jedem Schlag. */
  error: 60,
  /** Bei schnellen Bällen etwas langsamer reagieren (verliert dann ab und zu – gewollt). */
  tired: 0.25,
};

/** So viele Treffer in Folge ergeben einen Stern (Bälle oben zählen mit, ohne Zahl). */
export const RALLY = 8;
export const STARS_MAX = 10;

/** Kinder an den Enden: so weit hinter dem Schläger, so groß, Füße so weit unter dem Schläger. */
export const KIDS = { behind: 110, scale: 1.2, feet: 150 };

/** Holzschild oben links (zurück), Auswahl 1P/2P (groß beim Start, klein unten). */
export const LAYOUT = {
  exit: { x: 30, y: 24, w: 200, h: 110 },
  choice: { y: 560, gap: 420, size: 300 },
  switch: { y: 1010, gap: 150, size: 110 },
  rallyY: 70,
  starsX: 1860,
};
