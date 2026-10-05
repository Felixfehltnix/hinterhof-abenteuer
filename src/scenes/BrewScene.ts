import Phaser from 'phaser';
import { BREW, INGREDIENTS, FAIRY_DEFS, mixColor, pickFairy, type FairyId, type IngredientId } from '../data/brew';
import { SNACK } from '../data/snacks';
import { sparkBurst } from '../objects/sparks';

/** Was die Wiese dem Brau-Spiel mitgibt. */
export interface BrewData {
  /** Fertig: mit der Fee, die entstanden ist (oder ohne, wenn man nur zurückgeht). */
  onDone(fairy?: FairyId): void;
}

const DEPTH = { pot: 100, liquid: 110, rim: 120, items: 200, drag: 900, ui: 950 };

/** Eine Zutat im Korb oder in der Hand. */
interface Item {
  id: IngredientId;
  img: Phaser.GameObjects.Image;
  home: { x: number; y: number };
}

/**
 * Zaubertrank: Zutaten aus dem Korb in den Eimer ziehen, jede ändert Farbe und Blasen. Mit dem Finger
 * Kreise um den Eimer ziehen = umrühren. Nach genug Umdrehungen steigt eine Fee aus dem Trank
 * (welche, bestimmt `pickFairy`). Kein Verlieren, kein Text. Das Holzschild führt zurück.
 */
export class BrewScene extends Phaser.Scene {
  private params!: BrewData;
  private added: IngredientId[] = [];
  private liquid!: Phaser.GameObjects.Graphics;
  private spoon!: Phaser.GameObjects.Image;
  private drags = new Map<number, Item>();
  private stirPointer?: number;
  private stirAngle = 0;
  private turns = 0;
  /** Rührtempo (Umdrehungen/s), klingt ab – bestimmt Wirbel und Blasen. */
  private swirl = 0;
  private phase = 0;
  private color = BREW.water;
  private shownColor = BREW.water;
  private bubbleAt = 0;
  private done = false;
  private leaving = false;
  private lastSound = new Map<string, number>();

  constructor() {
    super('Brew');
  }

  create(data: BrewData): void {
    this.params = data;
    this.added = [];
    this.drags = new Map();
    this.stirPointer = undefined;
    this.turns = 0;
    this.swirl = 0;
    this.phase = 0;
    this.color = BREW.water;
    this.shownColor = BREW.water;
    this.bubbleAt = 0;
    this.done = false;
    this.leaving = false;
    this.lastSound = new Map();

    // Töne spielt die Wiese (dort lebt der AudioContext)
    const playground = this.scene.get('Playground');
    this.events.off('sound');
    this.events.on('sound', (e: unknown) => playground.events.emit('sound', e));

    this.add.image(0, 0, 'brew-bg').setOrigin(0);
    const { x, y, ry } = BREW.pot;
    this.add.image(x, y - ry - 10, 'brew-pot').setOrigin(0.5, 0).setDepth(DEPTH.pot);
    this.liquid = this.add.graphics().setDepth(DEPTH.liquid);
    this.add.image(x, y - ry - 10, 'brew-rim').setOrigin(0.5, 0).setDepth(DEPTH.rim);
    this.spoon = this.add.image(x, y, 'brew-spoon').setOrigin(0.5, 1).setDepth(DEPTH.rim + 1).setAngle(8);

    // Korb mit allen Zutaten (2 Reihen)
    const b = BREW.basket;
    this.add.image(b.x, b.y, 'brew-basket').setDepth(DEPTH.items - 1);
    INGREDIENTS.forEach((id, i) => {
      const col = i % b.cols;
      const row = Math.floor(i / b.cols);
      const home = { x: b.x + (col - (b.cols - 1) / 2) * b.dx, y: b.y - b.dy / 2 + row * b.dy };
      this.spawnItem(id, home).img.setAngle(((i * 37) % 24) - 12);
    });

    // Ausgang: Holzschild
    const E = SNACK.exit;
    this.add.image(BREW.exit.x, BREW.exit.y, 'snack-sign').setOrigin(0).setDepth(DEPTH.ui);
    this.add.zone(BREW.exit.x - 20, BREW.exit.y - 20, E.w + 60, E.h + 60).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.leave());

