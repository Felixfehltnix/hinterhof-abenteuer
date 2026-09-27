import Phaser from 'phaser';
import { DEPTH_TRAY, DRAG_THRESHOLD, GAME_HEIGHT, GAME_WIDTH } from '../config';

// Leiste am unteren Bildrand mit großen Bildsymbolen (Spielzeugkiste, Gartentor).
// Waagerecht wischen = blättern, senkrecht nach oben ziehen = Symbol herausnehmen.

export interface TrayItem {
  id: string;
  texture: string;
}

/** Ein herausgezogenes Symbol, das gerade vom Finger bewegt wird. */
export interface PullSession {
  move(pointer: Phaser.Input.Pointer): void;
  release(pointer: Phaser.Input.Pointer): void;
}

export interface TrayOptions {
  items: TrayItem[];
  /** Symbol wurde herausgezogen. null = geht gerade nicht (z. B. Obergrenze erreicht). */
  pull(id: string, pointer: Phaser.Input.Pointer): PullSession | null;
  /** Ausgegraut und nicht herausziehbar. */
  isDisabled?(id: string): boolean;
}

const LEFT = 300;
const RIGHT = GAME_WIDTH - 20;
const HEIGHT = 200;
const SLOT = 175;
const ICON = 140;
const PADDING = 30;
// Steiler als ca. 35° nach oben = herausziehen (großzügig, Kinder ziehen oft schräg).
const PULL_SLOPE = 0.7;

type Gesture =
  | { kind: 'pending'; item?: string; startX: number; startY: number }
  | { kind: 'scroll'; startX: number; startScroll: number; lastX: number; lastT: number }
  | { kind: 'pull'; session: PullSession }
  | { kind: 'none' };

