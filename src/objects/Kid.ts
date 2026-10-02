import Phaser from 'phaser';
import { DEPTH_DRAGGING, GROUND_MAX_Y, GROUND_MIN_Y, WORLD_WIDTH } from '../config';
import type { CharacterDef } from '../data/characters';
import { costumeKey, type Outfit, type Slot } from '../data/costumes';
import { COSTUME_ART, layerLayout, type CostumeLayer } from '../scenes/placeholders/costumes';
import {
  ARM_REACH,
  HIP,
  HOLD_POSES,
  KID_FRAME,
  KID_RIG,
  PART_ORDER,
  POSES,
  SEAT_DROP,
  type HoldPose,
  type PartId,
  type PartPose,
  type PoseName,
} from '../data/poses';
import {
  ACTIVITY_FACE,
  ACTIVITY_POSE,
  activityMotion,
  GESTURES,
  merge,
  type Activity,
  type ActivityParams,
  type Deltas,
  type Face,
  type GestureName,
  type MotionContext,
} from './kidMotion';

/** Aktuelle Stellung eines Teils (alle Werte gesetzt). */
type PartState = Required<PartPose>;

const NEUTRAL: PartState = { angle: 0, x: 0, y: 0, scaleY: 1 };
// Abstand Halsgelenk → Mützenrand auf der Stirn (Standardfigur).
const HEAD_TOP = 56;

// So schnell folgen die Gelenke der Bewegung (1/s): weich, aber ohne sichtbare Verzögerung.
const FOLLOW_RATE = 16;
// Nachschwingen beim Ziehen: Federhärte, Dämpfung, Grad pro px/s
const SWAY_STIFFNESS = 70;
const SWAY_DAMPING = 7;
const SWAY_PER_SPEED = 0.03;
const SWAY_MAX = 40;
// So weit (px) in einem Bild ist kein Bewegen mehr, sondern Umsetzen.
const TELEPORT = 60;
// Stehendes Kind ohne Berührung: nach so vielen ms winkt oder hüpft es von selbst
const BORED_MIN = 14000;
const BORED_MAX = 26000;

/** Welche Tätigkeit ohne ausdrückliche Angabe zu einem Modus gehört. */
const MODE_ACTIVITY: Record<KidMode, Activity> = {
  idle: 'idle',
  dragging: 'drag',
  swinging: 'swing',
  sliding: 'slide',
  riding: 'ride-sit',
  bouncing: 'bounce',
  seesawing: 'seesaw',
  bathing: 'bathe',
  hiding: 'hidden',
  playing: 'sit',
  leaving: 'walk',
};

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
  /** Im Kletter-Spielhaus (oben auf dem Podest oder drinnen). */
  | 'playing'
  | 'leaving';

/** Alles, worauf ein Kind "sitzen" kann (z. B. die Schaukel). */
export interface Seat {
  unseat(kid: Kid): void;
  /** Kind wurde angetippt: true = der Sitz hat reagiert (dann hüpft das Kind nicht). */
  tap?(kid: Kid): boolean;
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
  /** Grundpose (weich überblendet über setPose). */
  private readonly base = {} as Record<PartId, PartState>;
  /** Bewegung obendrauf (geglättet), dazu die Summe, wie sie gezeichnet wird. */
  private readonly motion = {} as Record<PartId, PartState>;
  private readonly joints = {} as Record<PartId, PartState>;
  private blend?: { from: Record<PartId, PartState>; to: Record<PartId, PartState>; elapsed: number; duration: number };
  private currentPose: PoseName = 'stand';
  private mirrored = false;
  /**
   * Gesichtsausdruck über dem Kopf (Blinzeln, Lachen, Gähnen); fehlt bei echten Köpfen ohne Gesichter.
   * Achtung: nicht `faces` nennen – daran erkennt Phaser ein Mesh und übergeht die Touch-Fläche.
   */
  private readonly expressions = new Map<Face, Phaser.GameObjects.Image>();
  /** Verkleidung (Ankleidekiste, #70): je Stelle ein Kostüm. */
  private worn: Outfit = {};
  /** Auflagen der Verkleidung: folgen ihrem Körperteil (back = hinter allem, dreht mit dem Rumpf). */
  private overlays: { part: PartId; img: Phaser.GameObjects.Image; width: number; height: number; originX: number }[] = [];

