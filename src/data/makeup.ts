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

/** Gesicht schminken oder Glitzertattoo auf den Arm (Umschalter unten). */
export type Mode = 'face' | 'arm';

export type ToolDef =
  | { kind: 'pen'; color: number }
  | { kind: 'glue' }
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
  /** In welchen Ansichten das Werkzeug im Regal liegt. */
  modes: readonly Mode[];
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
    modes: ['face'],
  })),
  ...POWDER_COLORS.map<RackItem>((color, i) => ({
    tool: { kind: 'powder', color },
    x: 1570 + (i % 2) * 180,
    y: 200 + Math.floor(i / 2) * 160,
    w: 170,
    h: 150,
    modes: ['face'],
  })),
  ...GLITTER_COLORS.map<RackItem>((color, i) => ({
    tool: { kind: 'glitter', color },
    x: 1540 + (i % 3) * 130,
    y: 560 + Math.floor(i / 3) * 150,
    w: 120,
    h: 140,
    modes: ['face', 'arm'],
  })),
  { tool: { kind: 'sponge' }, x: 1580, y: 910, w: 190, h: 140, modes: ['face', 'arm'] },
  { tool: { kind: 'glue' }, x: 250, y: 790, w: 190, h: 200, modes: ['arm'] },
];

/** Umschalter unten: Gesicht / Arm. */
export const SWITCH = {
  face: { x: 880, y: 985 },
  arm: { x: 1040, y: 985 },
  size: 104,
};

// --- Glitzertattoos ---------------------------------------------------------------------------

/** Die Vorlagen: Fantasiefiguren, Essen, Tiere (je eine Reihe auf dem Bogen). */
export const SHAPE_ROWS = [
  ['unicorn', 'dragon', 'fairy'],
  ['icecream', 'strawberry', 'pizza'],
  ['butterfly', 'cat', 'fish'],
] as const;
export type ShapeId = (typeof SHAPE_ROWS)[number][number];
export const SHAPES: ShapeId[] = SHAPE_ROWS.flatMap((r) => [...r]);
/** Farbe der Aufkleber-Vorschau auf dem Bogen (je Reihe). */
export const SHEET_COLORS = [0xb388eb, 0xff8fab, 0x4cc9f0] as const;

/** Der Vorlagenbogen links: 3 × 3 Felder. */
export const SHEET = { x: 60, y: 120, size: 460, pad: 20, cell: 140 };

/** Der Arm, auf dem das Tattoo entsteht. `area` ist die Haut, auf die Vorlagen passen. */
export const ARM = { x: 560, y: 410, w: 900, h: 300, area: { x0: 670, x1: 1250, y0: 425, y1: 695 } };

/** Vorlage (Papier mit ausgeschnittener Form): Maße der Textur und wie groß sie auf dem Arm liegt. */
export const STENCIL = {
  size: 260,
  /** Form (Textur `mk-shape-<id>`) liegt mittig im Papier. */
  shapeSize: 200,
  scale: 0.8,
  /** Raster zum Merken, wo Kleber und Glitzer sind (Pixel der Vorlage). */
  cell: 8,
};

export const TATTOO = {
  /** Radius des Kleberpinsels (Bildschirm-px). */
  glueRadius: 22,
  /** Anteil der Form, der beklebt bzw. bestreut sein soll, bis sich die Vorlage ablösen lässt. */
  glueNeed: 0.75,
  glitterNeed: 0.55,
  /** So weit (px) muss man die Vorlage wegziehen, damit sie abgerissen ist. */
  peelDistance: 140,
  /** So oft wischt der Schwamm über ein fertiges Tattoo, bis es ganz weg ist. */
  wipeCount: 14,
};

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
