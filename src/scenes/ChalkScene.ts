import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { CHALK, CHALK_COLORS, type ChalkColor } from '../data/chalk';
import { loadChalk, saveChalk } from '../save/chalk';
import { BUCKET_SIZE, CHALK_DOT_SIZE, CHALK_LAYOUT, CHALK_STICK_SIZE, ERASER_SIZE, SPONGE_SIZE } from './placeholders/chalk';

/** Was die Wiese dem Malspiel mitgibt. */
export interface ChalkData {
  /** Holzschild angetippt: zurück auf die Wiese. */
  onDone(): void;
}

/** Texture-Key des Kreidebilds (bleibt zwischen zwei Besuchen geladen). */
const CHALK_ART = 'chalk-art';

/** Ein Finger auf dem Boden: malt mit der gewählten Kreide (das Stück folgt der Fingerspitze). */
interface Stroke {
  kind: 'draw';
  last: { x: number; y: number };
  /** Rest vom letzten Tupfer-Abstand. */
  carry: number;
  color: ChalkColor;
  hue: number;
  stick: Phaser.GameObjects.Image;
}

interface SpongeGrab {
  kind: 'sponge';
  offset: { x: number; y: number };
}

interface ExitTouch {
  kind: 'exit';
}

type Touch = Stroke | SpongeGrab | ExitTouch;

const DEPTH = { art: 10, tray: 200, sticks: 190, bucket: 210, sponge: 220, held: 500, exit: 600 };
// So weit hebt sich die gewählte Kreide aus der Schachtel.
const LIFT = 46;
const CHALK_SOUND_EVERY = 260;
const WIPE_SOUND_EVERY = 300;
// Gemalt gilt erst ab so vielen Tupfern (sonst bleibt die Terrasse leer).
const MIN_DOTS = 3;

/**
 * Kreide-Malspiel (Straßenmalkreide): Steinplatten von oben. Unten steht die Kreideschachtel –
 * Stück antippen = diese Farbe (die Regenbogenkreide wechselt beim Malen die Farbe). Mit dem Finger
 * (auch mehreren) auf die Platten malen. Schwamm aus dem Eimer ziehen = wegwischen. Kein Gewinnen,
 * kein Verlieren; das Holzschild oben links führt zurück, das Bild liegt dann auf der Terrasse.
 */
export class ChalkScene extends Phaser.Scene {
  private params!: ChalkData;
  private art!: Phaser.GameObjects.RenderTexture;
  private sticks: Phaser.GameObjects.Image[] = [];
  private selected = 0;
  private sponge!: Phaser.GameObjects.Image;
  private touches = new Map<number, Touch>();
  private dots = 0;
  private leaving = false;
  private nextChalkSound = 0;
  private nextWipeSound = 0;
  private rainbowHue = 0;

  constructor() {
    super('Chalk');
  }

