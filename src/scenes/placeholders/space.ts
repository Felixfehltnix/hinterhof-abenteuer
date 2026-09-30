import Phaser from 'phaser';

// Rakete und Weltall (#75): Rakete (Rückseite mit Kabine, Vorderseite mit Fenster), Flamme,
// Planeten, Ufo mit Alien, Sternschnuppe. Die Rakete schaut nach oben, Fußpunkt unten Mitte.

type G = Phaser.GameObjects.Graphics;
const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

/** Maße der Raketen-Zeichnung (Textur `rocket` bzw. `rocket-front`). */
export const ROCKET_ART = {
  width: 300,
  height: 620,
  /** Kabinenfenster (in Textur-Koordinaten). */
  window: { x: 50, y: 176, w: 200, h: 186, r: 46 },
  /**
   * Sitzplätze: Hüfte relativ zum Fußpunkt. Vorn zwei (werden zuerst besetzt), hinten zwei etwas
   * höher und enger (so schauen alle vier Köpfe aus dem Fenster).
   */
  seats: [
    { dx: -58, dy: -276, front: true },
    { dx: 60, dy: -276, front: true },
    { dx: -30, dy: -318, front: false },
    { dx: 34, dy: -318, front: false },
  ],
  /** Düse (Mitte unten) relativ zum Fußpunkt. */
  nozzle: { dx: 0, dy: -46 },
};

const RED = 0xe63946;
const RED_DARK = 0xb5212e;
const HULL = 0xf1f3f5;
const HULL_SHADE = 0xcfd6dd;
const BLUE = 0x1d3557;

/** Umriss der Spitze und des Rumpfs (ohne Flossen). */
function hullPoints(): Phaser.Math.Vector2[] {
  const { width: W } = ROCKET_ART;
  const cx = W / 2;
  const pts: Phaser.Math.Vector2[] = [];
  // Spitze: von oben rund nach unten zur vollen Breite
  for (let i = 0; i <= 20; i++) {
    const y = (i / 20) * 180;
    const half = 112 * Math.pow(Math.sin(((y / 180) * Math.PI) / 2), 0.62);
    pts.push(v(cx + half, y + 4));
  }
  pts.push(v(cx + 112, 480), v(cx + 96, 512), v(cx - 96, 512), v(cx - 112, 480));
  for (let i = 20; i >= 0; i--) {
    const y = (i / 20) * 180;
    const half = 112 * Math.pow(Math.sin(((y / 180) * Math.PI) / 2), 0.62);
    pts.push(v(cx - half, y + 4));
  }
  return pts;
}

/**
 * Rakete zeichnen. part 'back': ganze Rakete mit Kabine innen (das Spielzeug selbst);
 * 'front': die Rakete ohne Kabine – das Fenster wird danach ausgestanzt (BootScene), die
 * Kinder sitzen dazwischen.
 */
