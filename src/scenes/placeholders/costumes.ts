import Phaser from 'phaser';
import type { CostumeId, Slot } from '../../data/costumes';
import { KID_RIG, type PartTexture } from '../../data/poses';

// Platzhalter-Zeichnungen der Verkleidungen (#70). Jedes Teil besteht aus Ebenen, die als Auflage
// deckungsgleich auf einem Körperteil liegen und sich mit ihm bewegen:
//   head – über dem Kopf (Hut, Helm, Maske)      body – auf dem Rumpf (Oberteil, Rock, Gürtel)
//   arm  – auf beiden Armen (Ärmel)               leg  – auf beiden Beinen (Hose, Schuhe)
//   back – hinter der ganzen Figur, dreht sich mit dem Rumpf (Umhang, Dino-Schwanz)
// Gezeichnet wird in Koordinaten des Körperteils der Standardfigur (Kopf 144 × 156, Rumpf 80 × 92,
// Arm 22 × 70, Bein 24 × 70, siehe KID_RIG); pad erweitert die Fläche nach links/oben/rechts/unten.
// Gesichtsmitte im Kopf: (72, 86), Gesicht r = 40. Hüfte = Unterkante des Rumpfs, Schultern bei y 18.

type G = Phaser.GameObjects.Graphics;
const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

export type CostumeLayer = 'head' | 'body' | 'arm' | 'leg' | 'back';

export interface LayerArt {
  layer: CostumeLayer;
  /** Zusätzlicher Rand [links, oben, rechts, unten] um das Körperteil. */
  pad: [number, number, number, number];
  draw(g: G): void;
}

/** Zu welchem Körperteil eine Ebene gehört. */
export const LAYER_PART: Record<CostumeLayer, PartTexture> = { head: 'head', body: 'body', arm: 'arm', leg: 'leg', back: 'body' };

/** Bildgröße und Drehpunkt (Anteile) einer Ebene, passend zum Körperteil der Standardfigur. */
export function layerLayout(art: LayerArt): { width: number; height: number; originX: number; originY: number } {
  const rig = Object.values(KID_RIG).find((r) => r.texture === LAYER_PART[art.layer])!;
  const [l, t, r, b] = art.pad;
  const width = rig.width + l + r;
  const height = rig.height + t + b;
  return { width, height, originX: (rig.originX * rig.width + l) / width, originY: (rig.originY * rig.height + t) / height };
}

// --- kleine Helfer -----------------------------------------------------------------

const layer = (layerName: CostumeLayer, pad: [number, number, number, number], draw: (g: G) => void): LayerArt => ({ layer: layerName, pad, draw });

/** Rumpf ganz bedecken (gleiche Form wie der Rumpf, etwas größer). */
function torso(g: G, color: number): void {
  g.fillStyle(color);
  g.fillRoundedRect(-2, -2, 84, 96, 19);
}

/** Ärmel von der Schulter bis `length` (Hand bleibt frei), mit Bündchen. */
function sleeve(g: G, color: number, length = 52, cuff?: number): void {
  g.fillStyle(color);
  g.fillRoundedRect(-2, -2, 26, length + 2, 10);
  if (cuff !== undefined) {
    g.fillStyle(cuff);
    g.fillRect(-2, length - 8, 26, 8);
  }
}

/** Hosenbein über das ganze Bein (die Schuhe liegen darüber). */
function trouser(g: G, color: number): void {
  g.fillStyle(color);
  g.fillRoundedRect(-2, -2, 28, 64, 8);
}

/** Schuh bzw. Stiefel am Fuß: von `top` bis unter die Fußsohle. */
function boot(g: G, color: number, top = 50, sole = 0x2b2b2b): void {
  g.fillStyle(color);
  g.fillRoundedRect(-4, top, 32, 76 - top, 8);
  g.fillStyle(sole);
  g.fillRoundedRect(-5, 70, 34, 7, 3);
}

/** Glockenrock bzw. Kleid, das von der Taille über die Beine fällt. */
function skirt(g: G, color: number, hem: number, width: number, trim?: number): void {
  g.fillStyle(color);
  g.fillPoints([v(4, 58), v(76, 58), v(40 + width / 2, hem), v(40 - width / 2, hem)], true);
  if (trim !== undefined) {
    g.fillStyle(trim);
    for (let x = 40 - width / 2 + 8; x < 40 + width / 2; x += 16) g.fillCircle(x, hem, 8);
  }
}

