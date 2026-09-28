import Phaser from 'phaser';
import { GROUND_TOP } from '../../config';
import { FELIX_GARDEN } from '../../data/backdrop';
import { rng, type Rect } from './backdrop';

// Platzhalter-Zeichnungen für Felix' Garten (#64): Pergola mit wildem Wein, Grill, Holzbrüstung,
// schwarzer Schuppen, dicker Baumstamm, grünes Gitter-Gartentor, Lichterkette mit Retro-Birnen.
// Fotos kommen nicht ins Repo; das hier ist nach der Beschreibung im Issue gezeichnet.

type G = Phaser.GameObjects.Graphics;
const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);
const { pergola: P, shed: S, railing: R, trunk: T } = FELIX_GARDEN;

const SNOW = 0xf7fbff;
const WOOD = 0x9a7552;
const WOOD_DARK = 0x74553a;
const WOOD_LIGHT = 0xb38c64;
/** Wilder Wein im Herbst: leuchtend rot, orange und grün gemischt. */
const VINE = [0xc0392b, 0xd9483b, 0xa93226, 0xe67e22, 0xf39c12, 0x4f8a3c, 0x6a9a3a];

/** Blatt vom wilden Wein: drei Lappen und eine Spitze. */
function vineLeaf(g: G, r: () => number, x: number, y: number, s: number, colors = VINE): void {
  g.fillStyle(colors[Math.floor(r() * colors.length)]);
  g.fillCircle(x, y - s * 0.3, s * 0.55);
  g.fillCircle(x - s * 0.5, y, s * 0.5);
  g.fillCircle(x + s * 0.5, y, s * 0.5);
  g.fillTriangle(x - s * 0.7, y + s * 0.2, x + s * 0.7, y + s * 0.2, x, y + s);
}

// --- Flächen in Weltkoordinaten (Bild = Fläche, Ursprung oben links) ----------------------

export const PERGOLA_AREA: Rect = { x: P.left - 110, y: P.top - 64, w: P.right - P.left + 220, h: P.y - (P.top - 64) + 4 };
export const SHED_AREA: Rect = { x: S.left - 10, y: S.top - 16, w: S.right - S.left + 20, h: GROUND_TOP + 4 - (S.top - 16) };
export const RAILING_SIZE = { width: R.right - R.left, height: R.height };
export const GRILL_SIZE = { width: 240, height: 200 };
export const TRUNK_SIZE = { width: 360, height: T.y + 70 };
export const GATE_SIZE = { width: 220, height: 200 };
export const VINE_CURTAIN_SIZE = { width: 110, height: 240 };

/** Aufhängungen der Lichterkette: unter dem Pergola-Balken in Bögen bis zum Baumstamm. */
const HOOKS = [
  v(P.left, P.top + 30),
  v(P.left + 135, P.top + 32),
  v((P.left + P.right) / 2, P.top + 30),
  v(P.right - 135, P.top + 32),
  v(P.right, P.top + 30),
  v(T.x - 40, P.top + 78),
];
const SAG = 34;
const BULB_STEP = 32;

/** Punkte auf der durchhängenden Leitung (Weltkoordinaten). */
function wirePoints(): Phaser.Math.Vector2[] {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < HOOKS.length - 1; i++) {
    const a = HOOKS[i];
    const b = HOOKS[i + 1];
    for (let k = 0; k <= 20; k++) {
      const t = k / 20;
      pts.push(v(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * SAG));
    }
  }
  return pts;
}

/** Mitte jeder Glühbirne (Weltkoordinaten) – dort leuchten sie nachts. */
export function fairyBulbs(): Phaser.Math.Vector2[] {
  const bulbs: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < HOOKS.length - 1; i++) {
    const a = HOOKS[i];
    const b = HOOKS[i + 1];
    const n = Math.max(2, Math.round((b.x - a.x) / BULB_STEP));
    for (let k = 1; k < n; k++) {
      const t = k / n;
      bulbs.push(v(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * SAG + 18));
    }
  }
  return bulbs;
}

export const LIGHTS_AREA: Rect = { x: P.left - 20, y: P.top + 14, w: T.x - P.left + 10, h: 130 };

// --- Zeichnungen ---------------------------------------------------------------------------