  create(data: ChalkData): void {
    this.params = data;
    this.touches = new Map();
    this.sticks = [];
    this.selected = 0;
    this.dots = 0;
    this.leaving = false;

    // Töne spielt die Wiese (dort lebt der AudioContext)
    const playground = this.scene.get('Playground');
    this.events.on('sound', (e: unknown) => playground.events.emit('sound', e));

    this.add.image(0, 0, 'chalk-ground').setOrigin(0);
    this.art = this.add.renderTexture(0, 0, GAME_WIDTH, GAME_HEIGHT).setOrigin(0).setDepth(DEPTH.art);
    // Was schon auf der Terrasse ist, malt man weiter (beim ersten Besuch aus dem Speicher)
    const saved = this.textures.exists(CHALK_ART) ? null : loadChalk();
    if (saved) {
      this.textures.once(`${Phaser.Textures.Events.ADD_KEY}${CHALK_ART}`, () => this.showSaved());
      this.textures.addBase64(CHALK_ART, saved);
    } else {
      this.showSaved();
    }

    this.buildTray();
    this.buildBucket();

    const E = CHALK_LAYOUT.exit;
    this.add.image(E.x, E.y, 'chalk-sign').setOrigin(0).setDepth(DEPTH.exit);
    this.add
      .zone(E.x - 20, E.y - 20, E.w + 40, E.h + 50)
      .setOrigin(0)
      .setDepth(DEPTH.exit)
      .setInteractive({ useHandCursor: true })
      .setData('grab', 'exit');

    this.setupInput();
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  private showSaved(): void {
    if (!this.textures.exists(CHALK_ART) || !this.art?.active) return;
    // Unter das schon Gemalte legen (falls ein Kind schneller war als das Laden)
    const now = this.add.renderTexture(0, 0, GAME_WIDTH, GAME_HEIGHT).setVisible(false);
    now.draw(this.art, 0, 0);
    this.art.clear().draw(CHALK_ART, 0, 0).draw(now, 0, 0);
    now.destroy();
    this.dots += MIN_DOTS;
  }

  // --- Aufbau ----------------------------------------------------------------

  private buildTray(): void {
    const T = CHALK_LAYOUT.tray;
    this.add.image(T.x, T.y, 'chalk-tray').setOrigin(0).setDepth(DEPTH.tray);
    CHALK_COLORS.forEach((_, i) => {
      const x = T.x + 46 + i * CHALK_LAYOUT.stickGap;
      const stick = this.add
        .image(x, T.y + 40, `chalk-stick-${i}`)
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.sticks)
        .setAngle(((i * 7) % 5) - 2);
      // Große Touch-Fläche: das ganze Stück samt Platz darüber und der Schachtel davor
      stick.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(-24, -40, CHALK_STICK_SIZE.width + 48, CHALK_STICK_SIZE.height + 110),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      });
      stick.setData('grab', 'stick').setData('index', i);
      this.sticks.push(stick);
    });
    this.select(0, false);
  }

  private buildBucket(): void {
    const B = CHALK_LAYOUT.bucket;
    this.add.image(B.x, B.y, 'chalk-bucket').setOrigin(0.5, 1).setDepth(DEPTH.bucket);
    this.sponge = this.add
      .image(B.x, this.spongeHome().y, 'chalk-sponge')
      .setDepth(DEPTH.sponge)
      .setAngle(-8);
    this.sponge.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-30, -30, SPONGE_SIZE.width + 60, SPONGE_SIZE.height + 60),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    this.sponge.setData('grab', 'sponge');
  }

  private spongeHome(): { x: number; y: number } {
    const B = CHALK_LAYOUT.bucket;
    return { x: B.x, y: B.y - BUCKET_SIZE.height + 20 };
  }

  /** Wählt eine Kreide: sie hebt sich aus der Schachtel. */
  private select(i: number, sound = true): void {
    const T = CHALK_LAYOUT.tray;
    this.sticks.forEach((s, k) => {
      this.tweens.killTweensOf(s);
      this.tweens.add({ targets: s, y: T.y + 40 - (k === i ? LIFT : 0), scale: k === i ? 1.12 : 1, duration: 160, ease: 'Back.easeOut' });
    });
    this.selected = i;
    if (sound) this.events.emit('sound', { kind: 'chalk-pick' });
  }

  // --- Eingabe -----------------------------------------------------------------

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.leaving) return;
      const target = over[0];
      const grab = target?.getData('grab');
      if (grab === 'stick') {
        this.select(target.getData('index') as number);
        return;
      }
      if (grab === 'exit') {
        this.touches.set(pointer.id, { kind: 'exit' });
        return;
      }
      if (grab === 'sponge') {
        this.tweens.killTweensOf(this.sponge);
        this.sponge.setDepth(DEPTH.held).setAngle(0).setScale(1.08);
        this.touches.set(pointer.id, { kind: 'sponge', offset: { x: this.sponge.x - pointer.x, y: this.sponge.y - pointer.y } });
        return;
      }
      this.startStroke(pointer);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const t = this.touches.get(pointer.id);
      if (!t || !pointer.isDown) return;
      if (t.kind === 'draw') this.continueStroke(t, pointer);
      else if (t.kind === 'sponge') {
        this.sponge.setPosition(pointer.x + t.offset.x, pointer.y + t.offset.y);
        this.wipe();
      }
    });

    const up = (pointer: Phaser.Input.Pointer) => {
      const t = this.touches.get(pointer.id);
      if (!t) return;
      this.touches.delete(pointer.id);
      if (t.kind === 'draw') {
        // Das Kreidestück fliegt zurück in die Schachtel
        this.tweens.add({ targets: t.stick, alpha: 0, scale: 0.6, duration: 180, onComplete: () => t.stick.destroy() });
      } else if (t.kind === 'sponge') {
        const home = this.spongeHome();
        this.tweens.add({
          targets: this.sponge,
          x: home.x,
          y: home.y,
          angle: -8,
          scale: 1,
          duration: 300,
          ease: 'Sine.easeOut',
          onComplete: () => this.sponge.setDepth(DEPTH.sponge),
        });
      } else if (t.kind === 'exit' && pointer.getDistance() < 30) {
        this.leave();
      }
    };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);
  }

  // --- Malen -------------------------------------------------------------------

  private startStroke(pointer: Phaser.Input.Pointer): void {
    const color = CHALK_COLORS[this.selected];
    const stick = this.add
      .image(pointer.x, pointer.y, `chalk-stick-${this.selected}`)
      .setOrigin(0.5, 0.04)
      .setAngle(-150)
      .setDepth(DEPTH.held);
    const stroke: Stroke = { kind: 'draw', last: { x: pointer.x, y: pointer.y }, carry: 0, color, hue: this.rainbowHue, stick };
    this.touches.set(pointer.id, stroke);
    this.dab(stroke, pointer.x, pointer.y);
  }

  private continueStroke(s: Stroke, pointer: Phaser.Input.Pointer): void {
    const { x, y } = pointer;
    s.stick.setPosition(x, y);
    const dx = x - s.last.x;
    const dy = y - s.last.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;
    // Tupfer in gleichem Abstand entlang des Weges
    let d = CHALK.spacing - s.carry;
    while (d <= dist) {
      this.dab(s, s.last.x + (dx * d) / dist, s.last.y + (dy * d) / dist);
      if (s.color === 'rainbow') s.hue = (s.hue + CHALK.spacing * CHALK.rainbowPerPx) % 1;
      d += CHALK.spacing;
    }
    s.carry = dist - (d - CHALK.spacing);
    s.last = { x, y };
    if (s.color === 'rainbow') this.rainbowHue = s.hue;
    const now = this.time.now;
    if (now >= this.nextChalkSound) {
      this.nextChalkSound = now + CHALK_SOUND_EVERY;
      this.events.emit('sound', { kind: 'chalk' });
    }
  }

  /** Ein Kreidetupfer (leicht gedreht und körnig, damit es nach Kreide aussieht). */
  private dab(s: Stroke, x: number, y: number): void {
    const tint = s.color === 'rainbow' ? Phaser.Display.Color.HSVToRGB(s.hue, 0.6, 1).color : s.color;
    this.art.stamp('chalk-dot', undefined, x, y, {
      tint,
      alpha: 0.75,
      angle: Phaser.Math.Between(0, 359),
      scale: CHALK.brush / CHALK_DOT_SIZE,
    });
    this.dots++;
  }

  /** Schwamm wischt weg, was unter ihm ist. */
  private wipe(): void {
    const scale = (CHALK.sponge * 2) / ERASER_SIZE;
    this.art.erase(this.eraser(scale), this.sponge.x, this.sponge.y);
    const now = this.time.now;
    if (now >= this.nextWipeSound) {
      this.nextWipeSound = now + WIPE_SOUND_EVERY;
      this.events.emit('sound', { kind: 'wipe' });
    }
  }

  private eraserImage?: Phaser.GameObjects.Image;

  private eraser(scale: number): Phaser.GameObjects.Image {
    this.eraserImage ??= this.make.image({ key: 'chalk-eraser', add: false }).setOrigin(0.5);
    return this.eraserImage.setScale(scale);
  }

  // --- Zurück ------------------------------------------------------------------

  /** Holzschild angetippt: Bild speichern (es bleibt beim nächsten Besuch), dann zurück auf die Wiese. */
  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    const finish = (image: HTMLImageElement | null) => {
      if (this.textures.exists(CHALK_ART)) this.textures.remove(CHALK_ART);
      if (image) this.textures.addImage(CHALK_ART, image);
      saveChalk(image?.src ?? null);
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.params.onDone());
    };
    if (this.dots < MIN_DOTS) {
      finish(null);
      return;
    }
    this.art.snapshot(
      (snap) => finish(snap instanceof HTMLImageElement ? snap : null),
      'image/webp',
      CHALK.quality,
    );
  }
}
