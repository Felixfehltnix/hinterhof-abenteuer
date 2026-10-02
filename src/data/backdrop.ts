// Hintergrund wie der echte Hinterhof (#63): Häuser, Bäume hinter dem Zaun, Zaun mit Pergola,
// Efeu und Büsche. Nur Aufstellung und Ebenen – gezeichnet wird in src/scenes/placeholders/backdrop.ts,
// bewegt (Wind, Licht, Schnee) in src/world/Backdrop.ts.

import { GROUND_TOP } from '../config';

/**
 * Ebenen mit Parallaxe: Je weiter hinten, desto langsamer ziehen sie beim Scrollen vorbei.
 * x-Werte einer Ebene sind in ihren eigenen Koordinaten: Bei ganz nach rechts gescrollter Welt
 * sieht man von einer Ebene die Breite GAME_WIDTH + (WORLD_WIDTH − GAME_WIDTH) × Parallaxe.
 */
export const HOUSE_PARALLAX = 0.3;
export const BACK_TREE_PARALLAX = 0.6;

/** Oberkante des Sichtschutzzauns und der Pergola-Balken. */
export const FENCE_TOP = GROUND_TOP - 140;
export const PERGOLA_TOP = GROUND_TOP - 262;

/** Fußlinie der Häuser und Bäume (liegt hinter dem Zaun, der die Füße verdeckt). */
export const HOUSE_BASE_Y = FENCE_TOP + 40;
export const BACK_TREE_BASE_Y = FENCE_TOP + 90;

export type HouseKind = 'gable' | 'row' | 'solar' | 'small' | 'cypress';

export interface HousePlacement {
  kind: HouseKind;
  /** Mitte (Ebenen-Koordinaten der Häuser-Ebene). */
  x: number;
  scale?: number;
  /** Leichte Farbabweichung, damit sich Wiederholungen unterscheiden. */
  tint?: number;
  /** Aus dem ersten Schornstein steigt bei Schnee Rauch. */
  smoke?: boolean;
}

// Abwechslungsreiche Häuserreihe über die ganze Breite. Das Giebelhaus steht in der Mitte des
// Startbildschirms (bei Scroll 0 sind Ebenen-x und Bildschirm-x gleich).
export const HOUSES: HousePlacement[] = [
  { kind: 'row', x: 250 },
  { kind: 'cypress', x: 670 },
  { kind: 'gable', x: 960, smoke: true },
  { kind: 'solar', x: 1390 },
  { kind: 'small', x: 1900, tint: 0xf4e8e2, smoke: true },
  { kind: 'cypress', x: 2170, scale: 0.9 },
  { kind: 'row', x: 2580, scale: 0.95, tint: 0xf0e2da },
  { kind: 'gable', x: 3010, scale: 0.9, tint: 0xf6ebe4, smoke: true },
];

export type BackTreeKind = 'fir' | 'tree';

export interface BackTreePlacement {
  kind: BackTreeKind;
  /** Mitte (Ebenen-Koordinaten der Baum-Ebene). */
  x: number;
  scale?: number;
}

// Bäume hinter dem Zaun. Die dunkle Tanne steht hinter dem großen Laubbaum links.
export const BACK_TREES: BackTreePlacement[] = [
  { kind: 'fir', x: 380 },
  { kind: 'tree', x: 1500, scale: 0.9 },
  { kind: 'fir', x: 2280, scale: 0.85 },
  { kind: 'tree', x: 2760 },
  { kind: 'fir', x: 3350 },
  { kind: 'tree', x: 3860, scale: 0.85 },
  { kind: 'fir', x: 4180, scale: 0.9 },
];

/** Pergola aus Holzbalken über dem Zaun: [von, bis] in Weltkoordinaten. */
export const PERGOLAS: [number, number][] = [
  [820, 1420],
  [2960, 3660],
];

/** Efeu und Kletterpflanzen am Zaun (auch an Pergola-Pfosten und -Balken darin). */
export const IVY: [number, number][] = [
  [1120, 1700],
  [3380, 3900],
];

export type BushKind = 'green' | 'dark' | 'red' | 'orange';

export interface BushPlacement {
  kind: BushKind;
  x: number;
  scale?: number;
}

// Hecken und Büsche vor dem Zaun, teils herbstlich. Lücken am Gartentor (x 1790) und am Tor zur Steinterrasse (x 4085).
export const BUSHES: BushPlacement[] = [
  { kind: 'green', x: 60, scale: 1.1 },
  { kind: 'red', x: 500 },
  { kind: 'orange', x: 660, scale: 0.85 },
  { kind: 'green', x: 1010, scale: 1.2 },
  { kind: 'dark', x: 1250, scale: 0.9 },
  { kind: 'red', x: 1470, scale: 1.1 },
  { kind: 'orange', x: 2100 },
  { kind: 'green', x: 2330, scale: 1.15 },
  { kind: 'red', x: 2620, scale: 0.9 },
  { kind: 'dark', x: 3010, scale: 1.1 },
  { kind: 'orange', x: 3260, scale: 0.9 },
  { kind: 'green', x: 3600, scale: 1.2 },
  { kind: 'red', x: 3860 },
  { kind: 'green', x: 4300, scale: 0.95 },
  { kind: 'orange', x: 4490, scale: 1.1 },
  { kind: 'dark', x: 4660, scale: 0.9 },
];

/**
 * Felix' Garten (#64) ganz rechts in der Welt: Holz-Pergola mit wildem Wein über dem Grill,
 * Holzbrüstung davor, schwarzer Schuppen dahinter, dicker Baumstamm, grünes Gartentor.
 * Weltkoordinaten; y ist jeweils der Fußpunkt (= Tiefe).
 */
export const FELIX_GARDEN = {
  /** Ab hier ist der Boden Erde und Rindenmulch statt Rasen. */
  mulchFrom: 4720,
  /** Pergola: linker und rechter Pfosten vorn, Oberkante der Balken, Fußlinie. */
  pergola: { left: 4800, right: 5340, top: 392, y: GROUND_TOP + 44 },
  /** Schwarzer Holzschuppen hinter der Pergola (steht am Zaun). */
  shed: { left: 4830, right: 5300, top: 440 },
  grill: { x: 5075, y: GROUND_TOP + 32 },
  /** Niedrige Holzbrüstung vor der Pergola. */
  railing: { left: 4790, right: 5350, height: 78, y: GROUND_TOP + 46 },
  trunk: { x: 5460, y: GROUND_TOP + 12 },
  gate: { x: 5625, y: GROUND_TOP + 4 },
};