/** Holz-Pergola: Rankgitter an der Seite, Pfosten, Balken, dicht bewachsen mit wildem Wein. */
export function drawPergola(g: G): void {
  const r = rng(64);
  g.save();
  g.translateCanvas(-PERGOLA_AREA.x, -PERGOLA_AREA.y);

  // Rankgitter (Rautenmuster) an der linken Seite, bis zum hinteren Pfosten
  const tr = { x: P.left - 66, y: P.top + 30, w: 62, h: GROUND_TOP - P.top - 30 };
  g.lineStyle(4, WOOD_LIGHT);
  for (let c = -tr.h; c < tr.w; c += 20) {
    // x = y + c und x = c' − y, jeweils auf das Rechteck beschnitten
    const y1 = Math.max(0, -c);
    const y2 = Math.min(tr.h, tr.w - c);
    if (y2 > y1) g.lineBetween(tr.x + y1 + c, tr.y + y1, tr.x + y2 + c, tr.y + y2);
  }
  for (let c = 0; c < tr.w + tr.h; c += 20) {
    const y1 = Math.max(0, c - tr.w);
    const y2 = Math.min(tr.h, c);
    if (y2 > y1) g.lineBetween(tr.x + c - y1, tr.y + y1, tr.x + c - y2, tr.y + y2);
  }
  g.fillStyle(WOOD_DARK);
  g.fillRect(P.left - 78, P.top + 24, 14, GROUND_TOP - P.top - 24);

  // Pfosten vorn
  for (const x of [P.left, (P.left + P.right) / 2, P.right]) {
    g.fillStyle(WOOD);
    g.fillRect(x - 12, P.top, 24, P.y - P.top);
    g.fillStyle(WOOD_DARK);
    g.fillRect(x + 5, P.top, 7, P.y - P.top);
  }
  // Balken und Sparren (Stirnseiten)
  g.fillStyle(WOOD);
  g.fillRect(P.left - 50, P.top, P.right - P.left + 100, 26);
  g.fillStyle(WOOD_DARK);
  g.fillRect(P.left - 50, P.top + 20, P.right - P.left + 100, 6);
  for (let x = P.left - 36; x <= P.right + 36; x += 46) {
    g.fillStyle(WOOD_DARK);
    g.fillRect(x - 8, P.top - 24, 16, 34);
    g.fillStyle(WOOD_LIGHT);
    g.fillRect(x - 8, P.top - 24, 16, 5);
  }

  // Wilder Wein: dicht auf dem Dach, rankt an den Pfosten hoch
  for (let i = 0; i < 900; i++) {
    const x = P.left - 90 + r() * (P.right - P.left + 180);
    const y = P.top - 52 + Math.pow(r(), 0.8) * 86;
    vineLeaf(g, r, x, y, 7 + r() * 6);
  }
  for (const x of [P.left, P.right]) {
    for (let y = P.y - 20; y > P.top; y -= 10) {
      if (r() < 0.25) continue;
      vineLeaf(g, r, x + (r() - 0.5) * 34, y, 6 + r() * 5);
    }
  }
  g.restore();
}

/** Schnee auf dem Pergola-Dach (gleiche Fläche wie die Pergola). */
export function drawPergolaSnow(g: G): void {
  const r = rng(640);
  g.save();
  g.translateCanvas(-PERGOLA_AREA.x, -PERGOLA_AREA.y);
  g.fillStyle(SNOW);
  for (let x = P.left - 86; x < P.right + 86; x += 14) g.fillEllipse(x, P.top - 44 + r() * 14, 26 + r() * 12, 12 + r() * 6);
  g.restore();
}

/** Herabhängende Ranken vom Pergola-Dach (Ursprung oben Mitte, wiegen sich im Wind). */
export function drawVineCurtain(g: G): void {
  const r = rng(65);
  const { width: w, height: h } = VINE_CURTAIN_SIZE;
  for (let strand = 0; strand < 6; strand++) {
    const x0 = 14 + strand * ((w - 28) / 5);
    const len = h * (0.45 + r() * 0.55);
    g.lineStyle(2, 0x6b4a2b);
    g.lineBetween(x0, 0, x0 + (r() - 0.5) * 10, len);
    for (let y = 6; y < len; y += 11) vineLeaf(g, r, x0 + (r() - 0.5) * 18, y, 6 + r() * 4);
  }
}

