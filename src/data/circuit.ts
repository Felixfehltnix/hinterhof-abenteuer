// Strom-Werkstatt (Elektro-Baukasten): Lochplatte, Batterie, Schalter, Logikgatter, Lampe.
// Bildschirmkoordinaten (1920×1080). Ein Level ist geschafft, wenn die Lampe leuchtet.

export type GateKind = 'and' | 'or' | 'not';
export type PartKind = 'battery' | 'lamp' | 'switch' | 'slot';
export type PortName = 'out' | 'in' | 'in1' | 'in2';

export interface PartDef {
  id: string;
  kind: PartKind;
  x: number;
  y: number;
  /** Schalter: steht er an? */
  on?: boolean;
  /** Schalter klemmt (Pflaster): lässt sich nicht umlegen. */
  stuck?: boolean;
  /** Gatter-Platz: so viele Eingänge (1 = NICHT, 2 = UND/ODER). */
  inputs?: 1 | 2;
}

export interface WireDef {
  from: [string, PortName];
  to: [string, PortName];
}

export interface LevelDef {
  parts: PartDef[];
  /** Feste Drähte (dunkel, verschraubt, nicht abnehmbar). */
  fixed: WireDef[];
  /** Gatter in der Ablage. */
  tray: GateKind[];
}

/** Anschlüsse je Teil relativ zur Mitte; Ausgänge geben Strom ab, Eingänge nehmen ihn auf. */
export const PORTS: Record<PartKind | GateKind, Partial<Record<PortName, { x: number; y: number }>>> = {
  battery: { out: { x: 92, y: -40 } },
  lamp: { in: { x: -96, y: 92 } },
  switch: { in: { x: -104, y: 10 }, out: { x: 104, y: 10 } },
  slot: { in1: { x: -124, y: -46 }, in2: { x: -124, y: 46 }, out: { x: 124, y: 0 } },
  and: { in1: { x: -124, y: -46 }, in2: { x: -124, y: 46 }, out: { x: 124, y: 0 } },
  or: { in1: { x: -124, y: -46 }, in2: { x: -124, y: 46 }, out: { x: 124, y: 0 } },
  not: { in1: { x: -124, y: 0 }, out: { x: 124, y: 0 } },
};

export const isOutput = (port: PortName): boolean => port === 'out';

export const LEVELS: LevelDef[] = [
  // 1 · Erster Strom: Batterie mit der Lampe verbinden
  {
    parts: [
      { id: 'bat', kind: 'battery', x: 330, y: 540 },
      { id: 'lamp', kind: 'lamp', x: 1580, y: 470 },
    ],
    fixed: [],
    tray: [],
  },
  // 2 · Der Schalter: Schalter mit der Lampe verbinden und anschalten
  {
    parts: [
      { id: 'bat', kind: 'battery', x: 300, y: 540 },
      { id: 's', kind: 'switch', x: 900, y: 600, on: false },
      { id: 'lamp', kind: 'lamp', x: 1580, y: 470 },
    ],
    fixed: [{ from: ['bat', 'out'], to: ['s', 'in'] }],
    tray: [],
  },
  // 3 · UND: beide Schalter ans UND-Gatter, beide an
  {
    parts: [
      { id: 'bat', kind: 'battery', x: 250, y: 540 },
      { id: 'a', kind: 'switch', x: 700, y: 360, on: false },
      { id: 'b', kind: 'switch', x: 700, y: 720, on: false },
      { id: 'g', kind: 'slot', x: 1150, y: 540, inputs: 2 },
      { id: 'lamp', kind: 'lamp', x: 1600, y: 470 },
    ],
    fixed: [
      { from: ['bat', 'out'], to: ['a', 'in'] },
      { from: ['bat', 'out'], to: ['b', 'in'] },
      { from: ['g', 'out'], to: ['lamp', 'in'] },
    ],
    tray: ['and'],
  },
  // 4 · ODER: Schalter A klemmt aus – mit UND bleibt die Lampe dunkel, mit ODER reicht B
  {
    parts: [
      { id: 'bat', kind: 'battery', x: 250, y: 540 },
      { id: 'a', kind: 'switch', x: 700, y: 360, on: false, stuck: true },
      { id: 'b', kind: 'switch', x: 700, y: 720, on: false },
      { id: 'g', kind: 'slot', x: 1150, y: 540, inputs: 2 },
      { id: 'lamp', kind: 'lamp', x: 1600, y: 470 },
    ],
    fixed: [
      { from: ['bat', 'out'], to: ['a', 'in'] },
      { from: ['bat', 'out'], to: ['b', 'in'] },
      { from: ['a', 'out'], to: ['g', 'in1'] },
      { from: ['g', 'out'], to: ['lamp', 'in'] },
    ],
    tray: ['and', 'or'],
  },
  // 5 · NICHT: der Schalter klemmt aus – NICHT dreht es um, die Lampe geht an
  {
    parts: [
      { id: 'bat', kind: 'battery', x: 250, y: 540 },
      { id: 's', kind: 'switch', x: 700, y: 560, on: false, stuck: true },
      { id: 'g', kind: 'slot', x: 1120, y: 560, inputs: 1 },
      { id: 'lamp', kind: 'lamp', x: 1600, y: 470 },
    ],
    fixed: [
      { from: ['bat', 'out'], to: ['s', 'in'] },
      { from: ['s', 'out'], to: ['g', 'in1'] },
    ],
    tray: ['not'],
  },
];

export const CIRCUIT = {
  /** Touch-Radius um einen Anschluss (px). */
  portReach: 56,
  /** Draht antippen = abnehmen: so nah am Draht (px). */
  wireReach: 26,
  /** Lochabstand der Platte. */
  hole: 48,
  /** So lange leuchtet die Lampe, bevor es weitergeht (ms). */
  winMs: 2600,
  /** Ablage unten: Mitte und Abstand der Gatter. */
  tray: { y: 980, gap: 300 },
  /** Gatter auf den Platz ziehen: so nah muss es sein. */
  slotReach: 170,
  /** Holzschild zurück oben links. */
  exit: { x: 30, y: 30, w: 200, h: 110 },
  /** Fortschritt oben: Lämpchen je Level. */
  progress: { y: 70, gap: 90 },
};

/** Drahtfarben (reihum je neuem Draht). */
export const WIRE_COLORS = [0xe63946, 0x1d70b8, 0x2a9d8f, 0xf4a261, 0x9b5de5];
