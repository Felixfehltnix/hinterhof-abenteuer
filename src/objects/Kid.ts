import Phaser from 'phaser';
import { DEPTH_DRAGGING, GAME_WIDTH, GROUND_MAX_Y, GROUND_MIN_Y } from '../config';
import type { CharacterDef } from '../data/characters';

export type KidMode = 'idle' | 'dragging' | 'swinging' | 'sliding' | 'leaving';

/** Alles, worauf ein Kind "sitzen" kann (z. B. die Schaukel). */
export interface Seat {
  unseat(kid: Kid): void;
}

export class Kid extends Phaser.GameObjects.Image {
  readonly def: CharacterDef;
  mode: KidMode = 'idle';
  seatedOn?: Seat;
  /** Wo das Kind steht, wenn eine laufende Aktion (Schaukeln, Rutschen) abbricht. */
  exitPoint?: { x: number; y: number };

  constructor(scene: Phaser.Scene, def: CharacterDef, x: number, y: number) {
    super(scene, x, y, `kid-${def.id}`);
    this.def = def;
    this.setOrigin(0.5, 1); // Fußpunkt = Position
    this.setDepth(y);
    scene.add.existing(this);

    this.setInteractive({ draggable: true, useHandCursor: true });
    this.setData('onTap', () => this.hop());
  }

  handleDragStart(): void {
    this.scene.tweens.killTweensOf(this);
    this.seatedOn?.unseat(this);
    this.mode = 'dragging';
    this.setRotation(0).setScale(1.08).setDepth(DEPTH_DRAGGING);
  }

  handleDrag(_pointer: Phaser.Input.Pointer, x: number, y: number): void {
    this.setPosition(x, y);
  }

  /** Nach dem Loslassen: wieder normal groß und bereit. */
  endDrag(): void {
    this.setScale(1);
    this.mode = 'idle';
  }

  /** Lässt das Kind auf die Wiese fallen, falls es in der Luft losgelassen wurde. */
  settle(onLanded?: () => void): void {
    this.x = Phaser.Math.Clamp(this.x, 60, GAME_WIDTH - 60);
    const targetY = Phaser.Math.Clamp(this.y, GROUND_MIN_Y, GROUND_MAX_Y);

    if (this.y >= targetY) {
      this.y = targetY;
      this.setDepth(this.y);
      onLanded?.();
      return;
    }

    const fall = targetY - this.y;
    this.scene.tweens.add({
      targets: this,
      y: targetY,
      duration: 250 + fall * 0.8,
      ease: 'Bounce.easeOut',
      onUpdate: () => {
        this.setDepth(this.y);
      },
      onComplete: () => onLanded?.(),
    });
  }

  /** Kleiner Freudensprung beim Antippen. */
  hop(): void {
    if (this.mode !== 'idle' || this.scene.tweens.isTweening(this)) return;
    this.scene.tweens.add({
      targets: this,
      y: this.y - 70,
      scaleY: 1.05,
      duration: 180,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  /** Position fürs Speichern: laufende Aktionen zählen nicht, das Kind steht neben dem Gerät. */
  restPosition(): { x: number; y: number } {
    const p = this.mode !== 'idle' && this.exitPoint ? this.exitPoint : this;
    return {
      x: Phaser.Math.Clamp(p.x, 60, GAME_WIDTH - 60),
      y: Phaser.Math.Clamp(p.y, GROUND_MIN_Y, GROUND_MAX_Y),
    };
  }

  /** Kickt etwas weg: kurz nach hinten lehnen und das Bein schwingen. */
  kick(dir: number): void {
    if (this.mode !== 'idle' || this.scene.tweens.isTweening(this)) return;
    this.scene.tweens.add({
      targets: this,
      angle: -dir * 10,
      duration: 110,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.setAngle(0);
      },
    });
  }

  /** Winkt zum Abschied (wackelt hin und her). */
  wave(onDone: () => void): void {
    this.scene.tweens.add({
      targets: this,
      angle: { from: -10, to: 10 },
      duration: 160,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.setAngle(0);
        onDone();
      },
    });
  }
}