/** Großer schwarzer Gasgrill mit Deckel, Edelstahl-Bedienfeld und Seitenablagen. */
export function drawGrill(g: G): void {
  const { width: w, height: h } = GRILL_SIZE;
  const steel = 0xa3aab1;
  // Unterschrank mit Türen, Griffen und Rollen
  g.fillStyle(0x151515);
  g.fillRect(56, 104, 128, h - 16 - 104);
  g.fillStyle(steel);
  g.fillRect(56, 104, 128, 4);
  g.lineStyle(2, 0x3a3a3a);
  g.lineBetween(120, 112, 120, h - 22);
  g.fillStyle(steel);
  g.fillRect(108, 124, 4, 26);
  g.fillRect(128, 124, 4, 26);
  g.fillStyle(0x0d0d0d);
  g.fillCircle(66, h - 10, 10);
  g.fillCircle(174, h - 10, 10);
  // Seitenablagen (Edelstahl) mit Streben
  g.fillStyle(steel);
  g.fillRect(2, 90, 58, 8);
  g.fillRect(w - 60, 90, 58, 8);
  g.fillStyle(0x2a2a2a);
  g.fillRect(8, 98, 6, 34);
  g.fillRect(w - 14, 98, 6, 34);
  // Bedienfeld aus Edelstahl mit schwarzen Drehknöpfen
  g.fillStyle(steel);
  g.fillRect(50, 82, 140, 24);
  g.fillStyle(0x1a1a1a);
  for (let i = 0; i < 4; i++) g.fillCircle(72 + i * 32, 94, 7);
  // Deckel (Kuppel) mit Glanz, Rand, Griff und Thermometer
  g.fillStyle(0x161616);
  g.fillRoundedRect(50, 22, 140, 62, { tl: 40, tr: 40, bl: 4, br: 4 });
  g.fillStyle(0x4a4a4a);
  g.fillRoundedRect(62, 30, 76, 12, 6);
  g.fillStyle(0x6c6c6c);
  g.fillRect(50, 78, 140, 5);
  g.fillStyle(steel);
  g.fillRoundedRect(82, 10, 76, 9, 4);
  g.fillRect(86, 10, 6, 16);
  g.fillRect(148, 10, 6, 16);
  g.fillStyle(0xe9ecef);
  g.fillCircle(120, 58, 9);
  g.fillStyle(0x222222);
  g.fillRect(119, 51, 2, 8);
}

/** Niedrige Holzbrüstung aus waagerechten Brettern. */
export function drawRailing(g: G): void {
  const { width: w, height: h } = RAILING_SIZE;
  const boards = [0xa07a52, 0x94704a, 0xa9845a];
  for (let i = 0; i < 3; i++) {
    g.fillStyle(boards[i]);
    g.fillRect(0, 16 + i * 21, w, 17);
    g.lineStyle(1, 0x7a5a3c, 0.6);
    g.lineBetween(20 + i * 90, 24 + i * 21, 140 + i * 90, 24 + i * 21);
  }
  for (let x = 0; x <= w; x += w / 4) {
    const px = Math.min(w - 14, Math.max(0, x - 7));
    g.fillStyle(WOOD_DARK);
    g.fillRect(px, 6, 14, h - 6);
  }
  g.fillStyle(WOOD_LIGHT);
  g.fillRect(0, 4, w, 10);
}

/** Schwarzer Holzschuppen hinter der Pergola. */
export function drawShed(g: G): void {
  g.save();
  g.translateCanvas(-SHED_AREA.x, -SHED_AREA.y);
  const bottom = GROUND_TOP + 4;
  g.fillStyle(0x2c2c2c);
  g.fillRect(S.left, S.top, S.right - S.left, bottom - S.top);
  g.lineStyle(2, 0x404040);
  for (let x = S.left + 18; x < S.right; x += 18) g.lineBetween(x, S.top + 6, x, bottom);
  // Dachkante
  g.fillStyle(0x161616);
  g.fillRect(S.left - 10, S.top - 14, S.right - S.left + 20, 18);
  // Tür und kleines Fenster
  const door = (S.left + S.right) / 2 + 60;
  g.fillStyle(0x303030);
  g.fillRect(door - 40, S.top + 60, 80, bottom - S.top - 60);
  g.lineStyle(3, 0x444444);
  g.strokeRect(door - 40, S.top + 60, 80, bottom - S.top - 60);
  g.fillStyle(0x9aa3a8);
  g.fillCircle(door + 28, S.top + 150, 4);
  g.fillStyle(0x4b5a66);
  g.fillRect(S.left + 60, S.top + 50, 60, 44);
  g.fillStyle(0x303030);
  g.fillRect(S.left + 88, S.top + 50, 4, 44);
  g.fillRect(S.left + 60, S.top + 70, 60, 4);
  g.restore();
}

export function drawShedSnow(g: G): void {
  g.save();
  g.translateCanvas(-SHED_AREA.x, -SHED_AREA.y);
  g.fillStyle(SNOW);
  g.fillRoundedRect(S.left - 12, S.top - 20, S.right - S.left + 24, 10, 5);
  g.restore();
}

