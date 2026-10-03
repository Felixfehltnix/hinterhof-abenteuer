import Phaser from 'phaser';
import {
  ARM,
  BRUSH,
  FACE,
  GLITTER_COLORS,
  HEAD_SCALE,
  MIRROR,
  PEN_SIZE,
  RACK,
  RAINBOW,
  SHAPE_ROWS,
  SHEET,
  SHEET_COLORS,
  STENCIL,
  SWITCH,
  TATTOO,
  type Mode,
  type RackItem,
  type ShapeId,
  type ToolDef,
} from '../data/makeup';
import type { CharacterDef } from '../data/characters';
import { drawArm } from './placeholders/makeup';
import { FACE_X, FACE_Y } from './placeholders/kids';

/** Was die Wiese dem Schminken mitgibt: das Kind, das geschminkt wird. */
export interface MakeupData {
  def: CharacterDef;
  /** Spiegel angetippt und Kind hat sich angeschaut: zurück auf die Wiese. */
  onDone(): void;
}

/** Ein Werkzeug in einer Hand (je Finger eins). */
interface Held {
  tool: ToolDef;
  sprite: Phaser.GameObjects.Container;
  /** Letzter Punkt auf dem Gesicht (für durchgehende Striche). */
  last?: { x: number; y: number };
  nextGrain: number;
}

/** Ein Glitzertattoo: Vorlage auf dem Arm, darunter Kleber und Glitzer (nur in der ausgeschnittenen Form). */
interface Tattoo {
  id: ShapeId;
  /** Mitte der Vorlage auf dem Bildschirm. */
  x: number;
  y: number;
  stencil: Phaser.GameObjects.Image;
  glue: Phaser.GameObjects.RenderTexture;
  glitter: Phaser.GameObjects.RenderTexture;
  curl?: Phaser.GameObjects.Image;
  /** Raster (Zellen der Vorlage): Form, beklebt, bestreut. */
  shape: boolean[];
  glued: boolean[];
  sparkled: boolean[];
  shapeCount: number;
  gluedCount: number;
  sparkledCount: number;
  /** Genug Kleber und Glitzer: Die Vorlage lässt sich abziehen. */
  ready: boolean;
  /** Vorlage ist ab, das Tattoo bleibt. */
  peeled: boolean;
  wiped: number;
}

/** Was ein Finger gerade zieht: eine neue Vorlage vom Bogen oder die aufgeklebte Vorlage (abziehen). */
type StencilDrag = { kind: 'place'; id: ShapeId; sprite: Phaser.GameObjects.Image } | { kind: 'peel'; tattoo: Tattoo; dx: number; dy: number };

const DEPTH = { arm: 8, head: 10, paint: 11, face: 12, rack: 20, cup: 25, glue: 14, glitter: 15, stencil: 16, twinkle: 30, drag: 400, held: 500 };
/** Abstand der Stempel entlang eines Strichs (px). */
const SPACING = { pen: 4, powder: 22, sponge: 24, glue: 7 };
const COLS = Math.ceil(STENCIL.size / STENCIL.cell);

/**
 * Kinderschminken: Das Kind, das auf den Schminkkoffer gezogen wurde, zeigt sein Gesicht groß.
 * Stifte, Puder (Quaste) und Glitzerpuder (Dose) zieht man aus dem Regal und führt sie über das
 * Gesicht; der Schwamm wischt alles weg. Der Knopf mit dem Arm (unten) zeigt den Unterarm: Dort
 * zieht man eine Vorlage vom Bogen auf die Haut, pinselt Kleber in die ausgeschnittene Form,
 * streut Glitzer (er bleibt nur am Kleber) und reißt die Vorlage ab – es bleibt die Form aus Glitzer.
 * Der Handspiegel unten rechts ist „fertig“: Das Kind freut sich, dann geht es zurück auf die Wiese.
 * Kein Text, kein Verlieren.
 */
export class MakeupScene extends Phaser.Scene {
  private params!: MakeupData;
  private mode: Mode = 'face';
  private paint!: Phaser.GameObjects.RenderTexture;
  private joy?: Phaser.GameObjects.Image;
  private blink?: Phaser.GameObjects.Image;
  private sparkles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private falling!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private held = new Map<number, Held>();
  private drags = new Map<number, StencilDrag>();
  /** Wo Glitzer liegt (Bildschirmkoordinaten, je Ansicht): Dort funkelt es. */
  private grains: { x: number; y: number; mode: Mode }[] = [];
  private touchedAt = -9999;
  private nextBlink = 0;
  private blinkUntil = 0;
  private lastSound = new Map<string, number>();
  private mirror!: Phaser.GameObjects.Image;
  private leaving = false;
  /** Nur im Gesicht / nur am Arm sichtbar. */
  private faceViews: Phaser.GameObjects.GameObject[] = [];
  private armViews: Phaser.GameObjects.GameObject[] = [];
  private rackViews: { item: RackItem; view: Phaser.GameObjects.Container }[] = [];
  private switches: { mode: Mode; img: Phaser.GameObjects.Image }[] = [];
  private sheet: Phaser.GameObjects.GameObject[] = [];
  private portrait!: Phaser.GameObjects.Image;
  private tattoos: Tattoo[] = [];
  /** Die Vorlage, die gerade auf dem Arm klebt (noch nicht abgezogen). */
  private active?: Tattoo;
  private shapeCache = new Map<ShapeId, boolean[]>();

