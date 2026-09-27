import type { ToyId } from './toys';

// Die Spielwiese im Hinterhof – komplett im Code definiert.
// Koordinaten beziehen sich auf 1920×1080. x/y ist jeweils der Fußpunkt (unten Mitte).

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
  { id: 'rutsche', kind: 'slide', x: 1420, y: 840 },
  { id: 'sandkasten', kind: 'sandbox', x: 1080, y: 1010 },
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
