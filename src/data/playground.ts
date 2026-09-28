import type { CharacterId } from './characters';
import type { ToyId } from './toys';

// Die Spielwiese im Hinterhof – komplett im Code definiert.
// Koordinaten sind Weltkoordinaten (Welt: WORLD_WIDTH × 1080, Start links). x/y = Fußpunkt.

export type EquipmentKind = 'slide' | 'swing' | 'sandbox' | 'tree';

export interface EquipmentDef {
  id: string;
  kind: EquipmentKind;
  x: number;
  y: number;
}

export const EQUIPMENT: EquipmentDef[] = [
  { id: 'baum', kind: 'tree', x: 230, y: 780 },
  { id: 'schaukel', kind: 'swing', x: 700, y: 820 },
  // Rutsche und Sandkasten im mittleren Teil der Welt (#34)
  { id: 'rutsche', kind: 'slide', x: 2500, y: 840 },
  { id: 'sandkasten', kind: 'sandbox', x: 3150, y: 1010 },
];

// Spielzeuge, die beim Start auf der Wiese liegen. Die Typen stehen in toys.ts.
export interface PlacedToy {
  toy: ToyId;
  x: number;
  y: number;
}

export const PLACED_TOYS: PlacedToy[] = [
  { toy: 'ball', x: 900, y: 930 },
  { toy: 'bucket', x: 1180, y: 985 },
];

// Die Spielzeugkiste steht fest unten links (Fußpunkt).
export const TOY_BOX = { x: 150, y: 1050 };

// Kinder, die beim Start auf der Wiese sind. Alle anderen kommen durchs Gartentor.
export interface PlacedKid {
  kid: CharacterId;
  x: number;
  y: number;
}

export const PLACED_KIDS: PlacedKid[] = [
  { kid: 'kind-a', x: 460, y: 960 },
  { kid: 'kind-b', x: 1700, y: 990 },
];

// Das Gartentor im Zaun rechts (Fußpunkt auf der Zaunlinie).
export const GARDEN_GATE = { x: 1790, y: 700 };
