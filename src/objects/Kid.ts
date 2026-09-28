import Phaser from 'phaser';
import { DEPTH_DRAGGING, GROUND_MAX_Y, GROUND_MIN_Y, WORLD_WIDTH } from '../config';
import type { CharacterDef } from '../data/characters';
import { ARM_REACH, HIP, KID_FRAME, KID_RIG, PART_ORDER, POSES, type PartId, type PartPose, type PoseName } from '../data/poses';

/** Aktuelle Stellung eines Teils (alle Werte gesetzt). */
type PartState = Required<PartPose>;

const NEUTRAL: PartState = { angle: 0, x: 0, y: 0, scaleY: 1 };

export type KidMode =
  | 'idle'
  | 'dragging'
  | 'swinging'
  | 'sliding'
  | 'riding'
  | 'bouncing'
  | 'seesawing'
  | 'bathing'
  | 'hiding'
  | 'leaving';

/** Alles, worauf ein Kind "sitzen" kann (z. B. die Schaukel). */
export interface Seat {
  unseat(kid: Kid): void;
}

/**
 * Ein Kind aus beweglichen Einzelteilen (Rumpf, Kopf, Arme, Beine), die an Gelenken hängen.
 * Der Container steht wie früher das Einzelbild auf dem Fußpunkt; die Bild-Methoden, die der
 * Rest des Spiels braucht (flipX, displayHeight, getBounds, setTint, …), bietet Kid weiter an.
 * Posen (src/data/poses.ts) wechselt `setPose(name, ms)` weich.
 */
export class Kid extends Phaser.GameObjects.Container {
  readonly def: CharacterDef;
  mode: KidMode = 'idle';
  seatedOn?: Seat;
  /** Wo das Kind steht, wenn eine laufende Aktion (Schaukeln, Rutschen) abbricht. */
  exitPoint?: { x: number; y: number };
  /** Was das Kind gerade in der Hand hält (Ballon, Drachen, …). */
  holding?: Phaser.GameObjects.GameObject;
  /** Hula-Hoop-Reifen, der gerade um die Hüfte kreist. */
  hula?: Phaser.GameObjects.GameObject;

  private readonly parts = {} as Record<PartId, Phaser.GameObjects.Image>;
  private readonly joints = {} as Record<PartId, PartState>;
  private blend?: { from: Record<PartId, PartState>; to: Record<PartId, PartState>; elapsed: number; duration: number };
  private currentPose: PoseName = 'stand';
  private mirrored = false;