    // Rühren: Finger irgendwo um den Eimer (nicht auf einer Zutat)
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.done || this.stirPointer !== undefined || over.length > 0 || !this.nearPot(p.x, p.y)) return;
      this.stirPointer = p.id;
      this.stirAngle = this.potAngle(p.x, p.y);
      this.moveSpoon(p.x, p.y);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.move(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.release(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.release(p));

    this.cameras.main.fadeIn(350, 0, 0, 0);
  }

  // --- Zutaten ---------------------------------------------------------------------

  private spawnItem(id: IngredientId, home: { x: number; y: number }): Item {
    const img = this.add.image(home.x, home.y, `brew-${id}`).setDepth(DEPTH.items);
    const item: Item = { id, img, home };
    img.setInteractive({ useHandCursor: true });
    img.on('pointerdown', (p: Phaser.Input.Pointer) => this.take(p, item));
    return item;
  }

  private take(p: Phaser.Input.Pointer, item: Item): void {
    if (this.done || this.drags.has(p.id)) return;
    // Der Korb behält seine Zutat (beliebig oft nehmen): gezogen wird eine Kopie
    const copy: Item = { id: item.id, img: this.add.image(p.x, p.y, `brew-${item.id}`), home: item.home };
    copy.img.setDepth(DEPTH.drag).setScale(1.25).setAngle(item.img.angle);
    this.drags.set(p.id, copy);
    this.play('brew-take', 0);
  }

  private nearPot(x: number, y: number): boolean {
    const { x: px, y: py, rx, ry } = BREW.pot;
    return ((x - px) / (rx * 1.15)) ** 2 + ((y - py) / (ry * 3)) ** 2 <= 1;
  }

  private overOpening(x: number, y: number): boolean {
    const { x: px, y: py, rx, ry } = BREW.pot;
    return ((x - px) / (rx * 1.05)) ** 2 + ((y - py) / (ry * 2.4)) ** 2 <= 1;
  }

  private move(p: Phaser.Input.Pointer): void {
    const item = this.drags.get(p.id);
    if (item) item.img.setPosition(p.x, p.y);
    if (p.id === this.stirPointer) this.stir(p.x, p.y);
  }

  private release(p: Phaser.Input.Pointer): void {
    if (p.id === this.stirPointer) {
      this.stirPointer = undefined;
      this.tweens.add({ targets: this.spoon, angle: 8, duration: 200 });
    }
    const item = this.drags.get(p.id);
    if (!item) return;
    this.drags.delete(p.id);
    if (this.done || !this.overOpening(p.x, p.y) || this.added.length >= BREW.maxAdded) {
      // Daneben: zurück in den Korb
      this.tweens.add({ targets: item.img, x: item.home.x, y: item.home.y, scale: 1, duration: 240, ease: 'Quad.easeIn', onComplete: () => item.img.destroy() });
      return;
    }
    this.drop(item);
  }

  /** Zutat fällt in den Trank: Farbe ändert sich, Spritzer und Blasen. */
  private drop(item: Item): void {
    const { x, y } = BREW.pot;
    this.added.push(item.id);
    this.color = mixColor(this.added);
    this.tweens.add({
      targets: item.img,
      x: x + Phaser.Math.Between(-60, 60),
      y: y + Phaser.Math.Between(-10, 20),
      scale: 0.3,
      alpha: 0,
      duration: 260,
      ease: 'Quad.easeIn',
      onComplete: () => {
        item.img.destroy();
        sparkBurst(this, item.img.x, item.img.y, this.color, 9, DEPTH.rim + 2);
        this.events.emit('sound', { kind: 'brew-add' });
      },
    });
    this.swirl = Math.max(this.swirl, 0.6);
  }

  // --- Rühren ----------------------------------------------------------------------

  /** Winkel um die Mitte des Topfs (Ellipse auf einen Kreis gerechnet). */
  private potAngle(x: number, y: number): number {
    const { x: px, y: py, rx, ry } = BREW.pot;
    return Math.atan2((y - py) / (ry * 2), (x - px) / rx);
  }

  private stir(x: number, y: number): void {
    this.moveSpoon(x, y);
    const a = this.potAngle(x, y);
    const d = Phaser.Math.Angle.Wrap(a - this.stirAngle);
    this.stirAngle = a;
    const { x: px, y: py, rx, ry } = BREW.pot;
    const radius = Math.hypot((x - px) / rx, (y - py) / (ry * 2));
    if (radius < 0.2) return; // direkt in der Mitte zählt nicht
    const turns = Math.abs(d) / (Math.PI * 2);
    this.swirl = Math.min(3, this.swirl + turns * 5);
    this.turns += turns;
    this.play('brew-stir', 260);
    if (this.turns >= BREW.turns && this.added.length > 0 && !this.done) this.finish();
  }

  private moveSpoon(x: number, y: number): void {
    const { x: px, y: py, rx, ry } = BREW.pot;
    // Die Kelle bleibt im Trank
    let nx = (x - px) / (rx * 0.85);
    let ny = (y - py) / (ry * 0.85);
    const len = Math.hypot(nx, ny);
    if (len > 1) {
      nx /= len;
      ny /= len;
    }
    this.spoon.setPosition(px + nx * rx * 0.85, py + ny * ry * 0.85).setAngle(Phaser.Math.Clamp(nx * 14, -14, 14));
  }

  // --- Fee -------------------------------------------------------------------------

  private finish(): void {
    this.done = true;
    this.stirPointer = undefined;
    const fairy = pickFairy(this.added);
    const def = FAIRY_DEFS[fairy];
    const { x, y } = BREW.pot;
    this.events.emit('sound', { kind: 'brew-fairy' });
    this.cameras.main.flash(260, 255, 255, 255);
    sparkBurst(this, x, y, def.spark, 28, DEPTH.ui, 2.2);
    this.drags.forEach((i) => i.img.destroy());
    this.drags.clear();

    const img = this.add.image(x, y, `fairy-${fairy}`).setOrigin(0.5, 1).setScale(0.2).setAlpha(0).setDepth(DEPTH.ui);
    this.tweens.add({ targets: img, y: y - 80, scale: 1.3, alpha: 1, duration: 1100, ease: 'Back.easeOut' });
    // Schweben und Funken streuen
    this.tweens.add({ targets: img, y: '-=18', duration: 700, yoyo: true, repeat: -1, delay: 1100, ease: 'Sine.easeInOut' });
    this.time.addEvent({
      delay: 160,
      repeat: 14,
      callback: () => sparkBurst(this, x + Phaser.Math.Between(-130, 130), y - 180 + Phaser.Math.Between(-110, 80), def.spark, 3, DEPTH.ui),
    });
    this.time.delayedCall(2600, () => this.leave(fairy));
  }

  // --- Jedes Bild ------------------------------------------------------------------

  update(_t: number, dtMs: number): void {
    const dt = dtMs / 1000;
    this.swirl = Math.max(0, this.swirl - dt * 1.1);
    this.phase += this.swirl * dt * 5;
    // Farbe gleitet zum neuen Wert
    this.shownColor = lerpColor(this.shownColor, this.color, Math.min(1, dt * 4));
    this.drawLiquid();
    if (this.swirl > 0.3 && this.time.now > this.bubbleAt) {
      this.bubbleAt = this.time.now + 200 - this.swirl * 40;
      const { x, y, rx, ry } = BREW.pot;
      const a = Math.random() * Math.PI * 2;
      sparkBurst(this, x + Math.cos(a) * rx * 0.6, y + Math.sin(a) * ry * 0.6, lighten(this.shownColor), 1, DEPTH.rim + 2, 0.5);
    }
  }

  private drawLiquid(): void {
    const { x, y, rx, ry } = BREW.pot;
    const g = this.liquid.clear();
    const glow = Math.min(1, this.turns / BREW.turns);
    g.fillStyle(this.shownColor);
    g.fillEllipse(x, y, rx * 2 - 24, ry * 2 - 14);
    // Wirbelstreifen drehen sich mit dem Rühren
    g.lineStyle(10, lighten(this.shownColor), 0.55);
    for (let k = 0; k < 3; k++) {
      const a0 = this.phase + (k * Math.PI * 2) / 3;
      g.beginPath();
      for (let i = 0; i <= 12; i++) {
        const a = a0 + i * 0.09;
        const r = 0.35 + (k + 1) * 0.15 + i * 0.01;
        g.lineTo(x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r);
      }
      g.strokePath();
    }
    if (this.added.length > 0 && glow > 0) {
      g.fillStyle(0xffffff, 0.25 * glow);
      g.fillEllipse(x, y, (rx * 2 - 24) * 0.7, (ry * 2 - 14) * 0.7);
    }
  }

  private play(kind: string, every: number): void {
    const now = this.time.now;
    if (now - (this.lastSound.get(kind) ?? -9999) < every) return;
    this.lastSound.set(kind, now);
    this.events.emit('sound', { kind });
  }

  private leave(fairy?: FairyId): void {
    if (this.leaving) return;
    this.leaving = true;
    // force: ein noch laufendes Einblenden darf das Ausblenden nicht verschlucken
    this.cameras.main.fade(350, 0, 0, 0, true);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.params.onDone(fairy));
  }

}

function lerpColor(a: number, b: number, t: number): number {
  const ch = (c: number, s: number) => (c >> s) & 255;
  const m = (s: number) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t);
  return (m(16) << 16) | (m(8) << 8) | m(0);
}

function lighten(c: number): number {
  return lerpColor(c, 0xffffff, 0.45);
}