  // Animation
  private explicit?: { activity: Activity; mode: KidMode };
  private params: ActivityParams = {};
  private shownActivity?: Activity;
  private gesture?: { name: GestureName; start: number; dir: number; onDone?: () => void };
  private clock = 0;
  private readonly seed = Math.random() * 10;
  private travel = 0;
  private vx = 0;
  private sway = 0;
  private swayVel = 0;
  private lastX: number;
  private lastY: number;
  private look = 0;
  private lookTarget = 0;
  private nextLook = 0;
  private blinkUntil = 0;
  private nextBlink = 1000 + Math.random() * 3000;
  private boredAt = BORED_MIN + Math.random() * (BORED_MAX - BORED_MIN);
  private idleTime = 0;

  constructor(scene: Phaser.Scene, def: CharacterDef, x: number, y: number) {
    super(scene, x, y);
    this.def = def;
    const s = def.size;
    for (const id of PART_ORDER) {
      const rig = KID_RIG[id];
      const part = scene.add.image(0, 0, `kid-${def.id}-${rig.texture}`).setOrigin(rig.originX, rig.originY);
      this.parts[id] = part;
      this.base[id] = { ...NEUTRAL };
      this.motion[id] = { ...NEUTRAL };
      this.joints[id] = { ...NEUTRAL };
      this.add(part);
    }
    // Gesichter liegen deckungsgleich über dem Kopf und zeigen nur, was sich ändert.
    for (const face of ['blink', 'joy', 'yawn', 'yuck'] as const) {
      const key = `kid-${def.id}-face-${face}`;
      if (!scene.textures.exists(key)) continue;
      const img = scene.add.image(0, 0, key).setOrigin(KID_RIG.head.originX, KID_RIG.head.originY).setVisible(false);
      this.expressions.set(face, img);
      this.add(img);
    }
    this.lastX = x;
    this.lastY = y;
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
      this.idleTime = 0;
      // Z. B. oben im Spielhaus: Antippen = rutschen
      if (this.seatedOn?.tap?.(this)) return;
      // Hält es etwas, macht es damit etwas (pusten, trommeln, gießen, werfen), sonst hüpft es.
      const inHand = this.holding as { useBy?: (kid: Kid) => boolean } | undefined;
      if (!inHand?.useBy?.(this)) this.hop();
    });
  }

  // --- Posen ---------------------------------------------------------------

  /** Name der Pose, auf die das Kind gerade zugeht (oder in der es steht). */
  get pose(): PoseName {
    return this.currentPose;
  }

  /** Wechselt weich in eine Pose (ms = 0: sofort). Tätigkeiten und Gesten setzen ihre Pose selbst. */
  setPose(name: PoseName, ms = 250): this {
    this.currentPose = name;
    const to = {} as Record<PartId, PartState>;
    const pose: Partial<Record<PartId, PartPose>> = POSES[name];
    for (const id of PART_ORDER) to[id] = { ...NEUTRAL, ...pose[id] };
    if (ms <= 0) {
      this.blend = undefined;
      for (const id of PART_ORDER) this.base[id] = { ...to[id] };
      this.applyPose();
      return this;
    }
    const from = {} as Record<PartId, PartState>;
    for (const id of PART_ORDER) from[id] = { ...this.base[id] };
    this.blend = { from, to, elapsed: 0, duration: ms };
    return this;
  }

  // --- Tätigkeiten und Gesten ---------------------------------------------

  /**
   * Sagt dem Kind, was es gerade tut (z. B. 'ride-run' auf dem Laufrad). Gilt, solange der Modus
   * gleich bleibt; danach nimmt das Kind wieder die Tätigkeit, die zu seinem Modus gehört.
   * Kann jedes Bild aufgerufen werden (Parameter wie Sprunghöhe aktualisieren).
   */
  setActivity(activity: Activity, params: ActivityParams = {}): this {
    this.explicit = { activity, mode: this.mode };
    this.params = params;
    return this;
  }

  /** Was das Kind gerade tut. */
  get activity(): Activity {
    return this.explicit && this.explicit.mode === this.mode ? this.explicit.activity : MODE_ACTIVITY[this.mode];
  }

  /** Läuft gerade eine kurze Geste (Hüpfer, Jubel, …)? */
  get gesturing(): boolean {
    return this.gesture !== undefined;
  }

  /** Startet eine kurze Geste. dir: Richtung in der Welt (Wind, Schuss), −1 oder 1. */
  private playGesture(name: GestureName, dir = 1, onDone?: () => void): void {
    const previous = this.gesture;
    this.gesture = { name, start: this.clock, dir, onDone };
    previous?.onDone?.();
    this.idleTime = 0;
    const g = GESTURES[name];
    this.setPose(g.pose ?? ACTIVITY_POSE[this.activity], 240);
  }

  /** Höhe der Hüfte über dem Fußpunkt (px), passend zur aktuellen Pose – zum Aufsetzen auf Sitze. */
  hipHeight(): number {
    return -(HIP.y + this.base.body.y) * this.def.size * this.scaleY;
  }

  /** Hüfthöhe im Sitzen (px), unabhängig von der gerade gezeigten Pose. */
  get sitHeight(): number {
    return -(HIP.y + SEAT_DROP) * this.def.size * this.scaleY;
  }

  preUpdate(_time: number, delta: number): void {
    const dt = Math.min(delta, 50);
    this.clock += dt;
    const sec = dt / 1000;

    // Eigene Bewegung messen: Weg für Schritte, Geschwindigkeit für Schaukeln und Nachschwingen
    const dx = this.x - this.lastX;
    const dy = this.y - this.lastY;
    this.lastX = this.x;
    this.lastY = this.y;
    // Sprünge (auf einen Sitz gesetzt, zurückgestellt) zählen nicht als Bewegung.
    const teleport = Math.hypot(dx, dy) > TELEPORT;
    if (!teleport) this.travel += Math.hypot(dx, dy * 0.5);
    if (teleport) this.vx = 0;
    else if (sec > 0) this.vx += (dx / sec - this.vx) * (1 - Math.exp(-12 * sec));
    const target = Phaser.Math.Clamp(this.vx * SWAY_PER_SPEED, -SWAY_MAX, SWAY_MAX);
    this.swayVel += (SWAY_STIFFNESS * (target - this.sway) - SWAY_DAMPING * this.swayVel) * sec;
    this.sway = Phaser.Math.Clamp(this.sway + this.swayVel * sec, -SWAY_MAX * 1.5, SWAY_MAX * 1.5);

    if (!this.visible) return;

    const activity = this.activity;
    const g = this.gesture;
    const gDef = g && GESTURES[g.name];
    if (g && gDef && this.clock - g.start >= gDef.duration) {
      this.gesture = undefined;
      this.setPose(ACTIVITY_POSE[activity], 260);
      g.onDone?.();
    } else if (activity !== this.shownActivity && !this.gesture) {
      this.setPose(ACTIVITY_POSE[activity], this.shownActivity === undefined ? 0 : 320);
    }
    // Neue Tätigkeit: alter Schwung (z. B. vom Ziehen) soll nicht in die neue hineinwirken.
    if (activity !== this.shownActivity) this.vx = 0;
    this.shownActivity = activity;

    this.updateIdle(activity, dt);
    this.advanceBlend(dt);

    // Bewegung dieses Bildes
    const t = this.clock / 1000;
    let deltas: Deltas;
    const gesture = this.gesture;
    if (gesture) {
      const def = GESTURES[gesture.name];
      const p = (this.clock - gesture.start) / def.duration;
      const localDir = gesture.dir * (this.mirrored ? -1 : 1);
      // Atmen läuft auch während der Geste weiter
      deltas = merge(activity === 'idle' ? activityMotion('idle', this.context(t)) : {}, def.motion?.(p, t, localDir) ?? {});
    } else {
      deltas = activityMotion(activity, this.context(t));
    }
    const k = 1 - Math.exp(-FOLLOW_RATE * sec);
    for (const id of PART_ORDER) {
      const want = deltas[id];
      const m = this.motion[id];
      m.angle += ((want?.angle ?? 0) - m.angle) * k;
      m.x += ((want?.x ?? 0) - m.x) * k;
      m.y += ((want?.y ?? 0) - m.y) * k;
      m.scaleY += ((want?.scaleY ?? 1) - m.scaleY) * k;
    }
    this.applyPose();
  }

  private context(t: number): MotionContext {
    return {
      t,
      travel: this.travel,
      vx: this.vx,
      sway: this.sway,
      look: this.look,
      seed: this.seed,
      params: this.params,
    };
  }

  /** Stehen: herumschauen, blinzeln, nach einer Weile ohne Berührung von selbst winken oder hüpfen. */
  private updateIdle(activity: Activity, dt: number): void {
    if (this.clock >= this.nextLook) {
      this.nextLook = this.clock + 1800 + Math.random() * 3200;
      this.lookTarget = Math.random() < 0.35 ? 0 : (Math.random() * 2 - 1) * 9;
    }
    this.look += (this.lookTarget - this.look) * 0.05;
    if (this.clock >= this.nextBlink) {
      this.blinkUntil = this.clock + 140;
      this.nextBlink = this.clock + 2200 + Math.random() * 3800;
    }
    if (activity === 'idle' && !this.gesture && !this.scene.tweens.isTweening(this)) {
      this.idleTime += dt;
      if (this.idleTime >= this.boredAt) {
        this.idleTime = 0;
        this.boredAt = BORED_MIN + Math.random() * (BORED_MAX - BORED_MIN);
        if (Math.random() < 0.5) this.playGesture('greet');
        else this.hop();
      }
    } else {
      this.idleTime = 0;
    }
    this.updateFace(activity);
  }

  private updateFace(activity: Activity): void {
    let face: Face | undefined = this.gesture ? GESTURES[this.gesture.name].face : ACTIVITY_FACE[activity];
    if (activity === 'bounce' && (this.params.height ?? 0) < 0.3 && !this.params.salto) face = undefined;
    if (!face && this.clock < this.blinkUntil) face = 'blink';
    for (const [name, img] of this.expressions) img.setVisible(name === face);
  }

  private advanceBlend(dt: number): void {
    const b = this.blend;
    if (!b) return;
    b.elapsed += dt;
    const t = Phaser.Math.Easing.Sine.InOut(Math.min(1, b.elapsed / b.duration));
    for (const id of PART_ORDER) {
      const f = b.from[id];
      const e = b.to[id];
      const st = this.base[id];
      st.angle = f.angle + (e.angle - f.angle) * t;
      st.x = f.x + (e.x - f.x) * t;
      st.y = f.y + (e.y - f.y) * t;
      st.scaleY = f.scaleY + (e.scaleY - f.scaleY) * t;
    }
    if (b.elapsed >= b.duration) this.blend = undefined;
  }

  /**
   * Setzt die Teile nach den Gelenkstellungen: Beine und Rumpf hängen an der Hüfte, Kopf und
   * Arme drehen sich mit dem Rumpf. Gespiegelt (flipX) wird die ganze Figur um die Mitte.
   */
  private applyPose(): void {
    for (const id of PART_ORDER) {
      const b = this.base[id];
      const m = this.motion[id];
      const j = this.joints[id];
      j.angle = b.angle + m.angle;
      j.x = b.x + m.x;
      j.y = b.y + m.y;
      j.scaleY = b.scaleY * m.scaleY;
    }
    // Wer etwas hält, hält die Arme so, wie es der Gegenstand braucht (HOLD_POSES); die Bewegung
    // der Tätigkeit (Atmen, Trommeln, …) läuft obendrauf weiter. Arme hoch (Jubeln) bleiben hoch.
    const holdPose = this.holding?.getData('holdPose') as HoldPose | undefined;
    if (holdPose && this.mode !== 'hiding') {
      const arms = HOLD_POSES[holdPose].arms;
      for (const id of ['arm-l', 'arm-r'] as const) {
        const angle = arms[id];
        if (angle === undefined) continue;
        const j = this.joints[id];
        const raisedHigher = Math.abs(this.base[id].angle) > Math.abs(angle) + 20;
        if (!raisedHigher) j.angle = angle + this.motion[id].angle;
      }
    }
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
    this.placeOverlays();
    const head = this.parts.head;
    for (const face of this.expressions.values()) {
      face
        .setPosition(head.x, head.y)
        .setRotation(head.rotation)
        .setFlipX(this.mirrored)
        .setScale((KID_RIG.head.width * s) / face.width, (KID_RIG.head.height * s) / face.height);
    }
  }

  // --- Verkleidung (Ankleidekiste, #70) --------------------------------------

  /** Was das Kind gerade trägt (Kopie). */
  get outfit(): Outfit {
    return { ...this.worn };
  }

  /**
   * Zieht die Verkleidung an: Jedes Teil liegt als Auflage auf seinem Körperteil und macht alle
   * Posen mit. Zeichenreihenfolge: Umhang/Schwanz ganz hinten, dann je Körperteil erst das Teil,
   * darüber Hose/Rock, darüber Oberteil bzw. Schuhe, beim Kopf Gesicht und dann Hut.
   */
  setOutfit(outfit: Outfit): this {
    this.worn = { ...outfit };
    this.overlays.forEach((o) => o.img.destroy());
    this.overlays = [];
    const byLayer = new Map<CostumeLayer, Phaser.GameObjects.Image[]>();
    const make = (slot: Slot, layer: CostumeLayer, part: PartId) => {
      const costume = this.worn[slot];
      if (!costume) return;
      for (const art of COSTUME_ART[costume][slot]) {
        if (art.layer !== layer) continue;
        const key = costumeKey(costume, slot, layer);
        if (!this.scene.textures.exists(key)) continue;
        const { width, height, originX, originY } = layerLayout(art);
        const img = this.scene.add.image(0, 0, key).setOrigin(originX, originY);
        this.overlays.push({ part, img, width, height, originX });
        const list = byLayer.get(layer) ?? [];
        list.push(img);
        byLayer.set(layer, list);
      }
    };
    // Reihenfolge der Stellen je Ebene (was weiter hinten steht, zuerst)
    const order: Record<CostumeLayer, Slot[]> = { back: ['bottom', 'top'], leg: ['bottom', 'feet'], arm: ['top'], body: ['bottom', 'top'], head: ['head'] };
    const layerOf: Record<PartId, CostumeLayer> = { 'leg-l': 'leg', 'leg-r': 'leg', 'arm-l': 'arm', 'arm-r': 'arm', body: 'body', head: 'head' };
    // Alles aus dem Container nehmen und in der richtigen Reihenfolge wieder hinein
    const faces = [...this.expressions.values()];
    for (const child of [...this.list]) this.remove(child);
    for (const slot of order.back) make(slot, 'back', 'body');
    (byLayer.get('back') ?? []).forEach((img) => this.add(img));
    for (const id of PART_ORDER) {
      this.add(this.parts[id]);
      if (id === 'head') faces.forEach((f) => this.add(f));
      const layer = layerOf[id];
      const before = this.overlays.length;
      for (const slot of order[layer]) make(slot, layer, id);
      this.overlays.slice(before).forEach((o) => this.add(o.img));
    }
    this.applyPose();
    return this;
  }

  /** Legt die Verkleidung auf ihre Körperteile (nach jeder Pose). */
  private placeOverlays(): void {
    const s = this.def.size;
    for (const o of this.overlays) {
      const p = this.parts[o.part];
      const scaleY = this.joints[o.part].scaleY;
      o.img
        .setPosition(p.x, p.y)
        .setRotation(p.rotation)
        .setFlipX(this.mirrored)
        // Gespiegelt liegt der Drehpunkt auf der anderen Seite des Bildes
        .setOrigin(this.mirrored ? 1 - o.originX : o.originX, o.img.originY)
        .setScale((o.width * s) / o.img.width, (o.height * s * scaleY) / o.img.height)
        .setVisible(p.visible);
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
    this.overlays.forEach((o) => o.img.setTint(color));
    return this;
  }

  clearTint(): this {
    for (const id of PART_ORDER) this.parts[id].clearTint();
    this.overlays.forEach((o) => o.img.clearTint());
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
    this.endGesture();
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
      this.land();
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
      onComplete: () => {
        this.land();
        onLanded?.();
      },
    });
  }

  /** Landen: kurz in die Knie gehen und wieder aufrichten. */
  land(): void {
    if (this.mode === 'idle') this.playGesture('land');
  }

  /** Bricht eine laufende Geste ab (z. B. beim Hochheben). */
  private endGesture(): void {
    const g = this.gesture;
    if (!g) return;
    this.gesture = undefined;
    g.onDone?.();
  }

  /** Kleiner Freudensprung beim Antippen: Arme hoch, lachen. */
  hop(): void {
    if (this.mode !== 'idle' || this.scene.tweens.isTweening(this)) return;
    this.playGesture('hop');
    this.scene.tweens.add({
      targets: this,
      y: this.y - 70,
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

  /**
   * Mützenrand oben am Kopf in der Welt, passend zur Pose – auch im Sitzen oder mit schiefem
   * Kopf. rotation: Neigung des Kopfes insgesamt.
   */
  headTop(): { x: number; y: number; rotation: number } {
    const head = this.parts.head;
    const up = HEAD_TOP * this.def.size;
    // im Container: vom Halsgelenk entlang der Kopfneigung nach oben
    const lx = head.x + Math.sin(head.rotation) * up;
    const ly = head.y - Math.cos(head.rotation) * up;
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    const sx = lx * this.scaleX;
    const sy = ly * this.scaleY;
    return { x: this.x + sx * cos - sy * sin, y: this.y + sx * sin + sy * cos, rotation: this.rotation + head.rotation };
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

  /** Jubel (z. B. bei einem Tor): hoher Sprung, beide Arme hoch und winken. */
  cheer(): void {
    if (this.mode !== 'idle' || this.scene.tweens.isTweening(this)) return;
    this.playGesture('cheer');
    this.scene.tweens.add({
      targets: this,
      y: this.y - 110,
      duration: 220,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  /** Kichert (z. B. unter der Gießkanne): Hände vor dem Bauch, schüttelt sich lachend. */
  giggle(): void {
    if (this.mode !== 'idle' || this.gesture) return;
    this.playGesture('giggle');
  }

  /** Schüttelt den Kopf (z. B. falsches Essen, aber nicht eklig). */
  shakeHead(): void {
    this.playGesture('no');
  }

  /** Bäh! (z. B. verbranntes Würstchen): Kopf schütteln, abwehren, angewidertes Gesicht. */
  yuck(onDone?: () => void): void {
    this.playGesture('yuck', 1, onDone);
  }

  /** Gähnt (nachts): streckt die Arme hoch, Mund auf. */
  yawn(): void {
    if (this.mode !== 'idle' || this.gesture) return;
    this.playGesture('yawn');
  }

  /** Böe: lehnt sich gegen den Wind, Arme schützend hoch, zittert kurz. */
  brace(windDir: number): void {
    if (this.mode !== 'idle' || this.gesture) return;
    this.playGesture('brace', Math.sign(windDir) || 1);
  }

  /** Kickt etwas weg: das Bein auf der Seite schwingt nach vorn, Arme balancieren. */
  kick(dir: number): void {
    if (this.mode !== 'idle' || this.gesture) return;
    this.playGesture('kick', Math.sign(dir) || 1);
  }

  /** Kurze Bewegung beim Benutzen eines gehaltenen Spielzeugs (trommeln, werfen, pusten). */
  act(name: 'drum' | 'throw' | 'blow' | 'photo'): void {
    if (this.mode === 'leaving' || this.mode === 'hiding' || this.mode === 'dragging') return;
    this.playGesture(name);
  }

  /** Winkt zum Abschied mit einem Arm. */
  wave(onDone: () => void): void {
    this.playGesture('wave', 1, onDone);
  }
}