  constructor() {
    super('Makeup');
  }

  create(data: MakeupData): void {
    this.params = data;
    this.mode = 'face';
    this.held = new Map();
    this.drags = new Map();
    this.grains = [];
    this.touchedAt = -9999;
    this.nextBlink = 0;
    this.blinkUntil = 0;
    this.lastSound = new Map();
    this.leaving = false;
    this.faceViews = [];
    this.armViews = [];
    this.rackViews = [];
    this.switches = [];
    this.sheet = [];
    this.tattoos = [];
    this.active = undefined;
    this.shapeCache = new Map();

    // Töne spielt die Wiese (dort lebt der AudioContext)
    const playground = this.scene.get('Playground');
    this.events.off('sound');
    this.events.on('sound', (e: unknown) => playground.events.emit('sound', e));

    this.add.image(0, 0, 'mk-bg').setOrigin(0);
    this.buildHead(data.def);
    this.buildArm(data.def);
    this.buildRack();
    this.buildSwitches();

    this.mirror = this.add.image(MIRROR.x, MIRROR.y, 'mk-mirror').setDepth(DEPTH.rack);
    this.tweens.add({ targets: this.mirror, angle: { from: -4, to: 4 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.sparkles = this.add.particles(0, 0, 'twinkle', {
      speed: { min: 80, max: 380 },
      lifespan: { min: 600, max: 1200 },
      scale: { start: 1.6, end: 0 },
      tint: [0xffffff, 0xffd166, 0xff8fab, 0x8ecae6],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    this.sparkles.setDepth(DEPTH.twinkle);
    // Glitzer, der aus der Dose rieselt
    this.falling = this.add.particles(0, 0, 'mk-grain', {
      speedX: { min: -40, max: 40 },
      speedY: { min: 40, max: 120 },
      gravityY: 900,
      lifespan: 700,
      scale: { start: 0.9, end: 0.4 },
      alpha: { start: 1, end: 0 },
      emitting: false,
    });
    this.falling.setDepth(DEPTH.held - 1);
    // Staubwölkchen der Quaste
    this.dust = this.add.particles(0, 0, 'smoke', {
      speed: { min: 20, max: 90 },
      lifespan: 700,
      scale: { start: 0.5, end: 1.2 },
      alpha: { start: 0.45, end: 0 },
      emitting: false,
    });
    this.dust.setDepth(DEPTH.held - 1);

    this.time.addEvent({ delay: 220, loop: true, callback: () => this.twinkle() });
    this.setupInput();
    this.applyMode();
    this.cameras.main.fadeIn(350, 0, 0, 0);
  }

  // --- Aufbau ---------------------------------------------------------------------------

  /** Der große Kopf, darauf die Zeichenfläche (nur im Gesicht) und die Gesichtsausdrücke. */
  private buildHead(def: CharacterDef): void {
    const key = `kid-${def.id}-head`;
    const src = this.textures.get(key).getSourceImage();
    const ox = (FACE_X * def.size) / src.width;
    const oy = (FACE_Y * def.size) / src.height;
    const scale = HEAD_SCALE / def.size;
    this.faceViews.push(this.add.image(FACE.x, FACE.y, key).setOrigin(ox, oy).setScale(scale).setDepth(DEPTH.head));

    const R = FACE.radius;
    this.paint = this.add.renderTexture(FACE.x - R, FACE.y - R, R * 2, R * 2).setOrigin(0).setDepth(DEPTH.paint);
    const mask = this.make.graphics({ x: 0, y: 0 }, false);
    mask.fillStyle(0xffffff);
    mask.fillCircle(FACE.x, FACE.y, R);
    this.paint.setMask(mask.createGeometryMask());
    this.faceViews.push(this.paint);

    const face = (name: string) => {
      const k = `kid-${def.id}-face-${name}`;
      if (!this.textures.exists(k)) return undefined;
      return this.add.image(FACE.x, FACE.y, k).setOrigin(ox, oy).setScale(scale).setDepth(DEPTH.face).setVisible(false);
    };
    this.joy = face('joy');
    this.blink = face('blink');
  }

  /** Der Unterarm (Hautfarbe und Ärmel des Kindes), der Vorlagenbogen und ein kleines Porträt. */
  private buildArm(def: CharacterDef): void {
    const key = `mk-arm-${def.id}`;
    if (!this.textures.exists(key)) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      drawArm(g, def.skin, def.shirt);
      g.generateTexture(key, ARM.w, ARM.h);
      g.destroy();
    }
    this.armViews.push(this.add.image(ARM.x, ARM.y, key).setOrigin(0).setDepth(DEPTH.arm));

    // Bogen mit neun Vorlagen (Fantasie, Essen, Tiere), jede in Pastell
    const { x, y, pad, cell } = SHEET;
    this.sheet.push(this.add.image(x, y, 'mk-sheet').setOrigin(0).setDepth(DEPTH.rack));
    SHAPE_ROWS.forEach((row, r) =>
      row.forEach((id, c) => {
        const cx = x + pad + c * cell + cell / 2;
        const cy = y + pad + r * cell + cell / 2;
        this.sheet.push(this.add.image(cx, cy, `mk-shape-${id}`).setScale(0.55).setTint(SHEET_COLORS[r]).setDepth(DEPTH.rack + 1));
      }),
    );
    this.armViews.push(...this.sheet);

    // Porträt des Kindes (damit man sieht, wer geschminkt wird); freut sich über ein fertiges Tattoo
    this.portrait = this.add.image(1650, 170, `portrait-${def.id}`).setScale(1.3).setDepth(DEPTH.rack);
    this.armViews.push(this.portrait);
  }

  /** Stifte im Becher, Puder, Glitzerdosen, Schwamm, Kleber: jedes Stück wartet an seinem Platz. */
  private buildRack(): void {
    for (const item of RACK) {
      const view = this.makeToolView(item.tool, item.x, item.y, false).setDepth(DEPTH.rack);
      this.rackViews.push({ item, view });
    }
    const cup = this.add.image(285, 910, 'mk-cup').setOrigin(0.5, 1).setDepth(DEPTH.cup);
    this.faceViews.push(cup);
  }

  /** Umschalter Gesicht / Arm. */
  private buildSwitches(): void {
    for (const mode of ['face', 'arm'] as Mode[]) {
      const img = this.add.image(SWITCH[mode].x, SWITCH[mode].y, `mk-sw-${mode}`).setDepth(DEPTH.rack);
      this.switches.push({ mode, img });
    }
  }

  /** Zeigt, was zur Ansicht gehört (Gesicht oder Arm). */
  private applyMode(): void {
    const face = this.mode === 'face';
    this.faceViews.forEach((o) => (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(face));
    this.armViews.forEach((o) => (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(!face));
    for (const t of this.tattoos) this.showTattoo(t, !face);
    for (const { item, view } of this.rackViews) view.setVisible(item.modes.includes(this.mode));
    for (const sw of this.switches) sw.img.setScale(sw.mode === this.mode ? 1.12 : 0.88).setAlpha(sw.mode === this.mode ? 1 : 0.8);
    if (face) this.sheetEnabled(true);
    else this.sheetEnabled(!this.active);
  }

  private sheetEnabled(on: boolean): void {
    this.sheet.forEach((o) => (o as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(on ? 1 : 0.45));
  }

  private showTattoo(t: Tattoo, on: boolean): void {
    t.glue.setVisible(on);
    t.glitter.setVisible(on);
    t.stencil.setVisible(on && !t.peeled);
    t.curl?.setVisible(on && !t.peeled);
  }

  private setMode(mode: Mode): void {
    if (mode === this.mode) return;
    for (const id of [...this.held.keys()]) this.drop(id);
    for (const id of [...this.drags.keys()]) this.cancelDrag(id);
    this.mode = mode;
    this.applyMode();
    this.play('click', 0);
  }

  /** Bild eines Werkzeugs: im Regal (inHand = false) oder in der Hand (Spitze bzw. Mitte bei x, y). */
  private makeToolView(tool: ToolDef, x: number, y: number, inHand: boolean): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    switch (tool.kind) {
      case 'pen': {
        // Im Regal steht der Stift mit der Spitze nach oben im Becher, in der Hand zeigt sie nach unten
        const pen = this.add.image(0, inHand ? 0 : PEN_SIZE.height / 2, 'mk-pen').setOrigin(0.5, 1).setTint(tool.color);
        pen.setFlipY(!inHand);
        c.add(pen);
        if (inHand) c.setAngle(14);
        break;
      }
      case 'powder': {
        if (inHand) {
          const handle = this.add.image(0, -18, 'mk-puff-handle').setOrigin(0.5, 1);
          c.add([handle, this.add.image(0, 0, 'mk-puff-head').setTint(tool.color)]);
          c.setAngle(24);
        } else {
          c.add([this.add.image(0, 0, 'mk-pan'), this.add.image(0, 0, 'mk-pan-fill').setTint(tool.color)]);
        }
        break;
      }
      case 'glitter': {
        const rainbow = tool.color === 'rainbow';
        const fill = this.add.image(0, 0, rainbow ? 'mk-jar-rainbow' : 'mk-jar-fill');
        if (!rainbow) fill.setTint(tool.color as number);
        const jar = this.add.image(0, 0, 'mk-jar');
        if (inHand) {
          // Deckel unten am Finger, Körper darüber
          for (const img of [fill, jar]) img.setOrigin(0.5, 1).setFlipY(true);
          c.setAngle(-18);
        }
        c.add([fill, jar]);
        break;
      }
      case 'sponge':
        c.add(this.add.image(0, 0, 'mk-sponge'));
        if (inHand) c.setAngle(-10);
        break;
      case 'glue':
        if (inHand) {
          c.add(this.add.image(0, 0, 'mk-glue-brush').setOrigin(0.5, 1));
          c.setAngle(16);
        } else c.add(this.add.image(0, 0, 'mk-glue-pot'));
        break;
    }
    return c;
  }

  // --- Eingabe ---------------------------------------------------------------------------

  private setupInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.leaving || this.held.has(p.id) || this.drags.has(p.id)) return;
      const M = MIRROR;
      if (Math.abs(p.x - M.x) < M.w / 2 && Math.abs(p.y - M.y) < M.h / 2) {
        this.finish();
        return;
      }
      const sw = this.switches.find((s) => Phaser.Math.Distance.Between(p.x, p.y, SWITCH[s.mode].x, SWITCH[s.mode].y) < SWITCH.size / 2 + 10);
      if (sw) {
        this.setMode(sw.mode);
        return;
      }
      if (this.mode === 'arm' && (this.pickStencil(p) || this.pickSheet(p))) return;
      const item = RACK.find((r) => r.modes.includes(this.mode) && this.hits(r, p.x, p.y));
      if (!item) return;
      const sprite = this.makeToolView(item.tool, p.x, p.y, true).setDepth(DEPTH.held);
      this.held.set(p.id, { tool: item.tool, sprite, nextGrain: 0 });
      this.play('click', 0);
      this.use(this.held.get(p.id)!, p.x, p.y);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      const d = this.drags.get(p.id);
      if (d) return this.moveDrag(d, p);
      const h = this.held.get(p.id);
      if (!h) return;
      h.sprite.setPosition(p.x, p.y);
      this.use(h, p.x, p.y);
    });
    const up = (p: Phaser.Input.Pointer) => {
      this.drop(p.id);
      this.endDrag(p.id);
    };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);
  }

  private hits(r: RackItem, x: number, y: number): boolean {
    return Math.abs(x - r.x) < r.w / 2 && Math.abs(y - r.y) < r.h / 2;
  }

  /** Werkzeug loslassen: es fliegt zurück ins Regal. */
  private drop(id: number): void {
    const h = this.held.get(id);
    if (!h) return;
    this.held.delete(id);
    const home = RACK.find((r) => r.tool === h.tool)!;
    this.tweens.add({
      targets: h.sprite,
      x: home.x,
      y: home.y,
      alpha: 0,
      duration: 220,
      ease: 'Quad.easeIn',
      onComplete: () => h.sprite.destroy(),
    });
  }

  update(): void {
    const now = this.time.now;
    // Glitzerdose in der Hand: Solange der Finger liegt, rieselt es weiter (die Dose „schüttelt“)
    for (const [id, h] of this.held) {
      const p = this.input.manager.pointers.find((q) => q.id === id);
      if (h.tool.kind === 'glitter' && p?.isDown) this.use(h, p.x, p.y);
    }
    // Gesicht: blinzelt ab und zu, freut sich beim Schminken
    const happy = now - this.touchedAt < 450;
    this.joy?.setVisible(this.mode === 'face' && happy);
    if (now > this.nextBlink) {
      this.blinkUntil = now + 140;
      this.nextBlink = now + Phaser.Math.Between(2500, 5000);
    }
    this.blink?.setVisible(this.mode === 'face' && !happy && now < this.blinkUntil);
  }

  // --- Schminken -------------------------------------------------------------------------

  /** Das Werkzeug berührt (x, y): auf dem Gesicht wird gemalt, gepudert, gestreut oder gewischt; am Arm geklebt. */
  private use(h: Held, x: number, y: number): void {
    const onFace = this.mode === 'face' && Phaser.Math.Distance.Between(x, y, FACE.x, FACE.y) <= FACE.radius + 12;
    const now = this.time.now;
    switch (h.tool.kind) {
      case 'pen':
        if (!onFace) return void (h.last = undefined);
        this.line(h, x, y, SPACING.pen, (px, py) => this.stamp('mk-dot', px, py, { tint: (h.tool as { color: number }).color, scale: (BRUSH.pen * 2) / 64, alpha: 1 }));
        this.touch('paint', 170);
        break;
      case 'powder':
        if (!onFace) return void (h.last = undefined);
        this.line(h, x, y, SPACING.powder, (px, py) => this.stamp('glow-soft', px, py, { tint: (h.tool as { color: number }).color, scale: (BRUSH.powder * 2) / 128, alpha: 0.16 }));
        this.dust.setParticleTint((h.tool as { color: number }).color);
        this.dust.emitParticleAt(x, y, 1);
        this.touch('puff', 220);
        break;
      case 'glitter': {
        // Dose über dem Gesicht bzw. der Vorlage: Körnchen fallen darauf und rieseln daran vorbei
        this.falling.emitParticleAt(x + 4, y + 8, 1);
        if (now < h.nextGrain) return;
        const color = (h.tool as { color: (typeof GLITTER_COLORS)[number] }).color;
        const t = this.mode === 'arm' ? this.active : undefined;
        if (this.mode === 'face' && !onFace) return;
        if (this.mode === 'arm' && !t) return;
        h.nextGrain = now + BRUSH.glitterEvery;
        for (let i = 0; i < BRUSH.glitterGrains; i++) {
          const a = Math.random() * Math.PI * 2;
          const d = Math.sqrt(Math.random()) * BRUSH.glitterSpread;
          const gx = x + Math.cos(a) * d;
          const gy = y + 30 + Math.sin(a) * d;
          const tint = color === 'rainbow' ? RAINBOW[Phaser.Math.Between(0, RAINBOW.length - 1)] : color;
          const scale = Phaser.Math.FloatBetween(0.6, 1.2);
          const rotation = Math.random() * Math.PI;
          if (t) {
            // Am Arm bleibt Glitzer nur am Kleber hängen
            const l = this.local(t, gx, gy);
            if (!t.glued[this.cell(l.x, l.y)]) continue;
            t.glitter.stamp('mk-grain', undefined, l.x, l.y, { tint, scale: scale / STENCIL.scale, rotation });
            this.markSparkle(t, l.x, l.y);
          } else {
            if (Phaser.Math.Distance.Between(gx, gy, FACE.x, FACE.y) > FACE.radius) continue;
            this.stamp('mk-grain', gx, gy, { tint, scale, rotation });
          }
          if (this.grains.length < 500) this.grains.push({ x: gx, y: gy, mode: this.mode });
        }
        this.touch('glitter', 230);
        break;
      }
      case 'sponge':
        if (this.mode === 'arm') return this.wipeArm(h, x, y);
        if (!onFace) return void (h.last = undefined);
        this.line(h, x, y, SPACING.sponge, (px, py) => {
          this.paint.stamp('mk-dot', undefined, px - (FACE.x - FACE.radius), py - (FACE.y - FACE.radius), { scale: (BRUSH.sponge * 2) / 64, erase: true });
          this.grains = this.grains.filter((g) => g.mode !== 'face' || Phaser.Math.Distance.Between(g.x, g.y, px, py) > BRUSH.sponge);
        });
        this.touch('wipe', 150);
        break;
      case 'glue':
        this.glueAt(h, x, y);
        break;
    }
  }

  /** Stempelt entlang der Strecke vom letzten Punkt zu (x, y), damit Striche geschlossen sind. */
  private line(h: Held, x: number, y: number, spacing: number, stamp: (x: number, y: number) => void): void {
    const from = h.last;
    h.last = { x, y };
    if (!from) return stamp(x, y);
    const d = Phaser.Math.Distance.Between(from.x, from.y, x, y);
    if (d > 300) return stamp(x, y);
    const n = Math.max(1, Math.ceil(d / spacing));
    for (let i = 1; i <= n; i++) stamp(from.x + ((x - from.x) * i) / n, from.y + ((y - from.y) * i) / n);
  }

  /** Stempel auf die Zeichenfläche (Bildschirmkoordinaten, werden zur Fläche umgerechnet). */
  private stamp(key: string, x: number, y: number, config: Phaser.Types.Textures.StampConfig): void {
    this.paint.stamp(key, undefined, x - (FACE.x - FACE.radius), y - (FACE.y - FACE.radius), config);
  }

  /** Kind freut sich, Ton (nicht öfter als alle `every` ms). */
  private touch(sound: string, every: number): void {
    this.touchedAt = this.time.now;
    this.play(sound, every);
  }

  private play(kind: string, every: number): void {
    const now = this.time.now;
    if (now - (this.lastSound.get(kind) ?? -9999) < every) return;
    this.lastSound.set(kind, now);
    this.events.emit('sound', { kind });
  }

  /** Auf dem Glitzer funkelt es ab und zu. */
  private twinkle(): void {
    const list = this.grains.filter((g) => g.mode === this.mode);
    if (list.length === 0 || this.leaving) return;
    for (let i = 0; i < 2; i++) {
      const g = list[Phaser.Math.Between(0, list.length - 1)];
      const star = this.add.image(g.x, g.y, 'twinkle').setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.twinkle).setScale(0.1);
      this.tweens.add({ targets: star, scale: 0.7, alpha: { from: 1, to: 0 }, angle: 90, duration: 520, ease: 'Sine.easeOut', onComplete: () => star.destroy() });
    }
  }

