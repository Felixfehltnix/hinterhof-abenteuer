import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import type { PropDef } from '../data/playground';

/** Gegenstände, die man herumziehen und antippen kann (Ball, Eimer, …). */
export class Prop extends Phaser.GameObjects.Image {
  readonly def: PropDef;

  constructor(scene: Phaser.Scene, def: PropDef) {
    super(scene, def.x, def.y, def.kind);
    this.def = def;
    this.setOrigin(0.5, 1);
    this.setDepth(def.y);
    scene.add.existing(this);

    this.setInteractive({ draggable: true, useHandCursor: true });
    this.setData('onTap', () => (def.kind === 'ball' ? this.kick() : this.wobble()));
  }

  private kick(): void {
    if (this.scene.tweens.isTweening(this)) return;
    const dir = this.x > GAME_WIDTH / 2 ? -1 : 1;
    const distance = Phaser.Math.Between(180, 320);
    const targetX = Phaser.Math.Clamp(this.x + dir * distance, 60, GAME_WIDTH - 60);

    this.scene.tweens.add({ targets: this, x: targetX, angle: `+=${dir * 360}`, duration: 700, ease: 'Quad.easeOut' });
    this.scene.tweens.add({ targets: this, y: this.y - 160, duration: 350, yoyo: true, ease: 'Quad.easeOut' });
  }

  private wobble(): void {
    if (this.scene.tweens.isTweening(this)) return;
    this.scene.tweens.add({
      targets: this,
      angle: { from: -12, to: 12 },
      duration: 90,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.setAngle(0);
      },
    });
  }
}