/** Dicker Nadelbaum-Stamm mit rissiger, graubrauner Rinde; Efeu und wilder Wein ranken daran. */
export function drawTrunk(g: G): void {
  const r = rng(5460);
  const { width: w, height: h } = TRUNK_SIZE;
  const cx = w / 2;
  // Stamm mit Wurzelansatz
  g.fillStyle(0x6e6258);
  g.fillPoints([v(cx - 70, h), v(cx + 70, h), v(cx + 52, h - 60), v(cx + 50, 0), v(cx - 50, 0), v(cx - 52, h - 60)], true);
  // Rissige Rinde: helle Platten, dunkle Risse
  for (let i = 0; i < 90; i++) {
    const x = cx - 44 + r() * 80;
    const y = r() * (h - 20);
    g.fillStyle(r() < 0.5 ? 0x857a6f : 0x7a6e63);
    g.fillRect(x, y, 8 + r() * 10, 30 + r() * 40);
  }
  g.lineStyle(3, 0x4a4038);
  for (let i = 0; i < 14; i++) {
    const x = cx - 44 + i * 6.6 + (r() - 0.5) * 4;
    let y = r() * 60;
    while (y < h - 10) {
      const len = 40 + r() * 70;
      g.lineBetween(x, y, x + (r() - 0.5) * 6, y + len);
      y += len + 10 + r() * 40;
    }
  }
  // Efeu windet sich um den Stamm, dazu rote Blätter vom wilden Wein
  const ivy = [0x2e6b3a, 0x3c8446, 0x4f9a52, 0x285c33];
  for (let y = h - 10; y > 120; y -= 5) {
    const dense = (y / h) ** 1.5;
    if (r() > 0.25 + dense) continue;
    const x = cx + Math.sin(y / 40) * 46 + (r() - 0.5) * 30;
    vineLeaf(g, r, x, y, 6 + r() * 4, r() < 0.2 ? VINE.slice(0, 4) : ivy);
  }
  // Oben ragen Äste mit Nadeln ins Bild (die Krone ist darüber)
  const needles = [0x1f4a33, 0x2d5e40, 0x234f38];
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1;
    const x = cx + side * (40 + r() * 140);
    const y = 10 + r() * 110;
    g.fillStyle(needles[i % 3]);
    g.fillEllipse(x, y, 90 + r() * 60, 26 + r() * 14);
  }
  g.lineStyle(10, 0x5a4e45);
  g.lineBetween(cx - 40, 60, cx - 150, 40);
  g.lineBetween(cx + 40, 90, cx + 160, 70);
}

/** Grünes Gartentor aus Metall-Gitter (Doppelstab) mit grünen Pfosten. */
export function drawGate(g: G): void {
  const { width: w, height: h } = GATE_SIZE;
  const green = 0x1f4d2e;
  // Durchblick: Hecke und Weg dahinter
  g.fillStyle(0x7fa27a);
  g.fillRect(22, 34, w - 44, h - 34);
  g.fillStyle(0x5e8a5a);
  for (let x = 30; x < w - 30; x += 22) g.fillCircle(x, 60, 18);
  g.fillStyle(0xcdbb9c);
  g.fillPoints([v(80, 110), v(140, 110), v(w - 26, h), v(26, h)], true);
  // Pfosten mit Kappen
  g.fillStyle(green);
  g.fillRect(0, 12, 20, h - 12);
  g.fillRect(w - 20, 12, 20, h - 12);
  g.fillStyle(0x163a22);
  g.fillRect(-2 + 0, 6, 24, 10);
  g.fillRect(w - 22, 6, 24, 10);
  // Torflügel: Rahmen, senkrechte Stäbe, waagerechte Doppelstäbe
  g.lineStyle(7, 0x2a5e3a);
  g.strokeRect(28, 36, w - 56, h - 44);
  g.lineStyle(3, 0x2a5e3a);
  for (let x = 40; x < w - 30; x += 12) g.lineBetween(x, 36, x, h - 8);
  for (const y of [70, 120, 166]) {
    g.lineBetween(28, y, w - 28, y);
    g.lineBetween(28, y + 5, w - 28, y + 5);
  }
  // Scharniere und Griff
  g.fillStyle(0x163a22);
  g.fillRect(20, 60, 12, 8);
  g.fillRect(20, 150, 12, 8);
  g.fillStyle(0x9aa3a8);
  g.fillRoundedRect(w - 44, 110, 18, 6, 3);
}

/** Lichterkette: Leitung in Bögen und klare Retro-Glühbirnen (tagsüber sichtbar). */
export function drawFairyLights(g: G): void {
  g.save();
  g.translateCanvas(-LIGHTS_AREA.x, -LIGHTS_AREA.y);
  g.lineStyle(2, 0x2b2b2b);
  g.strokePoints(wirePoints());
  for (const b of fairyBulbs()) {
    g.fillStyle(0x3a3a3a);
    g.fillRect(b.x - 3, b.y - 18, 6, 9);
    g.fillStyle(0xfff6dc, 0.85);
    g.fillEllipse(b.x, b.y, 13, 17);
    g.lineStyle(1.5, 0xd9a441);
    g.lineBetween(b.x - 2, b.y - 4, b.x + 2, b.y + 2);
  }
  g.restore();
}

/** Weicher Lichtschein (weiß, wird eingefärbt): Mitte hell, zum Rand durchsichtig. */
export function drawSoftGlow(g: G): void {
  for (let i = 16; i >= 1; i--) {
    g.fillStyle(0xffffff, 0.07);
    g.fillCircle(64, 64, i * 4);
  }
}