  // --- Glitzertattoo ---------------------------------------------------------------------

  /** Punkt auf dem Bildschirm → Punkt in der Vorlage (0 … STENCIL.size). */
  private local(t: { x: number; y: number }, x: number, y: number): { x: number; y: number } {
    const half = STENCIL.size / 2;
    return { x: (x - t.x) / STENCIL.scale + half, y: (y - t.y) / STENCIL.scale + half };
  }

  private cell(lx: number, ly: number): number {
    if (lx < 0 || ly < 0 || lx >= STENCIL.size || ly >= STENCIL.size) return -1;
    return Math.floor(ly / STENCIL.cell) * COLS + Math.floor(lx / STENCIL.cell);
  }

  /** Raster der Form: welche Zellen der Vorlage ausgeschnitten sind (aus dem Umriss `mk-shape-<id>`). */
  private shapeCells(id: ShapeId): boolean[] {
    const cached = this.shapeCache.get(id);
    if (cached) return cached;
    const size = STENCIL.shapeSize;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(this.textures.get(`mk-shape-${id}`).getSourceImage() as CanvasImageSource, 0, 0);
    const data = ctx.getImageData(0, 0, size, size).data;
    const offset = (STENCIL.size - size) / 2;
    const cells: boolean[] = new Array(COLS * COLS).fill(false);
    for (let cy = 0; cy < COLS; cy++) {
      for (let cx = 0; cx < COLS; cx++) {
        const sx = Math.floor(cx * STENCIL.cell + STENCIL.cell / 2 - offset);
        const sy = Math.floor(cy * STENCIL.cell + STENCIL.cell / 2 - offset);
        if (sx >= 0 && sy >= 0 && sx < size && sy < size) cells[cy * COLS + cx] = data[(sy * size + sx) * 4 + 3] > 128;
      }
    }
    this.shapeCache.set(id, cells);
    return cells;
  }

