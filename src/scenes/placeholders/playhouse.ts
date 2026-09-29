import Phaser from 'phaser';

// Kletter-Spielhaus mit Rutsche (#65): offener Würfel aus dicken Kunststoff-Wänden, ohne Dach.
// Alle Maße relativ zum Fußpunkt der Vorderwand-Mitte (0, 0), y nach oben negativ. Die Tiefe
// (nach hinten) ist schräg nach links oben gezeichnet: Hinten = vorn + DEPTH_OFFSET.
// Bei echten Grafiken müssen Löcher, Bogen, Podest und Rutsche zu diesen Maßen passen.

type G = Phaser.GameObjects.Graphics;
const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

export const PH = {
  /** Vorderwand: halbe Breite, Höhe. */
  half: 150,
  height: 260,
  /** Versatz von vorn nach hinten (schräg nach links oben). */
  depth: { x: -115, y: -70 },
  /** Großes rundes Loch unten in der Vorderwand (zum Durchkriechen). */
  bigHole: { x: -70, y: -60, r: 56 },
  /** Käselöcher in der Vorderwand; das oberste ist das Guckloch (Kopfhöhe eines stehenden Kindes). */
  holes: [
    { x: 70, y: -212, r: 26 },
    { x: -100, y: -205, r: 17 },
    { x: -20, y: -175, r: 22 },
    { x: 100, y: -130, r: 18 },
    { x: 30, y: -110, r: 14 },
    { x: -115, y: -140, r: 12 },
    { x: 60, y: -50, r: 16 },
  ],
  /** Rundbogen-Durchgang in der Seitenwand: Mitte in der Tiefe (0..1), Breite (Anteil), Höhe. */
  arch: { u: 0.42, halfU: 0.22, height: 214 },
  /** Kletter-Sprossen (Schlitze) neben dem Bogen. */
  rungs: { u1: 0.78, u2: 0.94, from: 40, to: 240, step: 38 },
  /** Podest innen: Höhe, vorne ab Tiefe u, x-Bereich (vorn). */
  platform: { height: 200, u: 0.35, left: -40, right: 150 },
  /**
   * Rutsche: oben am Podest, geschwungen nach vorne rechts auf die Wiese. Mittellinie als
   * Bézier-Kurve (flacher Einstieg, steile Mitte, flacher Auslauf), Breite oben/unten.
   */
  slide: { top: v(150, -214), c1: v(222, -216), c2: v(300, 52), bottom: v(430, 58), width: 60, widthBottom: 84 },
};

/** Punkt auf der linken Seitenwand: u = 0 vorn … 1 hinten, h = Höhe über dem Boden. */
export function sidePoint(u: number, h: number): Phaser.Math.Vector2 {
  return v(-PH.half + PH.depth.x * u, -h + PH.depth.y * u);
}

/** Fläche der Haus-Bilder (Vorder- und Rückseite) relativ zum Fußpunkt. */
export const HOUSE_AREA = { x: -290, y: -360, w: 460, h: 366 };
/** Fläche der Rutsche relativ zum Fußpunkt. */
export const SLIDE_AREA = { x: 110, y: -262, w: 390, h: 380 };

const BLUE = 0x1d6fd6;
const BLUE_DARK = 0x15539f;
const ORANGE = 0xf57c1f;
const ORANGE_DARK = 0xc95f10;
const YELLOW = 0xffc93c;
const YELLOW_DARK = 0xe0a800;
const TURQUOISE = 0x19b3a6;
const TURQUOISE_DARK = 0x118a80;
// Rutsche in kräftigem, dunklerem Blau
const SLIDE_BED = 0x1c5aa8;
const SLIDE_BED_LIGHT = 0x2b72c4;
const SLIDE_RIM = 0x14427f;
const SLIDE_RIM_TOP = 0x3f86d6;
const SLIDE_SIDE = 0x0d2f5c;
/** Innen ist es schattig. */
const SHADE = 0x0f3b4a;

/** Verschiebt die Zeichnung, sodass (0, 0) der Fußpunkt ist. */
function origin(g: G, area: { x: number; y: number }): void {
  g.translateCanvas(-area.x, -area.y);
}

/** Dicker runder Pfosten an einer Kante mit Kugel oben. */
function post(g: G, x: number, top: number, bottom: number, color: number, dark: number): void {
  g.fillStyle(color);
  g.fillRoundedRect(x - 11, top, 22, bottom - top, 11);
  g.fillStyle(dark);
  g.fillRect(x + 3, top + 10, 6, bottom - top - 20);
  g.fillStyle(color);
  g.fillCircle(x, top, 14);
}