export class Tray {
  private readonly root: Phaser.GameObjects.Container;
  private readonly content: Phaser.GameObjects.Container;
  private readonly maskShape: Phaser.GameObjects.Graphics;
  private readonly zone: Phaser.GameObjects.Zone;
  private readonly icons = new Map<string, Phaser.GameObjects.Image>();
  private readonly gestures = new Map<number, Gesture>();
  private scroll = 0;
  private velocity = 0;
  private open = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly opts: TrayOptions,
  ) {
    this.root = scene.add.container(0, GAME_HEIGHT + HEIGHT + 40).setDepth(DEPTH_TRAY).setVisible(false);

    const bg = scene.add.graphics();
    bg.fillStyle(0x6d4c41, 0.95);
    bg.fillRoundedRect(LEFT, -HEIGHT, RIGHT - LEFT, HEIGHT + 40, 28);
    bg.fillStyle(0x8d6e63);
    bg.fillRoundedRect(LEFT + 10, -HEIGHT + 10, RIGHT - LEFT - 20, HEIGHT + 20, 22);
    this.root.add(bg);

    this.content = scene.add.container(LEFT + PADDING, -HEIGHT / 2);
    opts.items.forEach((item, i) => {
      const x = SLOT / 2 + i * SLOT;
      const slot = scene.add.graphics();
      slot.fillStyle(0xfff3e0, 0.9);
      slot.fillRoundedRect(x - ICON / 2 - 8, -ICON / 2 - 8, ICON + 16, ICON + 16, 20);
      const icon = scene.add.image(x, 0, item.texture);
      icon.setScale(Math.min(1, ICON / Math.max(icon.width, icon.height)));
      this.icons.set(item.id, icon);
      this.content.add([slot, icon]);
    });
    this.root.add(this.content);

    // Maske, damit weggescrollte Symbole nicht über den Rand hinausragen.
    this.maskShape = scene.make.graphics({ x: 0, y: this.root.y }, false);
    this.maskShape.fillStyle(0xffffff);
    this.maskShape.fillRect(LEFT + 10, -HEIGHT, RIGHT - LEFT - 20, HEIGHT);
    this.content.setMask(this.maskShape.createGeometryMask());

    // Eine Fläche fängt alle Finger auf der Leiste ab (auch zwischen den Symbolen).
    this.zone = scene.add
      .zone(LEFT, GAME_HEIGHT - HEIGHT, RIGHT - LEFT, HEIGHT)
      .setOrigin(0)
      .setDepth(DEPTH_TRAY)
      .setInteractive();
    this.zone.input!.enabled = false;
    this.zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.gestures.set(p.id, { kind: 'pending', item: this.itemAt(p.x), startX: p.x, startY: p.y });
      this.velocity = 0;
    });

    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onUp(p));
    scene.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.onUp(p));
    scene.events.on('update', (_t: number, delta: number) => this.update(delta));
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** Liegt (x, y) auf der offenen Leiste? */
  contains(x: number, y: number): boolean {
    return this.open && x >= LEFT && x <= RIGHT && y >= GAME_HEIGHT - HEIGHT;
  }

  show(): void {
    if (this.open) return;
    this.open = true;
    this.refresh();
    this.root.setVisible(true);
    this.zone.input!.enabled = true;
    this.slide(GAME_HEIGHT, 'Back.easeOut');
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    this.zone.input!.enabled = false;
    // Laufende Wischgesten abbrechen, herausgezogene Symbole behält der Finger.
    for (const [id, g] of this.gestures) if (g.kind !== 'pull') this.gestures.delete(id);
    this.slide(GAME_HEIGHT + HEIGHT + 40, 'Quad.easeIn', () => this.root.setVisible(false));
  }

  /** Ausgegraute Symbole neu bestimmen. */
  refresh(): void {
    for (const [id, icon] of this.icons) {
      const disabled = this.opts.isDisabled?.(id) ?? false;
      icon.setAlpha(disabled ? 0.35 : 1);
      if (disabled) icon.setTint(0x888888);
      else icon.clearTint();
    }
  }

  private slide(y: number, ease: string, onComplete?: () => void): void {
    this.scene.tweens.killTweensOf([this.root, this.maskShape]);
    this.scene.tweens.add({ targets: [this.root, this.maskShape], y, duration: 280, ease, onComplete });
  }

  private itemAt(x: number): string | undefined {
    const local = x - this.content.x;
    const i = Math.floor(local / SLOT);
    const item = this.opts.items[i];
    if (!item) return undefined;
    // Nur auf dem Symbol selbst (nicht im Zwischenraum) zählt es als Symbol.
    const center = SLOT / 2 + i * SLOT;
    return Math.abs(local - center) <= ICON / 2 + 12 ? item.id : undefined;
  }

  private minScroll(): number {
    const contentWidth = this.opts.items.length * SLOT + 2 * PADDING;
    return Math.min(0, RIGHT - LEFT - contentWidth);
  }

  private setScroll(value: number): void {
    this.scroll = Phaser.Math.Clamp(value, this.minScroll(), 0);
    this.content.x = LEFT + PADDING + this.scroll;
  }

  private onMove(p: Phaser.Input.Pointer): void {
    const g = this.gestures.get(p.id);
    if (!g) return;

    if (g.kind === 'pending') {
      const dx = p.x - g.startX;
      const dy = p.y - g.startY;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

      if (-dy > Math.abs(dx) * PULL_SLOPE) {
        // Nach oben (auch schräg): Symbol herausnehmen. Nur flaches Wischen blättert.
        const session =
          g.item && !(this.opts.isDisabled?.(g.item) ?? false) ? this.opts.pull(g.item, p) : null;
        if (session) {
          this.gestures.set(p.id, { kind: 'pull', session });
          session.move(p);
        } else {
          if (g.item) this.nudge(g.item);
          this.gestures.set(p.id, { kind: 'none' });
        }
        return;
      }
      this.gestures.set(p.id, { kind: 'scroll', startX: p.x, startScroll: this.scroll, lastX: p.x, lastT: p.moveTime });
      return;
    }

    if (g.kind === 'scroll') {
      this.setScroll(g.startScroll + (p.x - g.startX));
      const dt = (p.moveTime - g.lastT) / 1000;
      if (dt > 0) this.velocity = (p.x - g.lastX) / dt;
      g.lastX = p.x;
      g.lastT = p.moveTime;
      return;
    }

    if (g.kind === 'pull') g.session.move(p);
  }

  private onUp(p: Phaser.Input.Pointer): void {
    const g = this.gestures.get(p.id);
    if (!g) return;
    this.gestures.delete(p.id);
    if (g.kind === 'pull') g.session.release(p);
    else if (g.kind === 'scroll' && p.upTime - g.lastT > 80) this.velocity = 0;
    else if (g.kind === 'pending' && g.item) this.nudge(g.item);
  }

  private update(delta: number): void {
    const scrolling = [...this.gestures.values()].some((g) => g.kind === 'scroll');
    if (scrolling || Math.abs(this.velocity) < 5) return;
    const dt = delta / 1000;
    this.setScroll(this.scroll + this.velocity * dt);
    this.velocity *= Math.exp(-4 * dt);
    if (this.scroll === 0 || this.scroll === this.minScroll()) this.velocity = 0;
  }

  /** Kleiner Hüpfer eines Symbols (Rückmeldung beim Antippen oder wenn es nicht geht). */
  nudge(id: string): void {
    const icon = this.icons.get(id);
    if (!icon || this.scene.tweens.isTweening(icon)) return;
    this.scene.tweens.add({ targets: icon, y: -16, duration: 110, yoyo: true, ease: 'Quad.easeOut' });
  }
}
