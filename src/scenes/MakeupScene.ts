import Phaser from 'phaser';
import {
  BRUSH,
  FACE,
  GLITTER_COLORS,
  HEAD_SCALE,
  MIRROR,
  PEN_SIZE,
  RACK,
  RAINBOW,
  type RackItem,
  type ToolDef,
} from '../data/makeup';
import type { CharacterDef } from '../data/characters';
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

const DEPTH = { rack: 20, cup: 25, head: 10, paint: 11, face: 12, twinkle: 30, held: 500, ui: 600 };
/** Abstand der Stempel entlang eines Strichs (px). */
const SPACING = { pen: 4, powder: 22, sponge: 24 };

/**
 * Kinderschminken: Das Kind, das auf den Schminkkoffer gezogen wurde, zeigt sein Gesicht groß.
 * Stifte, Puder (Quaste) und Glitzerpuder (Dose) zieht man aus dem Regal und führt sie über das
 * Gesicht; der Schwamm wischt alles weg. Der Handspiegel unten rechts ist „fertig“: Das Kind freut
 * sich, dann geht es zurück auf die Wiese. Kein Text, kein Verlieren.
 */
export class MakeupScene extends Phaser.Scene {
  private params!: MakeupData;
  private paint!: Phaser.GameObjects.RenderTexture;
  private joy?: Phaser.GameObjects.Image;
  private blink?: Phaser.GameObjects.Image;
  private sparkles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private falling!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private held = new Map<number, Held>();
  /** Wo Glitzer liegt (Bildschirmkoordinaten): Dort funkelt es. */
  private grains: { x: number; y: number }[] = [];
  private touchedAt = -9999;
  private nextBlink = 0;
  private blinkUntil = 0;
  private lastSound = new Map<string, number>();
  private mirror!: Phaser.GameObjects.Image;
  private leaving = false;

  constructor() {
    super('Makeup');
  }

  create(data: MakeupData): void {
    this.params = data;
    this.held = new Map();
    this.grains = [];
    this.touchedAt = -9999;
    this.nextBlink = 0;
    this.blinkUntil = 0;
    this.lastSound = new Map();
    this.leaving = false;

    // Töne spielt die Wiese (dort lebt der AudioContext)
    const playground = this.scene.get('Playground');
    this.events.off('sound');
    this.events.on('sound', (e: unknown) => playground.events.emit('sound', e));

    this.add.image(0, 0, 'mk-bg').setOrigin(0);
    this.buildHead(data.def);
    this.buildRack();

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
    this.add.image(FACE.x, FACE.y, key).setOrigin(ox, oy).setScale(scale).setDepth(DEPTH.head);

    const R = FACE.radius;
    this.paint = this.add.renderTexture(FACE.x - R, FACE.y - R, R * 2, R * 2).setOrigin(0).setDepth(DEPTH.paint);
    const mask = this.make.graphics({ x: 0, y: 0 }, false);
    mask.fillStyle(0xffffff);
    mask.fillCircle(FACE.x, FACE.y, R);
    this.paint.setMask(mask.createGeometryMask());

    const face = (name: string) => {
      const k = `kid-${def.id}-face-${name}`;
      if (!this.textures.exists(k)) return undefined;
      return this.add.image(FACE.x, FACE.y, k).setOrigin(ox, oy).setScale(scale).setDepth(DEPTH.face).setVisible(false);
    };
    this.joy = face('joy');
    this.blink = face('blink');
  }