/** Rückseite: Innenraum (schattig), hintere Wände, gelbe rechte Wand innen, Podest. Liegt hinter den Kindern. */
export function drawPlayhouseBack(g: G): void {
  const { half, height: H, depth: D, platform: P } = PH;
  g.save();
  origin(g, HOUSE_AREA);
  // Innenraum: alles, was man durch Löcher und Bogen sieht
  g.fillStyle(SHADE);
  g.fillPoints([v(-half + D.x, -H + D.y), v(half + D.x, -H + D.y), v(half, -H), v(half, 0), v(-half, 0), v(-half + D.x, D.y)], true);
  // Hintere Wand (türkis), innen etwas dunkler
  g.fillStyle(TURQUOISE);
  g.fillRect(-half + D.x, -H + D.y, 2 * half, H);
  g.fillStyle(TURQUOISE_DARK, 0.5);
  g.fillRect(-half + D.x, -H + D.y + 40, 2 * half, H - 40);
  // Rechte Wand innen (gelb)
  g.fillStyle(YELLOW);
  g.fillPoints([v(half + D.x, -H + D.y), v(half, -H), v(half, 0), v(half + D.x, D.y)], true);
  g.fillStyle(YELLOW_DARK, 0.45);
  g.fillPoints([v(half + D.x, -H + D.y + 40), v(half, -H + 40), v(half, 0), v(half + D.x, D.y)], true);
  // Boden
  g.fillStyle(0x0b2d38);
  g.fillPoints([v(-half + D.x, D.y), v(half + D.x, D.y), v(half, 0), v(-half, 0)], true);
  // Podest (orange): Deckfläche und Vorderseite
  const f = (x: number, u: number, h: number) => v(x + D.x * u, -h + D.y * u);
  g.fillStyle(ORANGE);
  g.fillPoints([f(P.left, P.u, P.height), f(P.right, P.u, P.height), f(P.right, 1, P.height), f(P.left, 1, P.height)], true);
  g.fillStyle(ORANGE_DARK);
  g.fillPoints([f(P.left, P.u, P.height), f(P.right, P.u, P.height), f(P.right, P.u, 0), f(P.left, P.u, 0)], true);
  // Kanten hinten: Verbindungsstücke
  post(g, half + D.x, -H + D.y, D.y, YELLOW, YELLOW_DARK);
  post(g, -half + D.x, -H + D.y, D.y, ORANGE, ORANGE_DARK);
  g.restore();
}

/** Vorderseite ohne Löcher: blaue Vorderwand, orange Seitenwand, Pfosten. Die Löcher stanzt BootScene aus. */
export function drawPlayhouseFront(g: G): void {
  const { half, height: H, depth: D } = PH;
  g.save();
  origin(g, HOUSE_AREA);
  // Seitenwand links (orange) mit dunklerem Rand für die Wandstärke
  g.fillStyle(ORANGE);
  g.fillPoints([v(-half, 0), v(-half, -H), v(-half + D.x, -H + D.y), v(-half + D.x, D.y)], true);
  // Ränder um Bogen und Sprossen (werden danach ausgestanzt, der Rand bleibt stehen)
  g.fillStyle(ORANGE_DARK);
  g.fillPoints(archOutline(8), true);
  for (const r of rungSlots(5)) g.fillPoints(r, true);
  // Oberkanten der Wände (Wandstärke)
  g.fillStyle(ORANGE_DARK);
  g.fillPoints([v(-half, -H), v(-half + D.x, -H + D.y), v(-half + D.x + 10, -H + D.y + 4), v(-half + 10, -H + 4)], true);
  // Vorderwand (blau) mit Rändern um die Löcher
  g.fillStyle(BLUE);
  g.fillRect(-half, -H, 2 * half, H);
  g.fillStyle(BLUE_DARK);
  g.fillRect(-half, -H, 2 * half, 8);
  for (const h of [PH.bigHole, ...PH.holes]) g.fillCircle(h.x, h.y, h.r + 6);
  // Verbindungsstücke an den vorderen Kanten
  post(g, -half, -H, 0, ORANGE, ORANGE_DARK);
  post(g, half, -H, 0, YELLOW, YELLOW_DARK);
  g.restore();
}

/** Umriss des Rundbogens auf der Seitenwand (etwas größer: margin). */
export function archOutline(margin = 0): Phaser.Math.Vector2[] {
  const { u, halfU, height } = PH.arch;
  const du = halfU + margin / -PH.depth.x;
  const pts: Phaser.Math.Vector2[] = [];
  const top = height + margin - 50;
  pts.push(sidePoint(u - du, 0));
  pts.push(sidePoint(u - du, top));
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI - (i / 12) * Math.PI;
    pts.push(sidePoint(u + Math.cos(a) * du, top + Math.sin(a) * 50));
  }
  pts.push(sidePoint(u + du, 0));
  return pts;
}

