import Phaser from 'phaser';
import { CHARACTERS, getCharacterDef, type CharacterId } from '../data/characters';
import type { PlaygroundScene } from '../scenes/PlaygroundScene';
import type { Kid } from './Kid';
import { Tray, type PullSession } from './Tray';

// Geschwindigkeit, mit der ein Kind zum Tor hinausgeht (px/s).
const WALK_SPEED = 380;

/**
 * Das Gartentor im Zaun: Antippen öffnet es und zeigt die Kinder-Porträts.
 * Kind aus der Leiste ziehen = kommt herein; Kind aufs Tor ziehen = winkt und geht.
 */
export class GardenGate {
  private readonly frame: Phaser.GameObjects.Image;
  private readonly door: Phaser.GameObjects.Image;
  private readonly tray: Tray;
  private leaving = 0;

  constructor(
    private readonly scene: PlaygroundScene,
    private readonly x: number,
    private readonly y: number,
  ) {
    this.frame = scene.add.image(x, y, 'gate').setOrigin(0.5, 1).setDepth(y - 1);
    this.door = scene.add
      .image(x - this.frame.width / 2 + 22, y, 'gate-door')
      .setOrigin(0, 1)
      .setDepth(y);

    const pad = 30;
    this.frame.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-pad, -pad, this.frame.width + 2 * pad, this.frame.height + 2 * pad),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    this.frame.setData('onTap', () => (this.tray.isOpen ? this.close() : this.open()));

    this.tray = new Tray(scene, {
      items: CHARACTERS.map((c) => ({ id: c.id, texture: `portrait-${c.id}` })),
      pull: (id, pointer) => this.pull(id as CharacterId, pointer),
      isDisabled: (id) => scene.hasKid(id as CharacterId),
    });
  }

  get isOpen(): boolean {
    return this.tray.isOpen;
  }

  open(): void {
    if (this.tray.isOpen) return;
    this.scene.closeInventories();
    this.tray.show();
    this.swingDoor(true);
  }

  close(): void {
    if (!this.tray.isOpen) return;
    this.tray.hide();
    if (this.leaving === 0) this.swingDoor(false);
  }

  /** Ausgegraute Porträts aktualisieren (Kind kam herein oder ging). */
  refresh(): void {
    this.tray.refresh();
  }

  /**
   * Würde ein hier losgelassenes Kind nach Hause gehen? Die Leiste steht fest auf dem Bildschirm
   * (Bildschirm-Koordinaten), das Tor gehört zur Welt (Welt-Koordinaten).
   */
  accepts(pointer: Phaser.Input.Pointer): boolean {
    if (this.tray.contains(pointer.x, pointer.y)) return true;
    const w = this.scene.worldPoint(pointer);
    const b = this.frame.getBounds();
    return Phaser.Geom.Rectangle.Contains(new Phaser.Geom.Rectangle(b.x - 40, b.y - 60, b.width + 80, b.height + 100), w.x, w.y);
  }

  /** Das Kind winkt und geht durchs Tor hinaus. */
  sendHome(kid: Kid): void {
    this.scene.forgetKid(kid);
    kid.seatedOn?.unseat(kid);
    kid.mode = 'leaving';
    kid.disableInteractive();
    this.scene.tweens.killTweensOf(kid);
    kid.setRotation(0).setScale(1);
    this.leaving++;
    this.swingDoor(true);

    // Zuerst auf dem Boden landen, falls es über dem Tor losgelassen wurde.
    const startY = Phaser.Math.Clamp(kid.y, this.y + 20, 1060);
    this.scene.tweens.add({
      targets: kid,
      y: startY,
      duration: 200,
      onComplete: () =>
        kid.wave(() => {
          const dist = Phaser.Math.Distance.Between(kid.x, kid.y, this.x, this.y + 20);
          this.scene.tweens.add({
            targets: kid,
            x: this.x,
            y: this.y + 20,
            duration: Math.max(300, (dist / WALK_SPEED) * 1000),
            ease: 'Sine.easeInOut',
            onUpdate: () => {
              kid.setDepth(kid.y);
              // Kleines Wippen beim Gehen
              kid.setAngle(Math.sin(this.scene.time.now / 60) * 4);
            },
            onComplete: () => {
              kid.setAngle(0);
              // Durchs Tor: kleiner werden und verschwinden
              this.scene.tweens.add({
                targets: kid,
                y: this.y - 10,
                scale: 0.6,
                alpha: 0,
                duration: 350,
                onComplete: () => {
                  kid.destroy();
                  this.leaving--;
                  if (this.leaving === 0 && !this.tray.isOpen) this.swingDoor(false);
                },
              });
            },
          });
        }),
    });
  }

  private pull(id: CharacterId, pointer: Phaser.Input.Pointer): PullSession | null {
    const def = getCharacterDef(id);
    // Aus der (festen) Leiste gezogen, aber in der Welt erzeugt.
    const w = this.scene.worldPoint(pointer);
    const kid = this.scene.spawnKid(def, w.x, w.y);
    if (!kid) {
      this.refuse();
      return null;
    }
    // Der Finger hält das Kind in der Mitte.
    const offsetY = kid.height / 2;
    kid.handleDragStart();
    kid.handleDrag(pointer, w.x, w.y + offsetY);
    // Die Szene führt es nach, auch beim Scrollen am Bildschirmrand.
    this.scene.beginDrag(pointer, kid, (p, x, y) => kid.handleDrag(p, x, y));
    return {
      move: (p) => this.scene.followDrag(p),
      release: (p) => {
        this.scene.endDrag(p);
        this.scene.releaseKid(kid, p, true);
      },
    };
  }

  private refuse(): void {
    if (this.scene.tweens.isTweening(this.door)) return;
    this.scene.tweens.add({
      targets: this.door,
      angle: { from: -3, to: 3 },
      duration: 70,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        this.door.setAngle(0);
      },
    });
  }

  private swingDoor(open: boolean): void {
    this.scene.tweens.killTweensOf(this.door);
    this.door.setAngle(0);
    this.scene.tweens.add({
      targets: this.door,
      scaleX: open ? 0.15 : 1,
      duration: open ? 300 : 400,
      ease: open ? 'Back.easeOut' : 'Bounce.easeOut',
    });
  }
}
