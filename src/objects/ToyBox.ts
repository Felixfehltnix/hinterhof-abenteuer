import Phaser from 'phaser';
import { getToyDef, TOYS, type ToyId } from '../data/toys';
import type { PlaygroundScene } from '../scenes/PlaygroundScene';
import { Tray, type PullSession } from './Tray';
import type { Toy } from './toys/Toy';

/**
 * Die Spielzeugkiste: Antippen öffnet sie und zeigt alle Spielzeuge in einer Leiste.
 * Spielzeug aus der Leiste ziehen = neues Spielzeug; Spielzeug auf Kiste/Leiste ziehen = wegräumen.
 */
export class ToyBox {
  private readonly body: Phaser.GameObjects.Image;
  private readonly lid: Phaser.GameObjects.Image;
  private readonly tray: Tray;

  constructor(
    private readonly scene: PlaygroundScene,
    x: number,
    y: number,
  ) {
    // Die Kiste steht fest auf dem Bildschirm und scrollt nicht mit der Wiese.
    this.body = scene.add.image(x, y, 'toybox').setOrigin(0.5, 1).setDepth(y).setScrollFactor(0);
    this.lid = scene.add
      .image(x - this.body.width / 2 - 5, y - this.body.height + 4, 'toybox-lid')
      .setOrigin(0, 1)
      .setDepth(y + 1)
      .setScrollFactor(0);

    // Große Touch-Fläche: Kiste samt Deckel und etwas Rand.
    const pad = 30;
    this.body.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-pad, -pad - 40, this.body.width + 2 * pad, this.body.height + 2 * pad + 40),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    this.body.setData('onTap', () => (this.tray.isOpen ? this.close() : this.open()));

    this.tray = new Tray(scene, {
      items: TOYS.filter((t) => !('hidden' in t && t.hidden)).map((t) => ({ id: t.id, texture: t.id })),
      pull: (id, pointer) => this.pull(id as ToyId, pointer),
    });
  }

  get isOpen(): boolean {
    return this.tray.isOpen;
  }

  open(): void {
    if (this.tray.isOpen) return;
    this.scene.closeInventories();
    this.tray.show();
    this.scene.tweens.killTweensOf(this.lid);
    this.scene.tweens.add({ targets: this.lid, angle: -80, duration: 300, ease: 'Back.easeOut' });
  }

  close(): void {
    if (!this.tray.isOpen) return;
    this.tray.hide();
    this.scene.tweens.killTweensOf(this.lid);
    this.scene.tweens.add({ targets: this.lid, angle: 0, duration: 250, ease: 'Bounce.easeOut' });
  }

  /** Würde ein an (x, y) losgelassenes Spielzeug hier weggeräumt? (Bildschirm-Koordinaten) */
  accepts(x: number, y: number): boolean {
    if (this.tray.contains(x, y)) return true;
    const b = this.body.getBounds();
    return Phaser.Geom.Rectangle.Contains(new Phaser.Geom.Rectangle(b.x - 30, b.y - 60, b.width + 60, b.height + 60), x, y);
  }

  /** Spielzeug verschwindet mit einem kleinen „Plopp“ in der Kiste. */
  putAway(toy: Toy): void {
    this.scene.forgetToy(toy);
    toy.disableInteractive();
    toy.physics.stop();
    const tweens = this.scene.tweens;
    tweens.killTweensOf(toy);
    tweens.chain({
      targets: toy,
      tweens: [
        { scale: 1.3, duration: 90, ease: 'Quad.easeOut' },
        { scale: 0, alpha: 0, duration: 160, ease: 'Back.easeIn' },
      ],
      onComplete: () => toy.destroy(),
    });
    this.sparkle(toy.x, toy.y - toy.height / 2);
    this.hop();
  }

  /** Obergrenze erreicht: Die Kiste wackelt, statt etwas herauszugeben. */
  refuse(): void {
    if (this.scene.tweens.isTweening(this.body)) return;
    this.scene.tweens.add({
      targets: this.body,
      angle: { from: -6, to: 6 },
      duration: 70,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        this.body.setAngle(0);
      },
    });
  }

  private pull(id: ToyId, pointer: Phaser.Input.Pointer): PullSession | null {
    const def = getToyDef(id);
    // Der Finger hält das Spielzeug in der Mitte.
    const offsetY = def.height / 2;
    // Aus der (festen) Leiste gezogen, aber in der Welt erzeugt.
    const w = this.scene.worldPoint(pointer);
    const toy = this.scene.spawnToy(def, w.x, w.y + offsetY);
    if (!toy) {
      this.refuse();
      return null;
    }
    toy.handleDragStart();
    // Frisch aus der Kiste: keine „Aufhebe-Linie“, in der Luft losgelassen landet es hinten.
    toy.pickupGroundY = undefined;
    return {
      move: (p) => {
        const pw = this.scene.worldPoint(p);
        toy.handleDrag(p, pw.x, pw.y + offsetY);
      },
      release: (p) => this.scene.releaseToy(toy, p),
    };
  }

  private hop(): void {
    if (this.scene.tweens.isTweening(this.body)) return;
    this.scene.tweens.add({ targets: this.body, scaleY: 0.92, duration: 80, yoyo: true, ease: 'Quad.easeOut' });
  }

  private sparkle(x: number, y: number): void {
    const colors = [0xffd166, 0xffffff, 0x06d6a0, 0xef476f];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const dot = this.scene.add.circle(x, y, 9, colors[i % colors.length]).setDepth(y + 1);
      this.scene.tweens.add({
        targets: dot,
        x: x + Math.cos(a) * 70,
        y: y + Math.sin(a) * 70,
        scale: 0,
        duration: 350,
        ease: 'Quad.easeOut',
        onComplete: () => dot.destroy(),
      });
    }
  }
}