  /** Auf den Bogen getippt: eine Vorlage nehmen (nur, wenn gerade keine auf dem Arm klebt). */
  private pickSheet(p: Phaser.Input.Pointer): boolean {
    const { x, y, pad, cell } = SHEET;
    const c = Math.floor((p.x - x - pad) / cell);
    const r = Math.floor((p.y - y - pad) / cell);
    if (c < 0 || c > 2 || r < 0 || r > 2) return false;
    if (this.active) {
      this.shake(this.active.stencil);
      return true;
    }
    const id = SHAPE_ROWS[r][c];
    const sprite = this.add.image(p.x, p.y, `mk-stencil-${id}`).setScale(STENCIL.scale).setDepth(DEPTH.drag);
    this.drags.set(p.id, { kind: 'place', id, sprite });
    this.play('click', 0);
    return true;
  }

  /** Die aufgeklebte Vorlage angefasst: abziehen. */
  private pickStencil(p: Phaser.Input.Pointer): boolean {
    const t = this.active;
    if (!t) return false;
    const half = (STENCIL.size * STENCIL.scale) / 2;
    if (Math.abs(p.x - t.x) > half || Math.abs(p.y - t.y) > half) return false;
    this.drags.set(p.id, { kind: 'peel', tattoo: t, dx: t.stencil.x - p.x, dy: t.stencil.y - p.y });
    t.stencil.setDepth(DEPTH.drag);
    this.play('peel', 0);
    return true;
  }

