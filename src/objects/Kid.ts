import Phaser from 'phaser';
import type { CharacterDef } from '../data/characters';

export type KidMode = 'idle' | 'dragging' | 'swinging' | 'sliding';

/** Alles, worauf ein Kind "sitzen" kann (z. B. die Schaukel). */
export interface Seat {
  unseat(kid: Kid): void;
}

export class Kid extends Phaser.GameObjects.Image {
  readonly def: CharacterDef;
  mode: KidMode = 'idle';
  seatedOn?: Seat;

  constructor(scene: Phaser.Scene, def: CharacterDef) {
    super(scene, def.x, def.y, `kid-${def.id}`);
    this.def = def;
    this.setOrigin(0.5, 1); // Fußpunkt = Position
    this.setDepth(def.y);
    scene.add.existing(this);

    this.setInteractive({ draggable: true, useHandCursor: true });
    this.setData('onTap', () => this.hop());
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
}