/** Schlitze der Kletter-Sprossen (Parallelogramme auf der Seitenwand). */
export function rungSlots(margin = 0): Phaser.Math.Vector2[][] {
  const { u1, u2, from, to, step } = PH.rungs;
  const slots: Phaser.Math.Vector2[][] = [];
  const m = margin / -PH.depth.x;
  for (let h = from; h <= to; h += step) {
    slots.push([sidePoint(u1 - m, h + 9 + margin), sidePoint(u2 + m, h + 9 + margin), sidePoint(u2 + m, h - 9 - margin), sidePoint(u1 - m, h - 9 - margin)]);
  }
  return slots;
}

/** Punkt auf der Mittellinie der Rutsche (t = 0 oben am Podest … 1 unten auf der Wiese). */
export function slidePoint(t: number): Phaser.Math.Vector2 {
  const { top: a, c1: b, c2: c, bottom: d } = PH.slide;
  const u = 1 - t;
  return v(
    u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
    u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
  );
}

/** Neigung der Rutsche an der Stelle t (Bogenmaß, 0 = waagerecht). */
export function slideAngle(t: number): number {
  const p = slidePoint(Math.max(0, t - 0.02));
  const q = slidePoint(Math.min(1, t + 0.02));
  return Math.atan2(q.y - p.y, q.x - p.x);
}

/**
 * Geschwungene Rutsche in dunklem Blau: Liegefläche mit erhöhten Seitenrändern, sichtbarer
 * Materialstärke, flachem Auslauf auf der Wiese, Stütze und Schatten. Die Breite der Rutsche
 * zeigt nach vorne in die Wiese, deshalb liegt der Auslauf flach.
 */
export function drawPlayhouseSlide(g: G): void {
  const { width, widthBottom } = PH.slide;
  g.save();
  origin(g, SLIDE_AREA);
  const N = 40;
  // Richtung der Breite: nach vorne in die Wiese, leicht nach links (wir schauen von rechts vorn),
  // so bleibt die Rutsche im steilen Stück breit und liegt unten flach
  const across = v(-0.3, 0.95).normalize().scale(0.8);
  const center: Phaser.Math.Vector2[] = [];
  const half: number[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    center.push(slidePoint(t));
    half.push((width + (widthBottom - width) * t) / 2);
  }
  const edge = (k: number, dy = 0) => center.map((c, i) => v(c.x + across.x * half[i] * k, c.y + across.y * half[i] * k + dy));
  const band = (k: number, dy = 0) => [...edge(-k, dy), ...edge(k, dy).reverse()];
  const end = center[N];

  // Schatten auf der Wiese unter dem Auslauf
  g.fillStyle(0x000000, 0.14);
  g.fillEllipse(end.x - 30, end.y + 18, 200, 30);
  // Stütze unter der Mitte
  const mid = slidePoint(0.42);
  g.fillStyle(0x8d99ae);
  g.fillRect(mid.x - 6, mid.y + 10, 12, 60 - mid.y);
  g.fillStyle(0x5c677d);
  g.fillRect(mid.x + 2, mid.y + 10, 4, 60 - mid.y);
  g.fillEllipse(mid.x, 62, 34, 10);

  // Materialstärke (Unterkante, etwas tiefer), dann Ränder, dann Liegefläche
  g.fillStyle(SLIDE_SIDE);
  g.fillPoints(band(1.32, 12), true);
  g.fillStyle(SLIDE_RIM);
  g.fillPoints(band(1.32), true);
  g.fillStyle(SLIDE_BED);
  g.fillPoints(band(0.95), true);
  g.fillStyle(SLIDE_BED_LIGHT);
  g.fillPoints(band(0.45), true);
  // Glanzkanten auf den Rändern und ein Glanzstreifen auf der Liegefläche
  g.lineStyle(4, SLIDE_RIM_TOP);
  g.strokePoints(edge(-1.25));
  g.strokePoints(edge(1.25));
  g.lineStyle(5, 0xffffff, 0.3);
  g.strokePoints(edge(-0.25).slice(4, N - 2));
  // Vorderkante des Auslaufs
  const a = edge(-1.32)[N];
  const b = edge(1.32)[N];
  g.lineStyle(6, SLIDE_SIDE);
  g.lineBetween(a.x, a.y, b.x, b.y);
  // Einstieg am Podest: Griffbügel an beiden Seiten
  g.lineStyle(7, SLIDE_RIM);
  for (const p of [edge(-1.3)[0], edge(1.3)[0]]) {
    g.beginPath();
    g.arc(p.x + 6, p.y - 22, 20, Math.PI * 0.55, Math.PI * 1.95, false);
    g.strokePath();
  }
  g.restore();
}
