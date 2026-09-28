import Phaser from 'phaser';
import { GROUND_MAX_Y, GROUND_MIN_Y, WORLD_WIDTH } from '../../config';
import type { Kid, KidMode, Seat } from '../Kid';
import type { Toy } from './Toy';

/**
 * Plätze für Kinder auf einem Spielzeug (Trampolin, Wippe, Planschbecken, …) nach dem
 * `Seat`-Prinzip der Schaukel: aufsitzen setzt Modus und seatedOn, Kind wegziehen ruft unseat().
 */
export class ToySeats {
  readonly riders: (Kid | undefined)[];
  private readonly seat: Seat;

  constructor(
    private readonly toy: Toy,
    capacity: number,
    private readonly mode: KidMode,
  ) {
    this.riders = new Array<Kid | undefined>(capacity).fill(undefined);
    this.seat = { unseat: (kid) => this.release(kid) };
  }

  /** Setzt ein Kind auf einen freien Platz (bevorzugt `preferred`). Liefert den Platz oder -1. */
  mount(kid: Kid, preferred = 0): number {
    if (kid.mode !== 'idle') return -1;
    const free = this.riders[preferred] === undefined ? preferred : this.riders.findIndex((r) => r === undefined);
    if (free < 0) return -1;
    this.toy.scene.tweens.killTweensOf(kid);
    this.riders[free] = kid;
    kid.seatedOn = this.seat;
    kid.mode = this.mode;
    return free;
  }

  release(kid: Kid): void {
    const i = this.riders.indexOf(kid);
    if (i < 0) return;
    this.riders[i] = undefined;
    kid.seatedOn = undefined;
    kid.exitPoint = undefined;
    kid.mode = 'idle';
    kid.setAngle(0).setFlipX(false).setVisible(true);
  }

  /** Kinder, die inzwischen woanders sind (weggezogen, nach Hause), austragen. */
  cleanup(): void {
    this.riders.forEach((kid, i) => {
      if (kid && (!kid.active || kid.seatedOn !== this.seat)) this.riders[i] = undefined;
    });
    // Beim Speichern steht jedes Kind neben dem Spielzeug.
    const exit = this.exitPoint();
    this.riders.forEach((kid) => kid && (kid.exitPoint = exit));
  }

  get count(): number {
    return this.riders.filter(Boolean).length;
  }

  /** Alle absteigen lassen (z. B. weil das Spielzeug weggeräumt wird). */
  dismountAll(): void {
    const exit = this.exitPoint();
    this.riders.forEach((kid, i) => {
      if (!kid) return;
      this.release(kid);
      kid.setPosition(Phaser.Math.Clamp(exit.x + i * 70, 60, WORLD_WIDTH - 60), exit.y).setDepth(exit.y);
      kid.hop();
    });
  }

  private exitPoint(): { x: number; y: number } {
    return {
      x: Phaser.Math.Clamp(this.toy.x + this.toy.displayWidth / 2 + 60, 60, WORLD_WIDTH - 60),
      y: Phaser.Math.Clamp(this.toy.y + 10, GROUND_MIN_Y, GROUND_MAX_Y),
    };
  }
}
