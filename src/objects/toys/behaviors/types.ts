import type { Toy } from '../Toy';

/** Was beim Loslassen passiert. Bausteine dürfen vx/vy setzen (px/s, vy < 0 = nach oben). */
export interface Release {
  vx: number;
  vy: number;
  /** Optional: auf dieser Bodenlinie (Tiefe) landen statt senkrecht unter dem Loslasspunkt. */
  groundY?: number;
  /** Geschwindigkeit des Fingers kurz vor dem Loslassen (px/s). */
  readonly pointerVelocity: { readonly x: number; readonly y: number };
}

/**
 * Ein Verhaltensbaustein. Alle Methoden sind optional; ein Spielzeug ruft sie
 * für alle seine Bausteine in der Reihenfolge aus dem Katalog auf.
 */
export interface ToyBehavior {
  onTap?(): void;
  onDragStart?(): void;
  onDragEnd?(release: Release): void;
  /** Jeden Frame, deltaMs = Zeit seit dem letzten Frame. */
  update?(deltaMs: number): void;
}

export type BehaviorFactory = (toy: Toy) => ToyBehavior;
