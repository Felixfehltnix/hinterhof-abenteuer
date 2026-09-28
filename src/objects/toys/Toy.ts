import Phaser from 'phaser';
import { GROUND_MAX_Y, GROUND_MIN_Y, MIN_TOUCH_SIZE, WORLD_WIDTH } from '../../config';
import { DEFAULT_TOY_PARAMS, type ToyDef, type ToyParams } from '../../data/toys';
import { BEHAVIORS, type Release, type ToyBehavior } from './behaviors';
import { environment } from '../../world/environment';
import type { Kid } from '../Kid';
import { ToyPhysics } from './ToyPhysics';

// Nur die Fingerbewegung der letzten Millisekunden zählt für die Wurfgeschwindigkeit.
const VELOCITY_WINDOW_MS = 100;
// Hat der Finger vor dem Loslassen so lange stillgehalten, wird nicht geworfen.
const VELOCITY_STALE_MS = 60;
// So schnell wirft ein Kind etwas aus der Hand (wie ein kräftiger Wisch schräg nach oben, px/s).
const THROW_SPEED = { x: 1100, y: -600 };

// Die Zeichen-Methoden von Phaser.GameObjects.Image, die Toy für die Drehung um die Mitte umhüllt.
const IMAGE_RENDER = Phaser.GameObjects.Image.prototype as unknown as {
  renderWebGL(...args: unknown[]): void;
  renderCanvas(...args: unknown[]): void;
};

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
  /** Wird gerade von einem Finger gezogen. */
  isDragging = false;
  /** Das Kind, das es gerade an der Schnur hält (holdable). */
  heldBy?: Kid;
  /**
   * Bodenlinie, auf der es aufgehoben wurde. Wird es in der Luft losgelassen, landet es wieder
   * dort. undefined = frisch aus der Kiste (landet dann ganz hinten).
   */
  pickupGroundY?: number;
  /**
   * Drehung beim Rollen und Fliegen (rad, params.spin). Nur fürs Bild und um die Mitte:
   * Position (Fußpunkt), Tiefe, Touch-Fläche und Bounds bleiben ungedreht.
   * `rotation` bleibt frei für Wackeln & Co. (dreht um den Fußpunkt).
   */
  spin = 0;

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
    this.setData('onTap', (pointer?: Phaser.Input.Pointer) => {
      // In der Hand eines Kindes: Antippen des Spielzeugs wirkt wie Antippen des Kindes
      // (Kinder tippen oft genau auf das, was das Kind hochhält). Ohne eigene Aktion bleibt es beim
      // normalen Antippen (z. B. Taschenlampe an/aus).
      if (this.heldBy && this.behaviors.some((b) => b.onUse) && this.useBy(this.heldBy)) return;
      this.behaviors.forEach((b) => b.onTap?.(pointer));
    });
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.behaviors.forEach((b) => b.onDestroy?.()));
  }

  handleDragStart(): void {
    this.scene.tweens.killTweensOf(this);
    this.pickupGroundY = this.physics.active ? this.physics.groundY : Phaser.Math.Clamp(this.y, GROUND_MIN_Y, GROUND_MAX_Y);
    this.physics.stop();
    this.setRotation(0);
    this.track = [];
    this.isDragging = true;
    this.behaviors.forEach((b) => b.onDragStart?.());
  }

  handleDrag(pointer: Phaser.Input.Pointer, x: number, y: number): void {
    this.setPosition(x, y);
    // Zeitstempel des Touch-Ereignisses, nicht des Frames: bleibt auch bei Rucklern genau.
    // Wurfgeschwindigkeit = Bewegung des Fingers auf dem Bildschirm. So zählt das Mitscrollen
    // am Bildschirmrand nicht als Wurf, nur ein echter Schwung des Fingers.
    const now = pointer.moveTime;
    this.track.push({ x: pointer.x, y: pointer.y, t: now });
    while (this.track.length > 2 && now - this.track[0].t > VELOCITY_WINDOW_MS) this.track.shift();
    this.behaviors.forEach((b) => b.onDrag?.(x, y));
  }

  handleDragEnd(pointer: Phaser.Input.Pointer): void {
    // In der Luft losgelassen (über der Wiese): fällt auf die Linie zurück, wo es aufgehoben wurde.
    const onGround = this.y >= GROUND_MIN_Y;
    this.isDragging = false;
    this.launchWith({ onGround, groundY: onGround ? undefined : this.pickupGroundY, pointerVelocity: this.pointerVelocity(pointer.upTime) });
  }

  /** Wie Loslassen: Die Bausteine entscheiden über Wurf, Landung oder eigene Bewegung. */
  private launchWith(r: Omit<Release, 'vx' | 'vy'>): void {
    const release: Release = { vx: 0, vy: 0, ...r };
    this.behaviors.forEach((b) => b.onDragEnd?.(release));
    if (!release.handled) this.physics.launch(release.vx, release.vy, release.groundY, release.vdepth ?? 0);
  }

  // --- In der Hand eines Kindes (Baustein handheld/holdable) ---------------

  /** Zusätzliche Neigung, solange ein Kind es hält (z. B. Gießkanne kippen). */
  handTilt = 0;

  /** Das haltende Kind wurde angetippt. true = eine Aktion lief (sonst hüpft das Kind). */
  useBy(kid: Kid): boolean {
    let used = false;
    for (const b of this.behaviors) used = (b.onUse?.(kid) ?? false) || used;
    return used;
  }

  /** Das Kind lässt es los; drop = vor die Füße fallen lassen. */
  letGo(drop = true): void {
    this.behaviors.forEach((b) => b.onLetGo?.(drop));
  }

  /** Das haltende Kind wirft es in Blickrichtung (dir = 1 rechts, −1 links), es landet auf groundY. */
  throwFromHand(dir: number, groundY: number): void {
    this.letGo(false);
    this.launchWith({ onGround: false, fromHand: true, groundY, pointerVelocity: { x: dir * THROW_SPEED.x, y: THROW_SPEED.y } });
  }

  /** Ein Kind wurde auf diesem Spielzeug losgelassen. true = ein Baustein hat es angenommen. */
  offerKid(kid: Kid): boolean {
    return this.behaviors.some((b) => b.onKidDropped?.(kid) ?? false);
  }

  /** Ein anderes Spielzeug wurde hierauf losgelassen. true = ein Baustein hat es angenommen. */
  offerToy(other: Toy): boolean {
    return this.behaviors.some((b) => b.onToyDropped?.(other) ?? false);
  }

  /** Etwas hineingeben (z. B. Sand in den Eimer). */
  receive(kind: string, amount: number): void {
    this.behaviors.forEach((b) => b.onReceive?.(kind, amount));
  }

  /** Wird von der Szene aufgerufen, bevor das Spielzeug verschwindet. */
  notifyRemoved(): void {
    this.behaviors.forEach((b) => b.onRemove?.());
  }

  /** Position fürs Speichern: ein fliegendes Spielzeug liegt schon dort, wo es landen wird. */
  restPosition(): { x: number; y: number } {
    const y = this.physics.active ? this.physics.groundY : this.y;
    return {
      x: Phaser.Math.Clamp(this.x, this.width / 2, WORLD_WIDTH - this.width / 2),
      y: Phaser.Math.Clamp(y, GROUND_MIN_Y, GROUND_MAX_Y),
    };
  }

  preUpdate(_time: number, delta: number): void {
    // Wind weckt leichte, liegende Spielzeuge (Schwebendes bewegt sich selbst).
    if (
      !this.physics.active &&
      !this.isDragging &&
      !this.heldBy &&
      Math.abs(environment.wind * this.params.windFactor) > 40 &&
      !this.def.behaviors.some((b) => b === 'float' || b === 'kite')
    ) {
      this.physics.launch(0, 0);
    }
    this.physics.update(delta);
    this.behaviors.forEach((b) => b.update?.(delta));
  }

  // Phaser ruft diese beiden zum Zeichnen auf (in den Typen von Image nicht aufgeführt).
  renderWebGL(...args: unknown[]): void {
    this.withSpin(() => IMAGE_RENDER.renderWebGL.apply(this, args));
  }

  renderCanvas(...args: unknown[]): void {
    this.withSpin(() => IMAGE_RENDER.renderCanvas.apply(this, args));
  }

  /**
   * Zeichnet mit zusätzlicher Drehung um die Bildmitte. Phaser dreht immer um den Origin
   * (hier den Fußpunkt); darum wird der Fußpunkt nur für diesen einen Zeichenaufruf so
   * verschoben, dass die Mitte an ihrem Platz bleibt.
   */
  private withSpin(draw: () => void): void {
    if (this.spin === 0) {
      draw();
      return;
    }
    const { x, y, rotation } = this;
    // Abstand Fußpunkt → Mitte (Origin 0.5, 1)
    const half = this.displayHeight * (this.originY - 0.5);
    const total = rotation + this.spin;
    // Mitte, wie sie ohne Drehung (nur mit Wackeln um den Fußpunkt) läge …
    const cx = x + Math.sin(rotation) * half;
    const cy = y - Math.cos(rotation) * half;
    // … und der Fußpunkt, von dem aus die gedrehte Grafik genau dort ihre Mitte hat.
    this.x = cx - Math.sin(total) * half;
    this.y = cy + Math.cos(total) * half;
    this.rotation = total;
    try {
      draw();
    } finally {
      this.x = x;
      this.y = y;
      this.rotation = rotation;
    }
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