function star(g: G, cx: number, cy: number, r: number, color: number): void {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(v(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr));
  }
  g.fillStyle(color);
  g.fillPoints(pts, true);
}

// --- Die zehn Verkleidungen ---------------------------------------------------------

export const COSTUME_ART: Record<CostumeId, Record<Slot, LayerArt[]>> = {
  pirate: {
    head: [
      layer('head', [16, 20, 16, 0], (g) => {
        // Dreispitz mit Totenkopf
        g.fillStyle(0x1f1f24);
        g.fillEllipse(72, 44, 164, 34);
        g.fillPoints([v(12, 44), v(72, -14), v(132, 44)], true);
        g.fillStyle(0xd4a017);
        g.fillEllipse(72, 50, 150, 8);
        g.fillStyle(0xffffff);
        g.fillCircle(72, 18, 9);
        g.fillRect(66, 24, 12, 6);
      }),
    ],
    top: [
      layer('body', [2, 2, 2, 2], (g) => {
        torso(g, 0xffffff);
        g.fillStyle(0xd62828);
        for (let y = 8; y < 80; y += 16) g.fillRect(-2, y, 84, 8);
        g.fillStyle(0x3a2a1a);
        g.fillRect(-2, 78, 84, 12);
        g.fillStyle(0xd4a017);
        g.fillRect(32, 78, 16, 12);
      }),
      layer('arm', [2, 2, 2, 0], (g) => {
        sleeve(g, 0xffffff, 50);
        g.fillStyle(0xd62828);
        for (let y = 6; y < 46; y += 14) g.fillRect(-2, y, 26, 6);
      }),
    ],
    bottom: [
      layer('leg', [2, 2, 2, 0], (g) => {
        trouser(g, 0x3b2f2a);
        g.fillStyle(0x3b2f2a);
        g.fillTriangle(-2, 60, 8, 60, 3, 68);
        g.fillTriangle(14, 60, 26, 60, 20, 68);
      }),
    ],
    feet: [
      layer('leg', [5, 0, 5, 8], (g) => {
        boot(g, 0x6b4226, 40);
        g.fillStyle(0x8a5a36);
        g.fillRect(-5, 38, 34, 9);
      }),
    ],
  },

  princess: {
    head: [
      layer('head', [0, 10, 0, 0], (g) => {
        // Goldene Krone mit Edelsteinen
        g.fillStyle(0xf2c230);
        g.fillPoints([v(40, 42), v(40, 14), v(52, 28), v(62, 4), v(72, 24), v(82, 4), v(92, 28), v(104, 14), v(104, 42)], true);
        g.fillStyle(0xd99f1a);
        g.fillRect(40, 34, 64, 8);
        g.fillStyle(0xe63973);
        g.fillCircle(72, 30, 5);
        g.fillStyle(0x4d96ff);
        g.fillCircle(54, 34, 4);
        g.fillCircle(90, 34, 4);
      }),
    ],
    top: [
      layer('body', [2, 2, 2, 2], (g) => {
        torso(g, 0xf78fb3);
        g.fillStyle(0xffd6e7);
        g.fillEllipse(40, 4, 44, 16);
        g.fillStyle(0xf2c230);
        for (let y = 26; y < 70; y += 14) g.fillCircle(40, y, 3);
      }),
      layer('arm', [8, 4, 8, 0], (g) => {
        // Puffärmel
        g.fillStyle(0xf78fb3);
        g.fillEllipse(11, 12, 36, 30);
        g.fillStyle(0xffd6e7);
        g.fillRect(-4, 24, 30, 4);
      }),
    ],
    bottom: [
      layer('body', [32, 0, 32, 70], (g) => {
        skirt(g, 0xf78fb3, 156, 140, 0xffb3d1);
        g.fillStyle(0xffd6e7);
        g.fillRect(4, 56, 72, 8);
      }),
      layer('leg', [2, 2, 2, 0], (g) => trouser(g, 0xffc2d9)),
    ],
    feet: [
      layer('leg', [5, 0, 5, 8], (g) => {
        boot(g, 0xe63973, 58, 0xb3265a);
        g.fillStyle(0xffd6e7);
        g.fillCircle(12, 60, 5);
      }),
    ],
  },

  firefighter: {
    head: [
      layer('head', [20, 16, 20, 0], (g) => {
        // Roter Feuerwehrhelm mit Krempe und Abzeichen
        g.fillStyle(0xc1121f);
        g.fillEllipse(72, 50, 170, 26);
        g.fillStyle(0xd62828);
        g.slice(72, 50, 50, Math.PI, 0, false);
        g.fillPath();
        g.fillStyle(0xa10e19);
        g.fillRect(68, 2, 8, 48);
        g.fillStyle(0xf2c230);
        g.fillPoints([v(72, 18), v(84, 26), v(80, 40), v(64, 40), v(60, 26)], true);
      }),
    ],
    top: [
      layer('body', [2, 2, 2, 2], (g) => {
        torso(g, 0x2b3a67);
        g.fillStyle(0xf2e205);
        g.fillRect(-2, 50, 84, 8);
        g.fillStyle(0xd9dee4);
        g.fillRect(-2, 54, 84, 3);
        g.fillStyle(0xf2e205);
        g.fillRect(-2, 76, 84, 8);
        g.fillStyle(0x1b2748);
        g.fillRect(38, 0, 4, 92);
      }),
      layer('arm', [2, 2, 2, 0], (g) => {
        sleeve(g, 0x2b3a67, 54);
        g.fillStyle(0xf2e205);
        g.fillRect(-2, 36, 26, 6);
      }),
    ],
    bottom: [
      layer('leg', [2, 2, 2, 0], (g) => {
        trouser(g, 0x2b3a67);
        g.fillStyle(0xf2e205);
        g.fillRect(-2, 36, 28, 6);
      }),
    ],
    feet: [layer('leg', [5, 0, 5, 8], (g) => boot(g, 0x1f1f24, 38))],
  },

  astronaut: {
    head: [
      layer('head', [14, 8, 14, 8], (g) => {
        // Helm: durchsichtige Glaskugel mit Ring, das Gesicht bleibt sichtbar
        g.fillStyle(0xdff4ff, 0.22);
        g.fillCircle(72, 78, 66);
        g.lineStyle(7, 0xe9ecef);
        g.strokeCircle(72, 78, 66);
        g.fillStyle(0xffffff, 0.6);
        g.fillEllipse(44, 44, 22, 12);
        g.fillStyle(0xbfc6cf);
        g.fillRoundedRect(28, 136, 88, 18, 8);
      }),
    ],
    top: [
      layer('body', [2, 2, 2, 2], (g) => {
        torso(g, 0xf1f3f5);
        g.fillStyle(0xadb5bd);
        g.fillRoundedRect(20, 22, 40, 30, 6);
        g.fillStyle(0xe63946);
        g.fillCircle(30, 32, 4);
        g.fillStyle(0x4d96ff);
        g.fillCircle(40, 32, 4);
        g.fillStyle(0x06d6a0);
        g.fillCircle(50, 32, 4);
        g.fillStyle(0xadb5bd);
        g.fillRect(-2, 80, 84, 8);
      }),
      layer('arm', [2, 2, 2, 0], (g) => sleeve(g, 0xf1f3f5, 56, 0xadb5bd)),
    ],
    bottom: [
      layer('leg', [3, 2, 3, 0], (g) => {
        trouser(g, 0xf1f3f5);
        g.fillStyle(0xadb5bd);
        g.fillRoundedRect(-1, 26, 26, 14, 6);
      }),
    ],
    feet: [
      layer('leg', [8, 0, 8, 10], (g) => {
        g.fillStyle(0x8d99ae);
        g.fillRoundedRect(-7, 44, 38, 36, 12);
        g.fillStyle(0x5c677d);
        g.fillRoundedRect(-8, 72, 40, 8, 4);
      }),
    ],
  },

  knight: {
    head: [
      layer('head', [6, 40, 6, 0], (g) => {
        // Silberhelm mit offenem Visier und rotem Federbusch
        g.fillStyle(0xc0c7d1);
        g.slice(72, 80, 66, Math.PI, 0, false);
        g.fillPath();
        g.fillRect(22, 70, 14, 50);
        g.fillRect(108, 70, 14, 50);
        g.fillStyle(0x8d99ae);
        g.fillRect(22, 58, 100, 8);
        g.fillStyle(0xd62828);
        g.fillEllipse(72, 4, 22, 40);
        g.fillEllipse(84, -2, 20, 34);
      }),
    ],
    top: [
      layer('body', [2, 2, 2, 2], (g) => {
        torso(g, 0x9aa3ad);
        g.lineStyle(1.5, 0x6c757d);
        for (let y = 4; y < 90; y += 8) for (let x = 2; x < 80; x += 8) g.strokeCircle(x + ((y / 8) % 2) * 4, y, 3);
        // Wappenrock
        g.fillStyle(0x1d4e89);
        g.fillRoundedRect(14, 14, 52, 78, 8);
        g.fillStyle(0xf2c230);
        g.fillRect(36, 28, 8, 40);
        g.fillRect(24, 40, 32, 8);
      }),
      layer('arm', [2, 2, 2, 0], (g) => {
        sleeve(g, 0x9aa3ad, 54, 0x6c757d);
        g.fillStyle(0xc0c7d1);
        g.fillEllipse(11, 6, 30, 20);
      }),
    ],
    bottom: [
      layer('leg', [3, 2, 3, 0], (g) => {
        trouser(g, 0xa7b0ba);
        g.fillStyle(0xd3d9e0);
        g.fillEllipse(12, 32, 22, 16);
      }),
    ],
    feet: [layer('leg', [5, 0, 5, 8], (g) => boot(g, 0x6c757d, 44, 0x495057))],
  },

  wizard: {
    head: [
      layer('head', [10, 110, 10, 0], (g) => {
        // Hoher spitzer Zauberhut mit Sternen
        g.fillStyle(0x4c2a85);
        g.fillEllipse(72, 48, 156, 26);
        g.fillStyle(0x5a33a0);
        g.fillPoints([v(26, 46), v(118, 46), v(96, -60), v(80, -104)], true);
        star(g, 64, 8, 12, 0xf2c230);
        star(g, 90, -40, 8, 0xf2c230);
        g.fillStyle(0xf2c230);
        g.fillCircle(46, 30, 3);
        g.fillCircle(100, 20, 3);
      }),
    ],
    top: [
      layer('body', [2, 2, 2, 2], (g) => {
        torso(g, 0x3f37c9);
        star(g, 26, 30, 7, 0xf2c230);
        star(g, 56, 56, 6, 0xf2c230);
        g.fillStyle(0xf2c230);
        g.fillCircle(50, 20, 2.5);
        g.fillCircle(20, 66, 2.5);
      }),
      layer('arm', [10, 2, 10, 0], (g) => {
        // Weiter Ärmel, unten ausgestellt
        g.fillStyle(0x3f37c9);
        g.fillPoints([v(0, -2), v(22, -2), v(30, 54), v(-8, 54)], true);
        g.fillStyle(0xf2c230);
        g.fillRect(-8, 50, 38, 5);
      }),
    ],
    bottom: [
      layer('body', [14, 0, 14, 72], (g) => {
        skirt(g, 0x3f37c9, 160, 104);
        star(g, 30, 110, 7, 0xf2c230);
        star(g, 56, 138, 6, 0xf2c230);
      }),
      layer('leg', [2, 2, 2, 0], (g) => trouser(g, 0x2a2474)),
    ],
    feet: [
      layer('leg', [6, 0, 14, 8], (g) => {
        g.fillStyle(0x7b2cbf);
        g.fillRoundedRect(-4, 56, 30, 18, 8);
        g.fillTriangle(20, 58, 20, 74, 38, 60);
        g.fillCircle(37, 58, 3);
      }),
    ],
  },

  dino: {
    head: [
      layer('head', [10, 34, 10, 0], (g) => {
        // Dino-Kapuze mit Zacken und weißen Zähnen am Rand, das Gesicht schaut heraus
        g.fillStyle(0xf77f00);
        for (let i = 0; i < 4; i++) g.fillTriangle(40 + i * 20, 20 - (i % 2) * 4, 56 + i * 20, 20 - (i % 2) * 4, 48 + i * 20, -8 - (i % 2) * 10);
        // Kapuze als dicker Ring um das Gesicht (Gesicht r = 40 bleibt frei)
        g.lineStyle(34, 0x43aa8b);
        g.strokeCircle(72, 84, 58);
        g.fillStyle(0xffffff);
        for (let i = 0; i < 7; i++) g.fillTriangle(39 + i * 11, 40, 49 + i * 11, 40, 44 + i * 11, 50);
      }),
    ],
    top: [
      layer('back', [22, 16, 22, 0], (g) => {
        // Zacken über den Schultern
        g.fillStyle(0xf77f00);
        for (let i = 0; i < 5; i++) g.fillTriangle(-16 + i * 28, 20, 4 + i * 28, 20, -6 + i * 28, -14);
      }),
      layer('body', [2, 2, 2, 2], (g) => {
        torso(g, 0x43aa8b);
        g.fillStyle(0xd8f3dc);
        g.fillEllipse(40, 54, 46, 64);
        g.lineStyle(2, 0xa8d5b5);
        for (let y = 34; y < 84; y += 10) g.lineBetween(22, y, 58, y);
      }),
      layer('arm', [2, 2, 2, 6], (g) => {
        sleeve(g, 0x43aa8b, 62);
        g.fillStyle(0xffffff);
        g.fillTriangle(2, 60, 8, 60, 5, 70);
        g.fillTriangle(9, 62, 15, 62, 12, 72);
        g.fillTriangle(16, 60, 22, 60, 19, 70);
      }),
    ],
    bottom: [
      layer('back', [10, 0, 90, 30], (g) => {
        // Schwanz, der seitlich hinter der Figur herausschaut
        g.fillStyle(0x43aa8b);
        g.fillPoints([v(50, 70), v(66, 92), v(140, 112), v(168, 104), v(120, 88), v(70, 56)], true);
        g.fillStyle(0xf77f00);
        g.fillTriangle(100, 92, 116, 96, 112, 80);
        g.fillTriangle(128, 100, 144, 104, 142, 88);
      }),
      layer('leg', [3, 2, 3, 0], (g) => trouser(g, 0x43aa8b)),
    ],
    feet: [
      layer('leg', [8, 0, 8, 8], (g) => {
        g.fillStyle(0x2d6a4f);
        g.fillRoundedRect(-7, 48, 38, 28, 12);
        g.fillStyle(0xffffff);
        g.fillTriangle(-6, 72, 2, 72, -2, 80);
        g.fillTriangle(8, 74, 16, 74, 12, 82);
        g.fillTriangle(22, 72, 30, 72, 26, 80);
      }),
    ],
  },

  superhero: {
    head: [
      layer('head', [0, 0, 0, 0], (g) => {
        // Rote Augenmaske
        g.fillStyle(0xd62828);
        g.fillEllipse(58, 84, 30, 18);
        g.fillEllipse(86, 84, 30, 18);
        g.fillRect(58, 80, 28, 8);
        g.fillTriangle(40, 84, 30, 76, 32, 90);
        g.fillTriangle(104, 84, 114, 76, 112, 90);
        g.fillStyle(0xffffff);
        g.fillEllipse(58, 84, 10, 7);
        g.fillEllipse(86, 84, 10, 7);
      }),
    ],
    top: [
      layer('back', [26, 0, 26, 86], (g) => {
        // Roter Umhang von den Schultern bis zu den Knien
        g.fillStyle(0xb5171f);
        g.fillPoints([v(4, 14), v(76, 14), v(104, 172), v(-24, 172)], true);
        g.fillStyle(0xd62828);
        g.fillPoints([v(8, 14), v(72, 14), v(90, 166), v(-10, 166)], true);
      }),
      layer('body', [2, 2, 2, 2], (g) => {
        torso(g, 0x1d4ed8);
        g.fillStyle(0xf2c230);
        g.fillPoints([v(40, 18), v(62, 34), v(40, 58), v(18, 34)], true);
        star(g, 40, 37, 10, 0xd62828);
        g.fillStyle(0xd62828);
        g.fillRect(-2, 80, 84, 10);
      }),
      layer('arm', [2, 2, 2, 0], (g) => sleeve(g, 0x1d4ed8, 56, 0xd62828)),
    ],
    bottom: [layer('leg', [2, 2, 2, 0], (g) => trouser(g, 0x1d4ed8))],
    feet: [
      layer('leg', [5, 0, 5, 8], (g) => {
        boot(g, 0xd62828, 36, 0xa10e19);
        g.fillStyle(0xa10e19);
        g.fillTriangle(-4, 36, 28, 36, 12, 46);
      }),
    ],
  },

  builder: {
    head: [
      layer('head', [18, 14, 18, 0], (g) => {
        // Gelber Bauhelm
        g.fillStyle(0xffc300);
        g.fillEllipse(72, 52, 164, 20);
        g.slice(72, 52, 50, Math.PI, 0, false);
        g.fillPath();
        g.fillStyle(0xe0a800);
        g.fillRect(66, 4, 12, 48);
      }),
    ],
    top: [
      layer('body', [2, 2, 2, 2], (g) => {
        torso(g, 0x74a9e8);
        // Orange Warnweste mit silbernen Streifen
        g.fillStyle(0xff6d00);
        g.fillRoundedRect(-2, 6, 30, 88, 10);
        g.fillRoundedRect(52, 6, 30, 88, 10);
        g.fillRect(-2, 60, 84, 34);
        g.fillStyle(0xd9dee4);
        g.fillRect(-2, 50, 30, 6);
        g.fillRect(52, 50, 30, 6);
        g.fillRect(-2, 72, 84, 6);
      }),
      layer('arm', [2, 2, 2, 0], (g) => sleeve(g, 0x74a9e8, 54, 0x5a8fd0)),
    ],
    bottom: [
      layer('body', [2, 0, 22, 30], (g) => {
        // Werkzeuggürtel mit Hammer
        g.fillStyle(0x7f4f24);
        g.fillRect(-2, 80, 84, 12);
        g.fillStyle(0x9c6644);
        g.fillRoundedRect(56, 84, 22, 22, 4);
        g.fillStyle(0x6c584c);
        g.fillRect(84, 86, 6, 30);
        g.fillStyle(0x8d99ae);
        g.fillRect(76, 82, 22, 9);
      }),
      layer('leg', [2, 2, 2, 0], (g) => {
        trouser(g, 0x3a5a8c);
        g.lineStyle(1.5, 0xf2c230, 0.8);
        g.lineBetween(4, 2, 4, 58);
      }),
    ],
    feet: [layer('leg', [5, 0, 5, 8], (g) => boot(g, 0x8b5a2b, 46, 0x3b2a1a))],
  },

  ballerina: {
    head: [
      layer('head', [0, 0, 0, 0], (g) => {
        // Blumenkranz
        const colors = [0xff8fab, 0xffffff, 0xffc8dd, 0xffe066];
        for (let i = 0; i < 9; i++) {
          const a = Math.PI + (i / 8) * Math.PI;
          const x = 72 + Math.cos(a) * 46;
          const y = 62 + Math.sin(a) * 26;
          g.fillStyle(colors[i % 4]);
          g.fillCircle(x, y, 8);
          g.fillStyle(0xffd166);
          g.fillCircle(x, y, 3);
        }
      }),
    ],
    top: [
      layer('body', [2, 2, 2, 2], (g) => {
        torso(g, 0xffc8dd);
        g.fillStyle(0xffafcc);
        g.fillEllipse(26, 6, 34, 18);
        g.fillEllipse(54, 6, 34, 18);
        g.fillStyle(0xffffff, 0.6);
        g.fillCircle(40, 30, 3);
        g.fillCircle(32, 44, 2);
        g.fillCircle(48, 50, 2);
      }),
    ],
    bottom: [
      layer('body', [44, 0, 44, 20], (g) => {
        // Tutu aus mehreren Lagen Tüll
        g.fillStyle(0xffafcc, 0.9);
        g.fillEllipse(40, 90, 164, 36);
        g.fillStyle(0xffc8dd, 0.95);
        g.fillEllipse(40, 84, 140, 28);
        g.fillStyle(0xffffff, 0.5);
        for (let x = -30; x <= 110; x += 20) g.fillCircle(x, 94, 5);
      }),
      layer('leg', [2, 2, 2, 0], (g) => trouser(g, 0xfff0f5)),
    ],
    feet: [
      layer('leg', [5, 0, 5, 8], (g) => {
        g.fillStyle(0xff8fab);
        g.fillRoundedRect(-3, 60, 30, 16, 8);
        g.lineStyle(3, 0xff8fab);
        g.lineBetween(0, 62, 24, 44);
        g.lineBetween(24, 62, 0, 44);
      }),
    ],
  },
};