export function drawRocket(g: G, part: 'back' | 'front'): void {
  const { width: W, height: H, window: win } = ROCKET_ART;
  const cx = W / 2;
  // Flossen links und rechts, vorn eine schmale
  g.fillStyle(RED_DARK);
  g.fillPoints([v(cx - 104, 370), v(cx - 150, 540), v(cx - 150, H - 4), v(cx - 98, 575), v(cx - 96, 500)], true);
  g.fillPoints([v(cx + 104, 370), v(cx + 150, 540), v(cx + 150, H - 4), v(cx + 98, 575), v(cx + 96, 500)], true);
  g.fillStyle(RED);
  g.fillPoints([v(cx - 104, 380), v(cx - 142, 540), v(cx - 142, H - 14), v(cx - 100, 566), v(cx - 98, 500)], true);
  g.fillPoints([v(cx + 104, 380), v(cx + 142, 540), v(cx + 142, H - 14), v(cx + 100, 566), v(cx + 98, 500)], true);
  // Düse
  g.fillStyle(0x495057);
  g.fillPoints([v(cx - 46, 506), v(cx + 46, 506), v(cx + 60, 578), v(cx - 60, 578)], true);
  g.fillStyle(0x6c757d);
  g.fillPoints([v(cx - 40, 506), v(cx - 10, 506), v(cx - 18, 578), v(cx - 52, 578)], true);
  g.fillStyle(0x212529);
  g.fillEllipse(cx, 578, 120, 16);
  // Rumpf
  g.fillStyle(HULL);
  g.fillPoints(hullPoints(), true);
  // Rundung: rechte Seite schattiert, links ein Glanzstreifen
  g.fillStyle(HULL_SHADE);
  g.fillRect(cx + 70, 150, 42, 330);
  g.fillStyle(0xffffff, 0.8);
  g.fillRoundedRect(cx - 98, 190, 14, 270, 7);
  // Rote Spitze
  g.fillStyle(RED);
  const tip = hullPoints().filter((p) => p.y <= 118);
  g.fillPoints(tip, true);
  g.fillStyle(0xffffff, 0.35);
  g.fillEllipse(cx - 26, 60, 18, 60);
  // Ringe und Streifen
  g.fillStyle(RED);
  g.fillRect(cx - 112, 420, 224, 26);
  g.fillStyle(0xffd166);
  for (let i = 0; i < 5; i++) g.fillCircle(cx - 72 + i * 36, 433, 5);
  // Kleines rundes Bullauge unten
  g.fillStyle(BLUE);
  g.fillCircle(cx, 474, 20);
  g.fillStyle(0x8ecae6);
  g.fillCircle(cx, 474, 13);
  g.fillStyle(0xffffff, 0.7);
  g.fillCircle(cx - 4, 469, 4);

  // Kabinenfenster: Rahmen (auch vorn), innen die Kabine (nur hinten)
  g.fillStyle(BLUE);
  g.fillRoundedRect(win.x - 12, win.y - 12, win.w + 24, win.h + 24, win.r + 10);
  if (part === 'back') {
    g.fillStyle(0x223a66);
    g.fillRoundedRect(win.x, win.y, win.w, win.h, win.r);
    // Sternenhimmel-Tapete und zwei Sitzbänke
    g.fillStyle(0xffffff, 0.5);
    for (let i = 0; i < 14; i++) g.fillCircle(win.x + 16 + ((i * 53) % (win.w - 30)), win.y + 14 + ((i * 29) % 60), 2);
    g.fillStyle(0xf4a261);
    g.fillRoundedRect(win.x + 20, win.y + 104, win.w - 40, 26, 10);
    g.fillStyle(0xe76f51);
    g.fillRoundedRect(win.x + 6, win.y + 146, win.w - 12, 30, 10);
    // Lämpchen am Armaturenbrett
    for (let i = 0; i < 4; i++) {
      g.fillStyle([0x06d6a0, 0xffd166, 0xef476f, 0x4d96ff][i]);
      g.fillCircle(win.x + 50 + i * 34, win.y + 92, 5);
    }
  }
  // Nieten auf dem Rahmen
  g.fillStyle(0xa8dadc);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.fillCircle(win.x + win.w / 2 + Math.cos(a) * (win.w / 2 + 5), win.y + win.h / 2 + Math.sin(a) * (win.h / 2 + 5), 3.5);
  }
}

/** Glas über den Kindern: leicht bläulich mit Glanz (liegt auf der Vorderseite). */
export function drawRocketGlass(g: G): void {
  const { window: win } = ROCKET_ART;
  g.fillStyle(0xbde0fe, 0.14);
  g.fillRoundedRect(win.x, win.y, win.w, win.h, win.r);
  g.fillStyle(0xffffff, 0.35);
  g.fillPoints([v(win.x + 34, win.y + 10), v(win.x + 70, win.y + 10), v(win.x + 22, win.y + 110), v(win.x + 10, win.y + 80)], true);
  g.fillStyle(0xffffff, 0.2);
  g.fillPoints([v(win.x + 84, win.y + 8), v(win.x + 98, win.y + 8), v(win.x + 40, win.y + 130), v(win.x + 30, win.y + 120)], true);
}

export const FLAME_SIZE = { width: 110, height: 190 };