  private moveDrag(d: StencilDrag, p: Phaser.Input.Pointer): void {
    if (d.kind === 'place') {
      d.sprite.setPosition(p.x, p.y);
      return;
    }
    const t = d.tattoo;
    t.stencil.setPosition(p.x + d.dx, p.y + d.dy);
    // Je weiter weg, desto schiefer
    const off = Phaser.Math.Distance.Between(t.stencil.x, t.stencil.y, t.x, t.y);
    t.stencil.setAngle(Phaser.Math.Clamp((t.stencil.x - t.x) / 12, -25, 25) * Math.min(1, off / 60));
  }

  private endDrag(id: number): void {
    const d = this.drags.get(id);
    if (!d) return;
    this.drags.delete(id);
    if (d.kind === 'place') return this.placeStencil(d.id, d.sprite);
    const t = d.tattoo;
    const off = Phaser.Math.Distance.Between(t.stencil.x, t.stencil.y, t.x, t.y);
    if (off > TATTOO.peelDistance) this.peelOff(t);
    else {
      // Nicht weit genug gezogen: klebt wieder fest
      t.stencil.setDepth(DEPTH.stencil);
      this.tweens.add({ targets: t.stencil, x: t.x, y: t.y, angle: 0, duration: 160, ease: 'Back.easeOut' });
    }
  }