  /** Stifte im Becher, Puder, Glitzerdosen, Schwamm: jedes Stück wartet an seinem Platz. */
  private buildRack(): void {
    for (const item of RACK) this.makeToolView(item.tool, item.x, item.y, false).setDepth(DEPTH.rack);
    this.add.image(285, 910, 'mk-cup').setOrigin(0.5, 1).setDepth(DEPTH.cup);
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
    }
    return c;
  }

  // --- Eingabe ---------------------------------------------------------------------------

  private setupInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.leaving || this.held.has(p.id)) return;
      const M = MIRROR;
      if (Math.abs(p.x - M.x) < M.w / 2 && Math.abs(p.y - M.y) < M.h / 2) {
        this.finish();
        return;
      }
      const item = RACK.find((r) => this.hits(r, p.x, p.y));
      if (!item) return;
      const sprite = this.makeToolView(item.tool, p.x, p.y, true).setDepth(DEPTH.held);
      this.held.set(p.id, { tool: item.tool, sprite, nextGrain: 0 });
      this.play('click', 0);
      this.use(this.held.get(p.id)!, p.x, p.y);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const h = this.held.get(p.id);
      if (!h || !p.isDown) return;
      h.sprite.setPosition(p.x, p.y);
      this.use(h, p.x, p.y);
    });
    const up = (p: Phaser.Input.Pointer) => this.drop(p.id);
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
    this.joy?.setVisible(happy);
    if (now > this.nextBlink) {
      this.blinkUntil = now + 140;
      this.nextBlink = now + Phaser.Math.Between(2500, 5000);
    }
    this.blink?.setVisible(!happy && now < this.blinkUntil);
  }

  // --- Schminken -------------------------------------------------------------------------

  /** Das Werkzeug berührt (x, y): auf dem Gesicht wird gemalt, gepudert, gestreut oder gewischt. */
  private use(h: Held, x: number, y: number): void {
    const onFace = Phaser.Math.Distance.Between(x, y, FACE.x, FACE.y) <= FACE.radius + 12;
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
        // Dose über dem Gesicht: Körnchen fallen aufs Gesicht und rieseln daran vorbei
        this.falling.emitParticleAt(x + 4, y + 8, 1);
        if (!onFace || now < h.nextGrain) return;
        h.nextGrain = now + BRUSH.glitterEvery;
        const color = (h.tool as { color: (typeof GLITTER_COLORS)[number] }).color;
        for (let i = 0; i < BRUSH.glitterGrains; i++) {
          const a = Math.random() * Math.PI * 2;
          const d = Math.sqrt(Math.random()) * BRUSH.glitterSpread;
          const gx = x + Math.cos(a) * d;
          const gy = y + 30 + Math.sin(a) * d;
          if (Phaser.Math.Distance.Between(gx, gy, FACE.x, FACE.y) > FACE.radius) continue;
          const tint = color === 'rainbow' ? RAINBOW[Phaser.Math.Between(0, RAINBOW.length - 1)] : color;
          this.stamp('mk-grain', gx, gy, { tint, scale: Phaser.Math.FloatBetween(0.6, 1.2), rotation: Math.random() * Math.PI });
          if (this.grains.length < 500) this.grains.push({ x: gx, y: gy });
        }
        this.touch('glitter', 230);
        break;
      }
      case 'sponge':
        if (!onFace) return void (h.last = undefined);
        this.line(h, x, y, SPACING.sponge, (px, py) => {
          this.paint.stamp('mk-dot', undefined, px - (FACE.x - FACE.radius), py - (FACE.y - FACE.radius), { scale: (BRUSH.sponge * 2) / 64, erase: true });
          this.grains = this.grains.filter((g) => Phaser.Math.Distance.Between(g.x, g.y, px, py) > BRUSH.sponge);
        });
        this.touch('wipe', 150);
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
    if (this.grains.length === 0 || this.leaving) return;
    for (let i = 0; i < 2; i++) {
      const g = this.grains[Phaser.Math.Between(0, this.grains.length - 1)];
      const star = this.add.image(g.x, g.y, 'twinkle').setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.twinkle).setScale(0.1);
      this.tweens.add({ targets: star, scale: 0.7, alpha: { from: 1, to: 0 }, angle: 90, duration: 520, ease: 'Sine.easeOut', onComplete: () => star.destroy() });
    }
  }

  // --- Fertig ----------------------------------------------------------------------------

  /** Spiegel: Das Kind schaut hinein und freut sich, dann zurück auf die Wiese. */
  private finish(): void {
    this.leaving = true;
    for (const id of [...this.held.keys()]) this.drop(id);
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
