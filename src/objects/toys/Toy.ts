import Phaser from 'phaser';
import { GAME_WIDTH, GROUND_MAX_Y, GROUND_MIN_Y, MIN_TOUCH_SIZE } from '../../config';
import { DEFAULT_TOY_PARAMS, type ToyDef, type ToyParams } from '../../data/toys';
import { BEHAVIORS, type Release, type ToyBehavior } from './behaviors';
import { ToyPhysics } from './ToyPhysics';

// Nur die Fingerbewegung der letzten Millisekunden zählt für die Wurfgeschwindigkeit.
const VELOCITY_WINDOW_MS = 100;
// Hat der Finger vor dem Loslassen so lange stillgehalten, wird nicht geworfen.
const VELOCITY_STALE_MS = 60;

/**
 * Ein Spielzeug auf der Wiese. Was es kann, bestimmen die Bausteine aus dem Katalog
 * (src/data/toys.ts). Die Szene reicht nur Ziehen und Tippen weiter.
 */
export class Toy extends Phaser.GameObjects.Image {
  readonly def: ToyDef;
  readonly params: ToyParams;
  readonly physics: ToyPhysics;
  private readonly behaviors: ToyBehavior[];
  private track: { x: number; y: number; t: number }[] = [];

  constructor(scene: Phaser.Scene, def: ToyDef, x: number, y: number) {
    super(scene, x, y, def.id);
    this.def = def;
    this.params = { ...DEFAULT_TOY_PARAMS, ...def.params };
    this.physics = new ToyPhysics(this, this.params);

    this.setOrigin(0.5, 1); // Fußpunkt = Position
    this.setDepth(y);
    scene.add.existing(this);
    this.addToUpdateList();

    // Kleine Spielzeuge bekommen eine größere, unsichtbare Touch-Fläche.
    const padX = Math.max(0, (MIN_TOUCH_SIZE - this.width) / 2);
    const padY = Math.max(0, (MIN_TOUCH_SIZE - this.height) / 2);
    this.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-padX, -padY, this.width + 2 * padX, this.height + 2 * padY),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });

    this.behaviors = def.behaviors.map((id) => BEHAVIORS[id](this));
    this.setData('onTap', () => this.behaviors.forEach((b) => b.onTap?.()));
  }

  handleDragStart(): void {
    this.scene.tweens.killTweensOf(this);
    this.physics.stop();
    if (!this.params.spin) this.setRotation(0);
    this.track = [];
    this.behaviors.forEach((b) => b.onDragStart?.());
  }

  handleDrag(pointer: Phaser.Input.Pointer, x: number, y: number): void {
    this.setPosition(x, y);
    // Zeitstempel des Touch-Ereignisses, nicht des Frames: bleibt auch bei Rucklern genau.
    const now = pointer.moveTime;
    this.track.push({ x, y, t: now });
    while (this.track.length > 2 && now - this.track[0].t > VELOCITY_WINDOW_MS) this.track.shift();
  }

  handleDragEnd(pointer: Phaser.Input.Pointer): void {
    const release: Release = { vx: 0, vy: 0, pointerVelocity: this.pointerVelocity(pointer.upTime) };
    this.behaviors.forEach((b) => b.onDragEnd?.(release));
    // Auch ohne Wurf: fällt aus der Luft zurück auf die Wiese.
    this.physics.launch(release.vx, release.vy);
  }

  /** Position fürs Speichern: ein fliegendes Spielzeug liegt schon dort, wo es landen wird. */
  restPosition(): { x: number; y: number } {
    const y = this.physics.active ? this.physics.groundY : this.y;
    return {
      x: Phaser.Math.Clamp(this.x, this.width / 2, GAME_WIDTH - this.width / 2),
      y: Phaser.Math.Clamp(y, GROUND_MIN_Y, GROUND_MAX_Y),
    };
  }

  preUpdate(_time: number, delta: number): void {
    this.physics.update(delta);
    this.behaviors.forEach((b) => b.update?.(delta));
  }

  /** Fingergeschwindigkeit kurz vor dem Loslassen in px/s. */
  private pointerVelocity(releaseTime: number): { x: number; y: number } {
    const first = this.track[0];
    const last = this.track[this.track.length - 1];
    if (!first || !last || releaseTime - last.t > VELOCITY_STALE_MS) return { x: 0, y: 0 };
    const dt = (last.t - first.t) / 1000;
    if (dt < 0.01) return { x: 0, y: 0 };
    return { x: (last.x - first.x) / dt, y: (last.y - first.y) / dt };
  }
}