  /** Ein Zug wird abgebrochen (z. B. Umschalten): Vorlage geht zurück. */
  private cancelDrag(id: number): void {
    const d = this.drags.get(id);
    if (!d) return;
    this.drags.delete(id);
    if (d.kind === 'place') d.sprite.destroy();
    else {
      d.tattoo.stencil.setDepth(DEPTH.stencil).setPosition(d.tattoo.x, d.tattoo.y).setAngle(0);
    }
  }

  /** Vorlage loslassen: Auf dem Arm klebt sie fest (an die nächste freie Stelle geschoben), sonst fliegt sie zurück. */
  private placeStencil(id: ShapeId, sprite: Phaser.GameObjects.Image): void {
    const spot = this.freeSpot(sprite.x, sprite.y);
    if (!spot) {
      this.tweens.add({ targets: sprite, alpha: 0, scale: 0.4, duration: 200, onComplete: () => sprite.destroy() });
      return;
    }
    this.tweens.add({
      targets: sprite,
      x: spot.x,
      y: spot.y,
      duration: 140,
      ease: 'Quad.easeOut',
      onComplete: () => {
        sprite.setDepth(DEPTH.stencil);
        this.stickStencil(id, spot.x, spot.y, sprite);
      },
    });
  }

  /** Passende Stelle auf der Haut (mit Abstand zu fertigen Tattoos) nahe (x, y), oder undefined. */
  private freeSpot(x: number, y: number): { x: number; y: number } | undefined {
    const { area } = ARM;
    // Muss grob über dem Arm losgelassen werden
    if (x < area.x0 - 120 || x > area.x1 + 120 || y < area.y0 - 80 || y > area.y1 + 80) return undefined;
    const half = (STENCIL.size * STENCIL.scale) / 2 - 8;
    const cy = Phaser.Math.Clamp(y, area.y0 + half, area.y1 - half);
    const free = (cx: number) =>
      cx - half >= area.x0 && cx + half <= area.x1 && this.tattoos.every((t) => Math.abs(t.x - cx) > half * 2 - 12 || Math.abs(t.y - cy) > half * 2 - 12);
    for (let d = 0; d <= 600; d += 20) {
      for (const dir of d === 0 ? [0] : [-1, 1]) {
        const cx = x + dir * d;
        if (free(cx)) return { x: cx, y: cy };
      }
    }
    return undefined;
  }