  constructor(scene: Phaser.Scene, def: CharacterDef, x: number, y: number) {
    super(scene, x, y);
    this.def = def;
    const s = def.size;
    for (const id of PART_ORDER) {
      const rig = KID_RIG[id];
      const part = scene.add.image(0, 0, `kid-${def.id}-${rig.texture}`).setOrigin(rig.originX, rig.originY);
      this.parts[id] = part;
      this.joints[id] = { ...NEUTRAL };
      this.add(part);
    }
    this.applyPose();
    // Fläche wie das frühere Einzelbild: Fußpunkt unten Mitte.
    this.setSize(KID_FRAME.width * s, KID_FRAME.height * s);
    this.setDepth(y);
    scene.add.existing(this);
    this.addToUpdateList();

    // Container rechnen die Touch-Fläche ab ihrer Mitte (displayOrigin 0.5/0.5), der
    // Fußpunkt liegt also bei (width/2, height/2) dieser Fläche.
    this.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(0, -this.height / 2, this.width, this.height),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      draggable: true,
      useHandCursor: true,
    });
    // Ereignisse 'tapped' und 'grabbed', damit z. B. ein Hula-Hoop-Reifen reagieren kann.
    this.setData('onTap', () => {
      this.emit('tapped');
      this.hop();
    });
  }

  // --- Posen ---------------------------------------------------------------

  /** Name der Pose, auf die das Kind gerade zugeht (oder in der es steht). */
  get pose(): PoseName {
    return this.currentPose;
  }

  /** Wechselt weich in eine Pose (ms = 0: sofort). */
  setPose(name: PoseName, ms = 250): this {
    this.currentPose = name;
    const to = {} as Record<PartId, PartState>;
    const pose: Partial<Record<PartId, PartPose>> = POSES[name];
    for (const id of PART_ORDER) to[id] = { ...NEUTRAL, ...pose[id] };
    if (ms <= 0) {
      this.blend = undefined;
      for (const id of PART_ORDER) this.joints[id] = { ...to[id] };
      this.applyPose();
      return this;
    }
    const from = {} as Record<PartId, PartState>;
    for (const id of PART_ORDER) from[id] = { ...this.joints[id] };
    this.blend = { from, to, elapsed: 0, duration: ms };
    return this;
  }

  preUpdate(_time: number, delta: number): void {
    const b = this.blend;
    if (!b) return;
    b.elapsed += delta;
    const t = Phaser.Math.Easing.Sine.InOut(Math.min(1, b.elapsed / b.duration));
    for (const id of PART_ORDER) {
      const f = b.from[id];
      const e = b.to[id];
      const st = this.joints[id];
      st.angle = f.angle + (e.angle - f.angle) * t;
      st.x = f.x + (e.x - f.x) * t;
      st.y = f.y + (e.y - f.y) * t;
      st.scaleY = f.scaleY + (e.scaleY - f.scaleY) * t;
    }
    if (b.elapsed >= b.duration) this.blend = undefined;
    this.applyPose();
  }

  /**
   * Setzt die Teile nach den Gelenkstellungen: Beine und Rumpf hängen an der Hüfte, Kopf und
   * Arme drehen sich mit dem Rumpf. Gespiegelt (flipX) wird die ganze Figur um die Mitte.
   */
  private applyPose(): void {
    const s = this.def.size;
    const m = this.mirrored ? -1 : 1;
    const body = this.joints.body;
    const hipX = HIP.x + body.x;
    const hipY = HIP.y + body.y;
    const bodyRad = Phaser.Math.DegToRad(body.angle);
    const cos = Math.cos(bodyRad);
    const sin = Math.sin(bodyRad);
    for (const id of PART_ORDER) {
      const rig = KID_RIG[id];
      const st = this.joints[id];
      let jx: number;
      let jy: number;
      let angle = st.angle;
      if (id === 'body') {
        jx = hipX;
        jy = hipY;
      } else if (rig.attach === 'body') {
        // Gelenk relativ zur Hüfte mit dem Rumpf mitdrehen
        const rx = rig.jointX - HIP.x;
        const ry = rig.jointY - HIP.y;
        jx = hipX + rx * cos - ry * sin + st.x;
        jy = hipY + rx * sin + ry * cos + st.y;
        angle += body.angle;
      } else {
        // Beine: an der Hüfte, verschieben sich mit ihr (z. B. im Sitzen), drehen aber nicht mit.
        jx = rig.jointX + st.x + body.x;
        jy = rig.jointY + st.y;
      }
      this.parts[id]
        .setPosition(jx * s * m, jy * s)
        .setAngle(angle * m)
        .setFlipX(this.mirrored)
        // Auf Rig-Größe bringen (echte Grafiken dürfen eine andere Auflösung haben)
        .setScale((rig.width * s) / this.parts[id].width, (rig.height * s * st.scaleY) / this.parts[id].height);
    }
  }

  // --- Was früher das Einzelbild konnte ------------------------------------

  get flipX(): boolean {
    return this.mirrored;
  }

  set flipX(value: boolean) {
    this.setFlipX(value);
  }

  /** Spiegelt die Figur (schaut nach links). */
  setFlipX(value: boolean): this {
    if (this.mirrored !== value) {
      this.mirrored = value;
      this.applyPose();
    }
    return this;
  }

  /** Färbt alle Teile ein (wie Image.setTint). */
  setTint(color: number): this {
    for (const id of PART_ORDER) this.parts[id].setTint(color);
    return this;
  }

  clearTint(): this {
    for (const id of PART_ORDER) this.parts[id].clearTint();
    return this;
  }

  /**
   * Umriss wie beim früheren Einzelbild: die ganze Figurfläche, gedreht und skaliert um den
   * Fußpunkt – unabhängig davon, wo Arme und Beine gerade sind (Treffer bleiben verlässlich).
   */
  getBounds<O extends Phaser.Geom.Rectangle>(output?: O): O {
    const out = (output ?? new Phaser.Geom.Rectangle()) as O;
    const w = this.width * this.scaleX;
    const h = this.height * this.scaleY;
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    const xs: number[] = [];
    const ys: number[] = [];
    for (const [lx, ly] of [
      [-w / 2, -h],
      [w / 2, -h],
      [w / 2, 0],
      [-w / 2, 0],
    ]) {
      xs.push(this.x + lx * cos - ly * sin);
      ys.push(this.y + lx * sin + ly * cos);
    }
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    return out.setTo(left, top, Math.max(...xs) - left, Math.max(...ys) - top) as O;
  }

  handleDragStart(): void {
    this.emit('grabbed');
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
    this.x = Phaser.Math.Clamp(this.x, 60, WORLD_WIDTH - 60);
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
      x: Phaser.Math.Clamp(p.x, 60, WORLD_WIDTH - 60),
      y: Phaser.Math.Clamp(p.y, GROUND_MIN_Y, GROUND_MAX_Y),
    };
  }

  /** Wo die rechte Hand ist (für Schnüre von Ballon, Drachen, …), passend zur Pose. */
  handPoint(): { x: number; y: number } {
    const arm = this.parts['arm-r'];
    const rad = arm.rotation;
    // Hand = Schulter + Armlänge in Armrichtung (im Container, dann mit dessen Maßstab)
    const lx = arm.x - Math.sin(rad) * ARM_REACH * this.def.size;
    const ly = arm.y + Math.cos(rad) * ARM_REACH * this.def.size;
    return { x: this.x + lx * this.scaleX, y: this.y + ly * this.scaleY };
  }

  /** Jubel-Hüpfer (z. B. bei einem Tor): höher als der normale Hüpfer. */
  cheer(): void {
    if (this.mode !== 'idle' || this.scene.tweens.isTweening(this)) return;
    this.scene.tweens.add({
      targets: this,
      y: this.y - 110,
      scaleY: 1.08,
      angle: { from: -6, to: 6 },
      duration: 220,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.setAngle(0);
      },
    });
  }

  /** Schüttelt sich lachend (z. B. unter der Gießkanne). */
  giggle(): void {
    if (this.mode !== 'idle' || this.scene.tweens.isTweening(this)) return;
    this.scene.tweens.add({
      targets: this,
      angle: { from: -8, to: 8 },
      duration: 60,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        this.setAngle(0);
      },
    });
  }

  /** Gähnt (nachts): langsam strecken und wieder zusammensinken. */
  yawn(): void {
    if (this.mode !== 'idle' || this.scene.tweens.isTweening(this)) return;
    this.scene.tweens.add({
      targets: this,
      scaleY: 1.07,
      angle: -4,
      duration: 700,
      hold: 350,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.setAngle(0).setScale(1);
      },
    });
  }

  /** Böe: lehnt sich gegen den Wind und hält sich fest (kurzes Zittern). */
  brace(windDir: number): void {
    if (this.mode !== 'idle' || this.scene.tweens.isTweening(this)) return;
    const lean = -windDir * 8;
    this.scene.tweens.chain({
      targets: this,
      tweens: [
        { angle: lean, duration: 250, ease: 'Sine.easeOut' },
        { angle: lean - windDir * 3, duration: 70, yoyo: true, repeat: 4 },
        { angle: 0, duration: 350, ease: 'Sine.easeInOut' },
      ],
    });
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