/** Flamme (Oberkante an der Düse), wird im Flug gestreckt und flackert. */
export function drawFlame(g: G): void {
  const { width: w, height: h } = FLAME_SIZE;
  // Tropfen: oben breit (an der Düse), unten spitz
  const drop = (half: number, len: number) => {
    const right: Phaser.Math.Vector2[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      right.push(v(w / 2 + half * Math.pow(1 - t, 0.7) * (0.75 + 0.25 * Math.cos(t * Math.PI * 0.5)), t * len));
    }
    const left = right.map((p) => v(w - p.x, p.y)).reverse();
    return [...right, ...left];
  };
  g.fillStyle(0xff6b1a, 0.85);
  g.fillPoints(drop(52, h), true);
  g.fillStyle(0xffb347, 0.95);
  g.fillPoints(drop(38, h * 0.72), true);
  g.fillStyle(0xfff3b0);
  g.fillPoints(drop(22, h * 0.45), true);
}

// --- Weltall ---------------------------------------------------------------------------

export const PLANET_SIZE: Record<'moon' | 'saturn' | 'mars' | 'bluePlanet', { width: number; height: number }> = {
  moon: { width: 280, height: 280 },
  saturn: { width: 520, height: 300 },
  mars: { width: 210, height: 210 },
  bluePlanet: { width: 320, height: 320 },
};

function craters(g: G, cx: number, cy: number, r: number, color: number, list: [number, number, number][]): void {
  for (const [dx, dy, s] of list) {
    g.fillStyle(color);
    g.fillCircle(cx + dx * r, cy + dy * r, s * r);
    g.fillStyle(0xffffff, 0.18);
    g.fillCircle(cx + dx * r - s * r * 0.25, cy + dy * r - s * r * 0.25, s * r * 0.55);
  }
}

/** Kugel mit Schatten auf der rechten unteren Seite. */
function ball(g: G, cx: number, cy: number, r: number, color: number): void {
  g.fillStyle(0xffffff, 0.12);
  g.fillCircle(cx, cy, r + 10);
  g.fillStyle(color);
  g.fillCircle(cx, cy, r);
}

function shade(g: G, cx: number, cy: number, r: number): void {
  g.fillStyle(0x000000, 0.18);
  g.fillCircle(cx + r * 0.35, cy + r * 0.3, r * 0.82);
  g.fillStyle(0xffffff, 0.2);
  g.fillCircle(cx - r * 0.4, cy - r * 0.4, r * 0.25);
}

export function drawPlanet(g: G, kind: keyof typeof PLANET_SIZE): void {
  const { width: w, height: h } = PLANET_SIZE[kind];
  const cx = w / 2;
  const cy = h / 2;
  switch (kind) {
    case 'moon': {
      const r = 125;
      ball(g, cx, cy, r, 0xdadada);
      craters(g, cx, cy, r, 0xb8b8b8, [
        [-0.35, -0.3, 0.2],
        [0.3, 0.1, 0.26],
        [-0.2, 0.45, 0.14],
        [0.45, -0.45, 0.1],
        [-0.6, 0.1, 0.09],
      ]);
      shade(g, cx, cy, r);
      break;
    }
    case 'mars': {
      const r = 92;
      ball(g, cx, cy, r, 0xe07a3f);
      g.fillStyle(0xb5532a);
      g.fillEllipse(cx - 20, cy - 30, 80, 30);
      g.fillEllipse(cx + 30, cy + 35, 60, 24);
      g.fillStyle(0xffffff, 0.8);
      g.fillEllipse(cx, cy - r + 14, 60, 18);
      shade(g, cx, cy, r);
      break;
    }
    case 'bluePlanet': {
      const r = 140;
      ball(g, cx, cy, r, 0x3a86ff);
      g.fillStyle(0x2a9d8f);
      g.fillEllipse(cx - 40, cy - 30, 110, 70);
      g.fillEllipse(cx + 60, cy + 50, 90, 60);
      g.fillEllipse(cx - 70, cy + 70, 50, 30);
      g.fillStyle(0xffffff, 0.75);
      g.fillEllipse(cx + 10, cy - 80, 120, 16);
      g.fillEllipse(cx - 30, cy + 20, 140, 14);
      shade(g, cx, cy, r);
      break;
    }
    case 'saturn': {
      const r = 105;
      // Ring hinten, Kugel, Ring vorn
      const ring = (front: boolean) => {
        for (const [rx, ry, width, color] of [
          [240, 60, 16, 0xe9c46a],
          [212, 52, 10, 0xf4e1a6],
        ] as [number, number, number, number][]) {
          const pts: Phaser.Math.Vector2[] = [];
          for (let i = 0; i <= 40; i++) {
            const a = (front ? 0 : Math.PI) + (i / 40) * Math.PI;
            pts.push(v(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry));
          }
          g.lineStyle(width, color);
          g.strokePoints(pts);
        }
      };
      ring(false);
      ball(g, cx, cy, r, 0xf4a261);
      g.fillStyle(0xe9c46a);
      g.fillRect(cx - r + 8, cy - 38, 2 * r - 16, 16);
      g.fillStyle(0xe76f51, 0.6);
      g.fillRect(cx - r + 4, cy + 10, 2 * r - 8, 12);
      shade(g, cx, cy, r);
      ring(true);
      break;
    }
  }
}