  /** Die Vorlage klebt auf dem Arm: darunter entstehen Kleber- und Glitzerfläche. */
  private stickStencil(id: ShapeId, x: number, y: number, stencil: Phaser.GameObjects.Image): void {
    const size = STENCIL.size;
    const left = x - (size * STENCIL.scale) / 2;
    const top = y - (size * STENCIL.scale) / 2;
    const rt = (depth: number) => this.add.renderTexture(left, top, size, size).setOrigin(0).setScale(STENCIL.scale).setDepth(depth);
    const shape = this.shapeCells(id);
    const t: Tattoo = {
      id,
      x,
      y,
      stencil,
      glue: rt(DEPTH.glue),
      glitter: rt(DEPTH.glitter),
      shape,
      glued: new Array(shape.length).fill(false),
      sparkled: new Array(shape.length).fill(false),
      shapeCount: shape.filter(Boolean).length,
      gluedCount: 0,
      sparkledCount: 0,
      ready: false,
      peeled: false,
      wiped: 0,
    };
    this.active = t;
    this.tattoos.push(t);
    this.sheetEnabled(false);
    this.play('click', 0);
  }

  /** Kleber auftragen: nur in der ausgeschnittenen Form (was daneben landet, bleibt auf dem Papier). */
  private glueAt(h: Held, x: number, y: number): void {
    const t = this.active;
    if (this.mode !== 'arm' || !t || t.peeled) return void (h.last = undefined);
    const half = (STENCIL.size * STENCIL.scale) / 2;
    if (Math.abs(x - t.x) > half || Math.abs(y - t.y) > half) return void (h.last = undefined);
    const rLocal = TATTOO.glueRadius / STENCIL.scale;
    this.line(h, x, y, SPACING.glue, (px, py) => {
      const l = this.local(t, px, py);
      t.glue.stamp('mk-dot', undefined, l.x, l.y, { tint: 0xbfe0ff, alpha: 0.65, scale: (rLocal * 2) / 64 });
      t.glue.stamp('mk-dot', undefined, l.x - rLocal * 0.3, l.y - rLocal * 0.3, { tint: 0xffffff, alpha: 0.5, scale: (rLocal * 0.7) / 64 });
      // Zellen merken
      const r = Math.ceil(rLocal / STENCIL.cell);
      const cx = Math.floor(l.x / STENCIL.cell);
      const cy = Math.floor(l.y / STENCIL.cell);
      for (let yy = cy - r; yy <= cy + r; yy++) {
        for (let xx = cx - r; xx <= cx + r; xx++) {
          if (xx < 0 || yy < 0 || xx >= COLS || yy >= COLS) continue;
          const i = yy * COLS + xx;
          const dx = xx * STENCIL.cell + STENCIL.cell / 2 - l.x;
          const dy = yy * STENCIL.cell + STENCIL.cell / 2 - l.y;
          if (t.shape[i] && !t.glued[i] && dx * dx + dy * dy <= rLocal * rLocal) {
            t.glued[i] = true;
            t.gluedCount++;
          }
        }
      }
    });
    // Außerhalb der Form wieder wegnehmen (Vorlage als Maske)
    t.glue.stamp(`mk-stencil-${t.id}`, undefined, 0, 0, { originX: 0, originY: 0, erase: true });
    this.touch('glue', 200);
    this.checkReady(t);
  }

  /** Glitzer ist gelandet: die Zellen ringsum gelten als bestreut. */
  private markSparkle(t: Tattoo, lx: number, ly: number): void {
    const cx = Math.floor(lx / STENCIL.cell);
    const cy = Math.floor(ly / STENCIL.cell);
    for (let yy = cy - 1; yy <= cy + 1; yy++) {
      for (let xx = cx - 1; xx <= cx + 1; xx++) {
        if (xx < 0 || yy < 0 || xx >= COLS || yy >= COLS) continue;
        const i = yy * COLS + xx;
        if (t.glued[i] && !t.sparkled[i]) {
          t.sparkled[i] = true;
          t.sparkledCount++;
        }
      }
    }
    this.checkReady(t);
  }

  /** Genug Kleber und Glitzer: Die Ecke der Vorlage rollt sich, man kann sie abziehen. */
  private checkReady(t: Tattoo): void {
    if (t.ready || t.peeled) return;
    if (t.gluedCount < TATTOO.glueNeed * t.shapeCount || t.sparkledCount < TATTOO.glitterNeed * t.shapeCount) return;
    t.ready = true;
    const half = (STENCIL.size * STENCIL.scale) / 2;
    t.curl = this.add.image(t.x + half - 4, t.y - half + 4, 'mk-curl').setOrigin(1, 0).setDepth(DEPTH.stencil + 1);
    this.tweens.add({ targets: t.curl, angle: { from: -8, to: 8 }, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: t.stencil, angle: { from: -1.5, to: 1.5 }, duration: 300, yoyo: true, repeat: 3, onComplete: () => t.stencil.setAngle(0) });
    this.sparkles.emitParticleAt(t.x + half, t.y - half, 12);
    this.events.emit('sound', { kind: 'sparkle', pitch: 5 });
  }

