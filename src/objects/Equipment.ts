import Phaser from 'phaser';
import type { EquipmentDef } from '../data/playground';
import type { Kid, Seat } from './Kid';

/**
 * Basisklasse für Spielgeräte. Standardmäßig passiert nichts –
 * die Unterklassen überschreiben, was sie brauchen.
 */
export abstract class Equipment {
  constructor(
    protected readonly scene: Phaser.Scene,
    readonly def: EquipmentDef,
  ) {}

  /** Wird jeden Frame aufgerufen. */
  update(): void {}

  /** Nimmt das Gerät ein Kind an, das an (x, y) losgelassen wurde? */
  accepts(_kid: Kid, _x: number, _y: number): boolean {
    return false;
  }

  /** Kind benutzt das Gerät. */
  use(_kid: Kid): void {}
}

// ---------------------------------------------------------------------------

export class Swing extends Equipment implements Seat {
  private static readonly ROPE_LENGTH = 300;
  private static readonly MAX_ANGLE = 0.45; // Bogenmaß

  private readonly ropes: Phaser.GameObjects.Graphics;
  private readonly pivot: Phaser.Math.Vector2;
  private rider?: Kid;

  constructor(scene: Phaser.Scene, def: EquipmentDef) {
    super(scene, def);
    scene.add.image(def.x, def.y, 'swing-frame').setOrigin(0.5, 1).setDepth(def.y);
    this.pivot = new Phaser.Math.Vector2(def.x, def.y - 400);

    const L = Swing.ROPE_LENGTH;
    this.ropes = scene.add.graphics({ x: this.pivot.x, y: this.pivot.y }).setDepth(def.y + 1);
    this.ropes.lineStyle(5, 0x444444);
    this.ropes.lineBetween(-45, 0, -45, L);
    this.ropes.lineBetween(45, 0, 45, L);
    this.ropes.fillStyle(0xe76f51);
    this.ropes.fillRoundedRect(-62, L - 8, 124, 18, 6);
  }

  override accepts(_kid: Kid, x: number, y: number): boolean {
    if (this.rider) return false;
    const seatX = this.pivot.x;
    const seatY = this.pivot.y + Swing.ROPE_LENGTH;
    return Phaser.Math.Distance.Between(x, y, seatX, seatY) < 160;
  }

  override use(kid: Kid): void {
    this.rider = kid;
    kid.mode = 'swinging';
    kid.seatedOn = this;
    kid.exitPoint = { x: this.def.x + 190, y: this.def.y + 60 };

    const tweens = this.scene.tweens;
    tweens.killTweensOf(this.ropes);
    tweens.add({
      targets: this.ropes,
      rotation: -Swing.MAX_ANGLE,
      duration: 500,
      ease: 'Sine.easeOut',
      onComplete: () => {
        tweens.add({
          targets: this.ropes,
          rotation: Swing.MAX_ANGLE,
          duration: 1100,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      },
    });
  }

  unseat(kid: Kid): void {
    if (this.rider !== kid) return;
    this.rider = undefined;
    kid.seatedOn = undefined;
    kid.exitPoint = undefined;
    kid.mode = 'idle';
    kid.setRotation(0);

    this.scene.tweens.killTweensOf(this.ropes);
    this.scene.tweens.add({
      targets: this.ropes,
      rotation: 0,
      duration: 900,
      ease: 'Sine.easeOut',
    });
  }

  override update(): void {
    if (!this.rider) return;
    const r = this.ropes.rotation;
    const L = Swing.ROPE_LENGTH;
    this.rider
      .setPosition(this.pivot.x - L * Math.sin(r), this.pivot.y + L * Math.cos(r) - 4)
      .setRotation(r)
      .setDepth(this.def.y + 2);
  }
}

// ---------------------------------------------------------------------------

export class Slide extends Equipment {
  private readonly image: Phaser.GameObjects.Image;
  private readonly top: Phaser.Math.Vector2;
  private readonly bottom: Phaser.Math.Vector2;
  private busy = false;

  constructor(scene: Phaser.Scene, def: EquipmentDef) {
    super(scene, def);
    this.image = scene.add.image(def.x, def.y, 'slide').setOrigin(0.5, 1).setDepth(def.y);
    // Punkte passend zur Platzhalter-Grafik (400×420). Bei echter Grafik anpassen.
    this.top = new Phaser.Math.Vector2(def.x - 90, def.y - 365);
    this.bottom = new Phaser.Math.Vector2(def.x + 185, def.y - 20);
  }

  override accepts(_kid: Kid, x: number, y: number): boolean {
    return !this.busy && this.image.getBounds().contains(x, y);
  }

  override use(kid: Kid): void {
    this.busy = true;
    kid.mode = 'sliding';
    kid.exitPoint = { x: this.bottom.x + 90, y: this.bottom.y + 30 };
    kid.disableInteractive();
    kid.setDepth(this.def.y + 1);

    this.scene.tweens.chain({
      targets: kid,
      tweens: [
        // hochklettern
        { x: this.top.x, y: this.top.y, duration: 500, ease: 'Sine.easeInOut' },
        // runterrutschen
        {
          x: this.bottom.x,
          y: this.bottom.y,
          delay: 150,
          duration: 650,
          ease: 'Quad.easeIn',
          onStart: () => {
            kid.setRotation(-0.3); // nach hinten lehnen
          },
        },
        // auslaufen
        {
          x: this.bottom.x + 90,
          y: this.bottom.y + 30,
          duration: 260,
          ease: 'Quad.easeOut',
          onStart: () => {
            kid.setRotation(0);
          },
        },
      ],
      onComplete: () => {
        kid.mode = 'idle';
        kid.exitPoint = undefined;
        kid.setInteractive();
        kid.setDepth(kid.y);
        this.busy = false;
        kid.hop();
      },
    });
  }
}

// ---------------------------------------------------------------------------

export class Tree extends Equipment {
  constructor(scene: Phaser.Scene, def: EquipmentDef) {
    super(scene, def);
    const image = scene.add.image(def.x, def.y, 'tree').setOrigin(0.5, 1).setDepth(def.y);
    image.setInteractive({ useHandCursor: true });
    image.setData('onTap', () => {
      if (scene.tweens.isTweening(image)) return;
      scene.tweens.add({
        targets: image,
        angle: { from: -3, to: 3 },
        duration: 80,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          image.setAngle(0);
        },
      });
    });
  }
}

export class Sandbox extends Equipment {
  constructor(scene: Phaser.Scene, def: EquipmentDef) {
    super(scene, def);
    // Liegt flach auf dem Boden -> ganz hinten, damit alles darüber gezeichnet wird.
    scene.add.image(def.x, def.y, 'sandbox').setOrigin(0.5, 1).setDepth(def.y - 120);
  }
}

// ---------------------------------------------------------------------------

export function createEquipment(scene: Phaser.Scene, def: EquipmentDef): Equipment {
  switch (def.kind) {
    case 'swing':
      return new Swing(scene, def);
    case 'slide':
      return new Slide(scene, def);
    case 'tree':
      return new Tree(scene, def);
    case 'sandbox':
      return new Sandbox(scene, def);
  }
}
