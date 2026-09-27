import type Phaser from 'phaser';
import type { Kid } from '../../Kid';
import type { Toy } from '../Toy';

/** Was beim Loslassen passiert. Bausteine dürfen vx/vy setzen (px/s, vy < 0 = nach oben). */
export interface Release {
  vx: number;
  vy: number;
  /** true = ein Baustein übernimmt die Bewegung selbst (z. B. Schweben), keine Wurf-Physik. */
  handled?: boolean;
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
  /** Antippen. pointer: wo getippt wurde (z. B. welche Xylophon-Platte). */
  onTap?(pointer?: Phaser.Input.Pointer): void;
  onDragStart?(): void;
  /** Während des Ziehens, nachdem das Spielzeug an den Finger gesetzt wurde. */
  onDrag?(x: number, y: number): void;
  onDragEnd?(release: Release): void;
  /** Ein Kind wurde auf dem Spielzeug losgelassen. true = angenommen. */
  onKidDropped?(kid: Kid): boolean;
  /** Ein anderes Spielzeug wurde auf diesem losgelassen (z. B. in die Schubkarre). true = angenommen. */
  onToyDropped?(other: Toy): boolean;
  /** Etwas wird hineingegeben (z. B. Sand von der Schaufel in den Eimer). */
  onReceive?(kind: string, amount: number): void;
  /** Das Spielzeug wird gerade weggeräumt (Kind absteigen lassen, Ladung ausschütten, …). */
  onRemove?(): void;
  /** Das Spielzeug verschwindet (weggeräumt, geplatzt): eigene Objekte aufräumen. */
  onDestroy?(): void;
  /** Jeden Frame, deltaMs = Zeit seit dem letzten Frame. */
  update?(deltaMs: number): void;
}

export type BehaviorFactory = (toy: Toy) => ToyBehavior;
