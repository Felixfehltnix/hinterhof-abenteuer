// Kinderschminken: Ein Kind hält den Schminkkoffer, ein zweites wird daraufgezogen und geschminkt.
// Man sieht nur den großen Kopf; Stifte, Puder und Glitzerpuder liegen rechts und links bereit.
//
// Alles in Bildschirmkoordinaten der MakeupScene (1920×1080). Kein Text, nichts geht kaputt (der Schwamm
// wischt alles weg).

/** Der große Kopf: Mittelpunkt des Gesichts und Radius der Fläche, die man bemalen kann. */
export const FACE = { x: 960, y: 590, radius: 210 };
/** So groß erscheint ein Gesicht (Radius der Haut im Kopf-Bild ist 40 · Kindgröße). */
export const HEAD_SCALE = 5.2;

export const PEN_COLORS = [0xe63946, 0xff8fab, 0xff9f1c, 0xffd23f, 0x2d9d4a, 0x4d96ff, 0x7b4fd6, 0x5b3a29] as const;
export const POWDER_COLORS = [0xff8fab, 0xf4a6ff, 0x8ecae6, 0xfff0d6] as const;
export const RAINBOW = [0xef476f, 0xff9f1c, 0xffd23f, 0x52b04a, 0x4d96ff, 0xb388eb] as const;
/** Glitzer: Farbe oder Regenbogen (jedes Körnchen eine andere Farbe). */
export const GLITTER_COLORS = [0xffd166, 0xdfe6ee, 0xff8fab, 0x4d96ff, 0x52b04a, 'rainbow'] as const;

export type GlitterColor = (typeof GLITTER_COLORS)[number];

export type ToolDef =
  | { kind: 'pen'; color: number }
  | { kind: 'powder'; color: number }
  | { kind: 'glitter'; color: GlitterColor }
  | { kind: 'sponge' };

/** Ein Werkzeug im Regal: Mitte auf dem Bildschirm und Fläche zum Anfassen. */
export interface RackItem {
  tool: ToolDef;
  x: number;
  y: number;
  /** Anfass-Fläche (Mitte x, y; Breite, Höhe). */
  w: number;
  h: number;
}

/** Größe eines Stifts. */
export const PEN_SIZE = { width: 40, height: 270 };
const PEN_BASE = 880;
const PEN_STEP = 50;
const PEN_X0 = 110;

/** Aufstellung: Stifte links im Becher, rechts Puder, Glitzer und der Schwamm. */
export const RACK: RackItem[] = [
  ...PEN_COLORS.map<RackItem>((color, i) => ({
    tool: { kind: 'pen', color },
    x: PEN_X0 + i * PEN_STEP,
    y: PEN_BASE - PEN_SIZE.height / 2,
    w: PEN_STEP,
    h: PEN_SIZE.height,
  })),
  ...POWDER_COLORS.map<RackItem>((color, i) => ({
    tool: { kind: 'powder', color },
    x: 1570 + (i % 2) * 180,
    y: 200 + Math.floor(i / 2) * 160,
    w: 170,
    h: 150,
  })),
  ...GLITTER_COLORS.map<RackItem>((color, i) => ({
    tool: { kind: 'glitter', color },
    x: 1540 + (i % 3) * 130,
    y: 560 + Math.floor(i / 3) * 150,
    w: 120,
    h: 140,
  })),
  { tool: { kind: 'sponge' }, x: 1580, y: 910, w: 190, h: 140 },
];

/** Handspiegel unten rechts: antippen = fertig. */
export const MIRROR = { x: 1790, y: 910, w: 150, h: 190 };

export const BRUSH = {
  /** Stift: Radius des Strichs. */
  pen: 13,
  /** Puder: Radius eines weichen Tupfers. */
  powder: 62,
  /** Glitzer: Streuradius um die Dose, Körnchen je Wurf, Pause dazwischen (ms). */
  glitterSpread: 70,
  glitterGrains: 5,
  glitterEvery: 45,
  /** Schwamm: Radius. */
  sponge: 75,
};