export const UFO_SIZE = { width: 280, height: 190 };

/** Ufo: Glaskuppel (hinten), Untertasse mit bunten Lichtern. Der Alien sitzt zwischen Kuppel und Tasse. */
export function drawUfo(g: G, part: 'dome' | 'saucer'): void {
  const { width: w } = UFO_SIZE;
  const cx = w / 2;
  if (part === 'dome') {
    g.fillStyle(0x90e0ef, 0.35);
    g.fillEllipse(cx, 92, 150, 150);
    return;
  }
  g.fillStyle(0xbde0fe, 0.25);
  g.fillEllipse(cx, 92, 150, 150);
  g.fillStyle(0xffffff, 0.5);
  g.fillEllipse(cx - 34, 50, 22, 44);
  g.fillStyle(0x8d99ae);
  g.fillEllipse(cx, 124, w - 8, 70);
  g.fillStyle(0xadb5bd);
  g.fillEllipse(cx, 116, w - 40, 44);
  g.fillStyle(0x6c757d);
  g.fillEllipse(cx, 150, 110, 30);
}

export const ALIEN_SIZE = { width: 90, height: 110 };

/** Kleiner grüner Alien (ohne rechten Arm – der winkt extra). */
export function drawAlien(g: G): void {
  const cx = ALIEN_SIZE.width / 2;
  g.lineStyle(4, 0x52b788);
  g.lineBetween(cx - 14, 30, cx - 22, 8);
  g.lineBetween(cx + 14, 30, cx + 22, 8);
  g.fillStyle(0xffd166);
  g.fillCircle(cx - 22, 8, 6);
  g.fillCircle(cx + 22, 8, 6);
  g.fillStyle(0x74c69d);
  g.fillEllipse(cx, 80, 44, 50);
  g.fillEllipse(cx, 44, 60, 48);
  g.fillStyle(0xffffff);
  g.fillCircle(cx - 12, 42, 10);
  g.fillCircle(cx + 12, 42, 10);
  g.fillStyle(0x1b1b1b);
  g.fillCircle(cx - 10, 43, 5);
  g.fillCircle(cx + 14, 43, 5);
  g.lineStyle(3, 0x2d6a4f);
  g.beginPath();
  g.arc(cx, 54, 10, 0.2, Math.PI - 0.2);
  g.strokePath();
  // linker Arm hängt
  g.lineStyle(8, 0x74c69d);
  g.lineBetween(cx - 20, 72, cx - 32, 96);
}

export const ALIEN_ARM_SIZE = { width: 16, height: 40 };

/** Winkender Arm des Aliens (Drehpunkt oben = Schulter). */
export function drawAlienArm(g: G): void {
  g.fillStyle(0x74c69d);
  g.fillRoundedRect(4, 0, 8, 34, 4);
  g.fillCircle(8, 34, 7);
}

export const SHOOTING_STAR_SIZE = { width: 220, height: 24 };

/** Sternschnuppe: heller Kopf rechts, Schweif nach links auslaufend. */
export function drawShootingStar(g: G): void {
  const { width: w, height: h } = SHOOTING_STAR_SIZE;
  for (let i = 0; i < 20; i++) {
    const t = i / 20;
    g.fillStyle(0xfff3c4, 0.05 + 0.5 * t);
    g.fillEllipse(w * 0.1 + t * (w - 40), h / 2, 20, 3 + 8 * t);
  }
  g.fillStyle(0xffffff);
  g.fillCircle(w - 14, h / 2, 8);
}