  /** Vorlage abgerissen: Sie fliegt weg, nur das Glitzertattoo bleibt. */
  private peelOff(t: Tattoo): void {
    this.active = undefined;
    t.peeled = true;
    t.curl?.destroy();
    t.curl = undefined;
    this.tweens.killTweensOf(t.stencil);
    const stencil = t.stencil;
    this.tweens.add({
      targets: stencil,
      x: stencil.x + (stencil.x >= t.x ? 360 : -360),
      y: stencil.y - 260,
      angle: stencil.x >= t.x ? 40 : -40,
      alpha: 0,
      duration: 520,
      ease: 'Quad.easeIn',
      onComplete: () => stencil.destroy(),
    });
    this.events.emit('sound', { kind: 'peel' });
    if (t.gluedCount === 0) {
      // Nichts beklebt: gar kein Tattoo
      t.glue.destroy();
      t.glitter.destroy();
      this.tattoos = this.tattoos.filter((o) => o !== t);
    } else {
      this.events.emit('sound', { kind: 'tattoo-done' });
      const half = (STENCIL.size * STENCIL.scale) / 2;
      for (let i = 0; i < 3; i++) this.time.delayedCall(i * 160, () => this.sparkles.emitParticleAt(t.x + Phaser.Math.Between(-half, half), t.y + Phaser.Math.Between(-half, half), 10));
      this.tweens.add({ targets: this.portrait, scale: { from: 1.55, to: 1.3 }, duration: 500, ease: 'Elastic.easeOut' });
    }
    this.sheetEnabled(true);
  }

  /** Schwamm am Arm: wischt fertige Tattoos nach und nach ab. */
  private wipeArm(h: Held, x: number, y: number): void {
    const half = (STENCIL.size * STENCIL.scale) / 2;
    for (const t of [...this.tattoos]) {
      if (!t.peeled || Math.abs(x - t.x) > half || Math.abs(y - t.y) > half) continue;
      const l = this.local(t, x, y);
      const scale = (BRUSH.sponge * 2) / STENCIL.scale / 64;
      t.glue.stamp('mk-dot', undefined, l.x, l.y, { scale, erase: true });
      t.glitter.stamp('mk-dot', undefined, l.x, l.y, { scale, erase: true });
      this.grains = this.grains.filter((g) => g.mode !== 'arm' || Math.abs(g.x - t.x) > half || Math.abs(g.y - t.y) > half || Phaser.Math.Distance.Between(g.x, g.y, x, y) > BRUSH.sponge);
      if (++t.wiped >= TATTOO.wipeCount) {
        this.tattoos = this.tattoos.filter((o) => o !== t);
        this.tweens.add({ targets: [t.glue, t.glitter], alpha: 0, duration: 250, onComplete: () => (t.glue.destroy(), t.glitter.destroy()) });
      }
    }
    h.last = undefined;
    this.touch('wipe', 150);
  }

  /** Vorlage wackelt kurz (geht gerade nicht). */
  private shake(obj: Phaser.GameObjects.Image): void {
    if (this.tweens.isTweening(obj)) return;
    this.tweens.add({ targets: obj, angle: { from: -4, to: 4 }, duration: 70, yoyo: true, repeat: 2, onComplete: () => obj.setAngle(0) });
  }

  // --- Fertig ----------------------------------------------------------------------------

  /** Spiegel: Das Kind schaut hinein und freut sich, dann zurück auf die Wiese. */
  private finish(): void {
    this.leaving = true;
    for (const id of [...this.held.keys()]) this.drop(id);
    for (const id of [...this.drags.keys()]) this.cancelDrag(id);
    // Noch aufgeklebte Vorlage mit Glitzer: einfach abziehen
    if (this.active) this.peelOff(this.active);
    this.mode = 'face';
    this.applyMode();
    this.events.emit('sound', { kind: 'tattoo-done' });
    this.touchedAt = this.time.now + 1800;
    this.tweens.killTweensOf(this.mirror);
    this.tweens.add({ targets: this.mirror, x: FACE.x + 420, y: 760, scale: 1.7, angle: -8, duration: 500, ease: 'Back.easeOut' });
    for (let i = 0; i < 4; i++) {
      this.time.delayedCall(i * 300, () => this.sparkles.emitParticleAt(Phaser.Math.Between(FACE.x - 200, FACE.x + 200), Phaser.Math.Between(FACE.y - 200, FACE.y + 120), 14));
    }
    this.time.delayedCall(1900, () => {
      // force: Läuft das Einblenden auf einem langsamen Gerät noch, würde ein normales fadeOut ignoriert
      this.cameras.main.fade(350, 0, 0, 0, true);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.params.onDone());
    });
  }
}
