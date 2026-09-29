import Phaser from 'phaser';
import type { CharacterDef } from '../data/characters';
import type { Outfit } from '../data/costumes';
import {
  FOODS,
  quality,
  randomOrder,
  signature,
  stageOf,
  type FoodId,
  type OrderItem,
  type Sauce,
} from '../data/grill';
import { Kid } from '../objects/Kid';
import { foodSize, GRILL } from './placeholders/grill';

/** Was die Wiese dem Grill-Spiel mitgibt. */
export interface GrillData {
  kids: { def: CharacterDef; outfit: Outfit }[];
  /** Holzschild angetippt: zurück auf die Wiese. */
  onDone(): void;
}

/** Ein Stück Grillgut: Garstufe je Seite (Vielfache der Garzeit), welche Seite oben liegt. */
interface Food {
  id: FoodId;
  sides: [number, number];
  up: 0 | 1;
  /** Brötchen aufgeschnitten. */
  cut: boolean;
}

/** Grillgut auf dem Rost (oder in der Hand). */
interface Piece {
  food: Food;
  view: Phaser.GameObjects.Container;
  img: Phaser.GameObjects.Image;
  smoke: Phaser.GameObjects.Particles.ParticleEmitter;
  stage: number;
}

/** Ein Gericht auf dem Teller: Brötchen und/oder Füllung (bzw. Baguette), Soßen. */
interface Dish {
  slot: number;
  bun?: Food;
  filling?: Food;
  sauces: Sauce[];
  view: Phaser.GameObjects.Container;
}

interface QueueKid {
  kid: Kid;
  def: CharacterDef;
}

/** Was gerade mit einem Finger gezogen wird. */
type Grab =
  | { kind: 'piece'; piece: Piece; fromGrill: boolean }
  | { kind: 'dish'; dish: Dish }
  | { kind: 'plate' }
  | { kind: 'bottle'; sauce: Sauce; img: Phaser.GameObjects.Image };

interface Touch {
  pointer: Phaser.Input.Pointer;
  target: Phaser.GameObjects.GameObject;
  dragging?: Grab;
  offset: { x: number; y: number };
}

const DRAG_THRESHOLD = 12;
const DEPTH = { kids: 100, grill: 300, embers: 305, pieces: 400, plate: 500, dishes: 510, bottles: 520, drag: 900, card: 950 };
const SAUCE_COLOR: Record<Sauce, number> = { ketchup: 0xd62828, mustard: 0xf2c230 };
const SIZZLE_EVERY = 1400;

/**
 * Grill-Spiel hinter Felix' grünem Gartentor (#66). Rechts liegt der Vorrat, in der Mitte der
 * Rost (Antippen = wenden, jede Seite gart für sich), links wird auf dem Teller angerichtet
 * (Brötchen antippen = aufschneiden, Würstchen/Käse ins Brötchen ziehen, Flasche aufs Gericht
 * ziehen = Soße). Hinter dem Grill bestellen die Kinder nacheinander (Karte oben, ohne Text);
 * Teller zum Kind ziehen = servieren. Kein Gewinnen, kein Verlieren; das Holzschild am Baum führt zurück.
 */
export class GrillScene extends Phaser.Scene {
  private params!: GrillData;
  private pieces: Piece[] = [];
  private dishes: Dish[] = [];
  private plate!: Phaser.GameObjects.Image;
  private queue: QueueKid[] = [];
  private order?: { items: OrderItem[]; card: Phaser.GameObjects.Container };
  private recentOrders: string[] = [];
  private touches = new Map<number, Touch>();
  private busy = false;
  private leaving = false;
  private nextSizzle = 0;

  constructor() {
    super('Grill');
  }

  create(data: GrillData): void {
    this.params = data;
    this.pieces = [];
    this.dishes = [];
    this.queue = [];
    this.order = undefined;
    this.recentOrders = [];
    this.touches = new Map();
    this.busy = false;
    this.leaving = false;

    // Töne spielt die Wiese (dort lebt der AudioContext)
    const playground = this.scene.get('Playground');
    this.events.on('sound', (e: unknown) => playground.events.emit('sound', e));

    this.add.image(0, 0, 'grill-bg').setOrigin(0);
    this.add.image(0, 0, 'grill-front').setOrigin(0).setDepth(DEPTH.grill);
    this.addEmbers();

    // Ausgang: das Holzschild am Baum links (großzügige Touch-Fläche)
    const E = GRILL.exit;
    this.add.zone(E.x - 20, E.y - 30, E.w + 40, E.h + 60).setOrigin(0).setInteractive({ useHandCursor: true }).setData('grab', 'exit');

    // Vorrat: aus jeder Schale beliebig viel herausziehen
    for (const id of Object.keys(GRILL.sources) as FoodId[]) {
      const p = GRILL.sources[id];
      for (let i = 0; i < 3; i++) {
        this.add.image(p.x - 50 + i * 50, p.y + (i % 2) * 8 - 6, this.foodKey({ id, sides: [0, 0], up: 0, cut: false })).setScale(0.62).setDepth(DEPTH.grill + 1).setAngle(-8 + i * 8);
      }
      this.add.zone(p.x, p.y + 10, 240, 120).setInteractive({ useHandCursor: true }).setData('grab', `source:${id}`).setDepth(DEPTH.grill + 2);
    }

    // Teller und Soßenflaschen
    const P = GRILL.plate;
    this.plate = this.add.image(P.x, P.y, 'grill-plate').setDepth(DEPTH.plate);
    this.plate.setInteractive(new Phaser.Geom.Ellipse(P.w / 2, P.h / 2, P.w, P.h), Phaser.Geom.Ellipse.Contains).setData('grab', 'plate');
    for (const sauce of ['ketchup', 'mustard'] as Sauce[]) {
      const b = GRILL.bottles[sauce];
      const img = this.add.image(b.x, b.y, `grill-bottle-${sauce}`).setOrigin(0.5, 1).setDepth(DEPTH.bottles);
      img.setInteractive({ useHandCursor: true }).setData('grab', `bottle:${sauce}`);
    }

    // Die Kinder stellen sich an (das erste kommt nach vorn und bestellt)
    data.kids.forEach(({ def, outfit }, i) => {
      const slot = GRILL.queue[Math.min(i, GRILL.queue.length - 1)];
      const kid = new Kid(this, def, 2100 + i * 160, slot.y).setScale(slot.scale).setDepth(DEPTH.kids + i);
      kid.setOutfit(outfit);
      kid.setData('grab', 'kid');
      this.input.setDraggable(kid, false);
      kid.setData('onTap', () => kid.giggle());
      this.queue.push({ kid, def });
    });
    this.lineUp(true);

    this.setupInput();
    this.cameras.main.fadeIn(350, 0, 0, 0);
  }

  update(_time: number, delta: number): void {
    this.cook(delta / 1000);
  }

  // --- Kohle und Grillgut ------------------------------------------------------------

  /** Glühende Kohle unter dem Rost: flackernder warmer Schein. */
  private addEmbers(): void {
    const R = GRILL.grate;
    for (let i = 0; i < 6; i++) {
      const x = R.left + ((i + 0.5) * (R.right - R.left)) / 6;
      const glow = this.add.image(x, (R.top + R.bottom) / 2, 'glow-soft').setScale(2.4, 3).setTint(0xff7a2a).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.embers);
      this.tweens.add({ targets: glow, alpha: { from: 0.2, to: 0.45 }, duration: 500 + i * 130, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  private foodKey(food: Food): string {
    const stage = stageOf(food.sides[food.up]);
    return food.id === 'bun' && food.cut ? `food-buncut-${stage}` : `food-${food.id}-${stage}`;
  }

  private newPiece(food: Food, x: number, y: number): Piece {
    const img = this.add.image(0, 0, this.foodKey(food));
    const { width, height } = foodSize(food.id);
    const view = this.add.container(x, y, [img]).setDepth(DEPTH.pieces);
    const w = Math.max(width, 120);
    const h = Math.max(height, 96);
    view.setSize(w, h).setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
    const smoke = this.add.particles(0, 0, 'smoke', {
      speedY: { min: -70, max: -40 },
      speedX: { min: -12, max: 12 },
      scale: { start: 0.5, end: 1.6 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 1600,
      frequency: 300,
      emitting: false,
    });
    smoke.setDepth(DEPTH.pieces + 50);
    const piece: Piece = { food, view, img, smoke, stage: stageOf(food.sides[food.up]) };
    view.setData('grab', piece);
    return piece;
  }

  private removePiece(piece: Piece): void {
    this.pieces = this.pieces.filter((p) => p !== piece);
    piece.smoke.stop();
    this.time.delayedCall(1800, () => piece.smoke.destroy());
    piece.view.destroy();
  }

  /** Auf dem Rost gart die untere Seite; ab kräftig gebräunt qualmt es, verkohlt stark. */
  private cook(dt: number): void {
    const R = GRILL.grate;
    for (const piece of this.pieces) {
      const f = piece.food;
      const onGrill = piece.view.x > R.left - 20 && piece.view.x < R.right + 20 && piece.view.y > R.top - 20 && piece.view.y < R.bottom + 20;
      if (!onGrill) continue;
      f.sides[1 - f.up] += dt / FOODS[f.id].cook;
      const stage = stageOf(f.sides[f.up]);
      if (stage !== piece.stage) {
        piece.stage = stage;
        piece.img.setTexture(this.foodKey(f));
      }
      const worst = stageOf(Math.max(...f.sides));
      piece.smoke.setPosition(piece.view.x, piece.view.y - 10);
      if (worst >= 3) {
        piece.smoke.frequency = worst >= 4 ? 120 : 380;
        piece.smoke.setParticleTint(worst >= 4 ? 0x333333 : 0xdddddd);
        if (!piece.smoke.emitting) piece.smoke.start();
      } else if (piece.smoke.emitting) piece.smoke.stop();
    }
    if (this.pieces.length && this.time.now > this.nextSizzle) {
      this.nextSizzle = this.time.now + SIZZLE_EVERY;
      this.events.emit('sound', { kind: 'sizzle' });
    }
  }

  /** Wenden: kurz anheben, umdrehen (andere Seite oben). */
  private flip(piece: Piece): void {
    if (this.tweens.isTweening(piece.view)) return;
    const y = piece.view.y;
    this.events.emit('sound', { kind: 'flip' });
    this.tweens.add({
      targets: piece.view,
      scaleY: 0,
      y: y - 24,
      duration: 110,
      ease: 'Quad.easeOut',
      onComplete: () => {
        piece.food.up = piece.food.up === 0 ? 1 : 0;
        piece.stage = stageOf(piece.food.sides[piece.food.up]);
        piece.img.setTexture(this.foodKey(piece.food));
        this.tweens.add({ targets: piece.view, scaleY: 1, y, duration: 130, ease: 'Quad.easeIn' });
      },
    });
  }

  /** Weggeworfen: kleines Wölkchen. */
  private poof(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const s = this.add.image(x, y, 'smoke').setDepth(DEPTH.drag).setScale(0.6).setAlpha(0.8);
      const a = (i / 6) * Math.PI * 2;
      this.tweens.add({ targets: s, x: x + Math.cos(a) * 50, y: y + Math.sin(a) * 40, alpha: 0, scale: 1.2, duration: 400, onComplete: () => s.destroy() });
    }
    this.events.emit('sound', { kind: 'pop' });
  }

  // --- Teller und Gerichte ------------------------------------------------------------

  private slotPos(slot: number): { x: number; y: number } {
    return { x: this.plate.x + GRILL.plateSlots[slot], y: this.plate.y - 6 };
  }

  private freeSlot(): number {
    const used = new Set(this.dishes.map((d) => d.slot));
    return GRILL.plateSlots.findIndex((_, i) => !used.has(i));
  }

  /** Baut das Bild eines Gerichts: Brötchen (ggf. aufgeschnitten), Füllung hinein, Soßen drauf. */
  private drawDish(view: Phaser.GameObjects.Container, bun: Food | undefined, filling: Food | undefined, sauces: Sauce[]): void {
    view.removeAll(true);
    if (bun) view.add(this.add.image(0, 0, this.foodKey(bun)));
    if (filling) {
      const img = this.add.image(0, bun ? -2 : 0, this.foodKey(filling));
      // Im Brötchen etwas kleiner, damit es darin liegt
      if (bun) img.setScale(Math.min(1, 118 / img.width), 0.85);
      view.add(img);
    }
    // Soßen als Zickzack-Linie (Ketchup und Senf versetzt)
    sauces.forEach((sauce, i) => {
      const line = this.add.graphics();
      line.lineStyle(7, SAUCE_COLOR[sauce]);
      const pts: Phaser.Math.Vector2[] = [];
      for (let k = 0; k <= 8; k++) pts.push(new Phaser.Math.Vector2(-52 + k * 13, (k % 2 ? -7 : 7) + (i ? 6 : -4)));
      line.strokePoints(pts);
      view.add(line);
    });
  }

  private newDish(slot: number, bun: Food | undefined, filling: Food | undefined): Dish {
    const pos = this.slotPos(slot);
    const view = this.add.container(pos.x, pos.y).setDepth(DEPTH.dishes);
    const dish: Dish = { slot, bun, filling, sauces: [], view };
    view.setSize(140, 110).setInteractive(new Phaser.Geom.Rectangle(0, 0, 140, 110), Phaser.Geom.Rectangle.Contains);
    view.setData('grab', dish);
    this.redrawDish(dish);
    this.dishes.push(dish);
    return dish;
  }

  private redrawDish(dish: Dish): void {
    this.drawDish(dish.view, dish.bun, dish.filling, dish.sauces);
  }

  private removeDish(dish: Dish): void {
    this.dishes = this.dishes.filter((d) => d !== dish);
    dish.view.destroy();
  }

  /** Gericht unter einem Punkt (großzügig). */
  private dishAt(x: number, y: number, except?: Dish): Dish | undefined {
    return this.dishes.find((d) => d !== except && Math.abs(d.view.x - x) < 80 && Math.abs(d.view.y - y) < 70);
  }

  private onPlate(x: number, y: number): boolean {
    const P = GRILL.plate;
    return ((x - this.plate.x) / (P.w / 2 + 30)) ** 2 + ((y - this.plate.y) / (P.h / 2 + 40)) ** 2 <= 1;
  }

  private onGrate(x: number, y: number): boolean {
    const R = GRILL.grate;
    return x > R.left - 30 && x < R.right + 30 && y > R.top - 40 && y < R.bottom + 30;
  }

  /** Grillgut auf den Teller: ins aufgeschnittene Brötchen, zur Füllung dazu oder als eigenes Gericht. */
  private putOnPlate(food: Food, x: number, y: number): boolean {
    const target = this.dishAt(x, y);
    const def = FOODS[food.id];
    if (target) {
      if (def.fillsBun && target.bun?.cut && !target.filling) {
        target.filling = food;
        this.redrawDish(target);
        this.events.emit('sound', { kind: 'pop' });
        return true;
      }
      if (food.id === 'bun' && food.cut && !target.bun && target.filling && FOODS[target.filling.id].fillsBun) {
        target.bun = food;
        this.redrawDish(target);
        this.events.emit('sound', { kind: 'pop' });
        return true;
      }
    }
    const slot = this.freeSlot();
    if (slot < 0) return false;
    if (food.id === 'bun') this.newDish(slot, food, undefined);
    else this.newDish(slot, undefined, food);
    return true;
  }

  // --- Kinder und Bestellungen ---------------------------------------------------------

  /** Alle gehen an ihren Platz; das vorderste Kind bestellt, sobald es da ist. */
  private lineUp(first = false): void {
    this.queue.forEach((q, i) => {
      const slot = i === 0 ? GRILL.front : GRILL.queue[Math.min(i - 1, GRILL.queue.length - 1)];
      const kid = q.kid;
      const dist = Math.abs(kid.x - slot.x);
      if (dist < 2 && Math.abs(kid.y - slot.y) < 2) return;
      kid.setActivity('walk');
      kid.setFlipX(slot.x < kid.x);
      this.tweens.add({
        targets: kid,
        x: slot.x,
        y: slot.y,
        scale: slot.scale,
        duration: Phaser.Math.Clamp(dist * 2.4, 400, 2200) + (first ? i * 250 : 0),
        ease: 'Sine.easeInOut',
        onUpdate: () => kid.setDepth(DEPTH.kids + kid.y / 10),
        onComplete: () => {
          kid.setActivity('idle').setFlipX(false);
          if (i === 0 && this.queue[0] === q) this.takeOrder();
        },
      });
    });
  }

  private takeOrder(): void {
    const q = this.queue[0];
    if (!q || this.order) return;
    const items = randomOrder(this.recentOrders);
    this.recentOrders.push(signature(items));
    this.showCard(items);
    q.kid.wave(() => {});
  }

  /** Bestellkarte oben: Bilder der Gerichte (gar, mit Soßen), ohne Text. */
  private showCard(items: OrderItem[]): void {
    const C = GRILL.card;
    const card = this.add.container(C.x, C.y).setDepth(DEPTH.card);
    card.add(this.add.image(0, 0, 'grill-card'));
    const gap = C.w / (items.length + 1);
    items.forEach((item, i) => {
      const view = this.add.container(-C.w / 2 + gap * (i + 1), -8);
      const perfect = (id: FoodId, cut = false): Food => ({ id, sides: [1.4, 1.4], up: 0, cut });
      this.drawDish(view, item.bun ? perfect('bun', true) : undefined, perfect(item.main), item.sauces);
      view.setScale(items.length > 1 ? 1.05 : 1.35);
      card.add(view);
    });
    card.setScale(0);
    this.tweens.add({ targets: card, scale: 1, duration: 320, ease: 'Back.easeOut' });
    this.order = { items, card };
    this.events.emit('sound', { kind: 'peekaboo' });
  }

  private dropCard(happy: boolean): void {
    const card = this.order?.card;
    this.order = undefined;
    if (!card) return;
    this.tweens.add({ targets: card, y: card.y - (happy ? 160 : -40), alpha: 0, scale: happy ? 1.2 : 0.6, duration: 350, onComplete: () => card.destroy() });
  }

  /** Teller beim Kind abgegeben: prüfen, dann freuen, bäh oder Kopfschütteln. */
  private serve(): void {
    const q = this.queue[0];
    if (!q || !this.order || this.busy) return this.plateBack();
    const bad = this.dishes.some((d) => (d.filling && quality(d.filling.id, d.filling.sides) !== 'good') || (d.bun && quality('bun', d.bun.sides) !== 'good'));
    if (bad) {
      // Roh oder verbrannt: bäh, Teller wird abgeräumt, das Kind bestellt neu
      this.busy = true;
      q.kid.yuck(() => {
        this.busy = false;
        this.takeOrder();
      });
      this.events.emit('sound', { kind: 'yuck' });
      this.dropCard(false);
      this.clearPlate();
      this.plateBack();
      return;
    }
    if (!this.matches(this.order.items)) {
      // Nicht das Bestellte: Kopfschütteln, Teller zurück, Bestellung bleibt
      q.kid.shakeHead();
      this.tweens.add({ targets: this.order.card, angle: { from: -6, to: 6 }, duration: 90, yoyo: true, repeat: 2, onComplete: () => this.order?.card.setAngle(0) });
      this.plateBack();
      return;
    }
    // Genau richtig: freuen, Teller mitnehmen, weggehen und hinten wieder anstellen
    this.busy = true;
    this.events.emit('sound', { kind: 'yum' });
    this.dropCard(true);
    this.clearPlate(true);
    this.plateBack();
    q.kid.cheer();
    this.time.delayedCall(1100, () => this.leaveHappy(q));
  }

  /** Stimmt der Teller mit der Bestellung? (jedes bestellte Gericht einmal, Soßen genau) */
  private matches(items: OrderItem[]): boolean {
    const left = [...this.dishes];
    for (const item of items) {
      const i = left.findIndex(
        (d) =>
          d.filling?.id === item.main &&
          !!d.bun === item.bun &&
          (!d.bun || d.bun.cut) &&
          [...d.sauces].sort().join() === [...item.sauces].sort().join(),
      );
      if (i < 0) return false;
      left.splice(i, 1);
    }
    return true;
  }

  private leaveHappy(q: QueueKid): void {
    this.queue.shift();
    const kid = q.kid;
    kid.setActivity('walk').setFlipX(true);
    this.tweens.add({
      targets: kid,
      x: -200,
      duration: 1800,
      ease: 'Sine.easeIn',
      onComplete: () => {
        // Später wieder hinten anstellen (von rechts)
        kid.setPosition(2100, GRILL.queue[GRILL.queue.length - 1].y).setFlipX(false);
        this.queue.push(q);
        this.busy = false;
        this.lineUp();
      },
    });
    this.busy = false;
    this.lineUp();
  }

  /** Teller leeren (happy: das Essen fliegt zum Kind, sonst puff). */
  private clearPlate(happy = false): void {
    const kid = this.queue[0]?.kid;
    for (const d of [...this.dishes]) {
      this.dishes = this.dishes.filter((x) => x !== d);
      if (happy && kid) {
        this.tweens.add({ targets: d.view, x: kid.x, y: kid.y - 180, scale: 0.4, alpha: 0, duration: 450, ease: 'Sine.easeIn', onComplete: () => d.view.destroy() });
      } else {
        this.poof(d.view.x, d.view.y);
        d.view.destroy();
      }
    }
  }

  private plateBack(): void {
    const P = GRILL.plate;
    this.tweens.add({
      targets: this.plate,
      x: P.x,
      y: P.y,
      duration: 260,
      ease: 'Sine.easeOut',
      onUpdate: () => this.followPlate(),
      onComplete: () => {
        this.plate.setDepth(DEPTH.plate);
        this.followPlate();
      },
    });
  }

  private followPlate(): void {
    for (const d of this.dishes) {
      const p = this.slotPos(d.slot);
      d.view.setPosition(p.x, p.y).setDepth(this.plate.depth + 10);
    }
  }

  // --- Eingabe -------------------------------------------------------------------------

  private setupInput(): void {
    this.input.on('gameobjectdown', (pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      if (this.leaving || this.touches.has(pointer.id)) return;
      const grab = obj.getData('grab');
      // Aus dem Vorrat: sofort ein neues Stück in der Hand
      if (typeof grab === 'string' && grab.startsWith('source:')) {
        const id = grab.slice(7) as FoodId;
        const piece = this.newPiece({ id, sides: [0, 0], up: 0, cut: false }, pointer.x, pointer.y);
        piece.view.setDepth(DEPTH.drag);
        this.touches.set(pointer.id, { pointer, target: piece.view, dragging: { kind: 'piece', piece, fromGrill: false }, offset: { x: 0, y: 0 } });
        return;
      }
      const o = obj as unknown as { x: number; y: number };
      this.touches.set(pointer.id, { pointer, target: obj, offset: { x: o.x - pointer.x, y: o.y - pointer.y } });
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const t = this.touches.get(pointer.id);
      if (!t) return;
      if (!t.dragging && pointer.getDistance() >= DRAG_THRESHOLD) t.dragging = this.startDrag(t);
      if (!t.dragging) return;
      const x = pointer.x + t.offset.x;
      const y = pointer.y + t.offset.y;
      switch (t.dragging.kind) {
        case 'piece':
          t.dragging.piece.view.setPosition(x, y);
          break;
        case 'dish':
          t.dragging.dish.view.setPosition(x, y);
          break;
        case 'plate':
          this.plate.setPosition(x, y);
          this.followPlate();
          break;
        case 'bottle':
          // Flasche kippt zum Ausdrücken
          t.dragging.img.setPosition(x, y).setAngle(150);
          break;
      }
    });

    const up = (pointer: Phaser.Input.Pointer) => {
      const t = this.touches.get(pointer.id);
      if (!t) return;
      this.touches.delete(pointer.id);
      if (t.dragging) this.drop(t.dragging, pointer);
      else if (pointer.getDistance() < DRAG_THRESHOLD) this.tap(t.target);
    };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);
  }

  /** Was beim Losziehen in die Hand genommen wird. */
  private startDrag(t: Touch): Grab | undefined {
    const grab = t.target.getData('grab');
    if (grab === 'plate') {
      if (this.tweens.isTweening(this.plate)) return undefined;
      this.plate.setDepth(DEPTH.drag);
      this.followPlate();
      return { kind: 'plate' };
    }
    if (typeof grab === 'string' && grab.startsWith('bottle:')) {
      const img = t.target as Phaser.GameObjects.Image;
      img.setDepth(DEPTH.drag);
      return { kind: 'bottle', sauce: grab.slice(7) as Sauce, img };
    }
    if (grab && typeof grab === 'object' && 'food' in grab) {
      const piece = grab as Piece;
      if (this.tweens.isTweening(piece.view)) return undefined;
      this.pieces = this.pieces.filter((p) => p !== piece);
      piece.view.setDepth(DEPTH.drag).setScale(1.08);
      return { kind: 'piece', piece, fromGrill: true };
    }
    if (grab && typeof grab === 'object' && 'slot' in grab) {
      const dish = grab as Dish;
      dish.view.setDepth(DEPTH.drag);
      return { kind: 'dish', dish };
    }
    return undefined;
  }

  private tap(target: Phaser.GameObjects.GameObject): void {
    const grab = target.getData('grab');
    if (grab === 'exit') return this.leave();
    const onTap = target.getData('onTap');
    if (typeof onTap === 'function') return onTap();
    if (grab && typeof grab === 'object' && 'food' in grab) return this.flip(grab as Piece);
    if (grab && typeof grab === 'object' && 'slot' in grab) {
      // Brötchen auf dem Teller antippen: aufschneiden
      const dish = grab as Dish;
      if (dish.bun && !dish.bun.cut && !dish.filling) {
        dish.bun.cut = true;
        this.redrawDish(dish);
        this.events.emit('sound', { kind: 'cut' });
        this.tweens.add({ targets: dish.view, scaleX: { from: 1.15, to: 1 }, duration: 180, ease: 'Back.easeOut' });
      }
    }
  }

  private drop(grab: Grab, pointer: Phaser.Input.Pointer): void {
    const { x, y } = pointer;
    switch (grab.kind) {
      case 'piece': {
        const { piece } = grab;
        piece.view.setScale(1);
        if (this.onGrate(piece.view.x, piece.view.y)) {
          const R = GRILL.grate;
          piece.view
            .setPosition(Phaser.Math.Clamp(piece.view.x, R.left + 40, R.right - 40), Phaser.Math.Clamp(piece.view.y, R.top + 30, R.bottom - 30))
            .setDepth(DEPTH.pieces + piece.view.y / 100);
          this.pieces.push(piece);
          this.events.emit('sound', { kind: 'sizzle' });
          return;
        }
        if (this.onPlate(x, y) && this.putOnPlate(piece.food, x, y)) {
          piece.smoke.stop();
          this.time.delayedCall(1800, () => piece.smoke.destroy());
          piece.view.destroy();
          return;
        }
        this.poof(piece.view.x, piece.view.y);
        this.removePiece(piece);
        return;
      }
      case 'dish': {
        const { dish } = grab;
        const other = this.dishAt(x, y, dish);
        // Zwei Gerichte zusammenlegen: Füllung ins aufgeschnittene Brötchen
        if (other && dish.filling && !dish.bun && FOODS[dish.filling.id].fillsBun && other.bun?.cut && !other.filling) {
          other.filling = dish.filling;
          other.sauces = [...new Set([...other.sauces, ...dish.sauces])];
          this.redrawDish(other);
          this.removeDish(dish);
          this.events.emit('sound', { kind: 'pop' });
          return;
        }
        if (other && dish.bun?.cut && !dish.filling && other.filling && !other.bun && FOODS[other.filling.id].fillsBun) {
          other.bun = dish.bun;
          other.sauces = [...new Set([...other.sauces, ...dish.sauces])];
          this.redrawDish(other);
          this.removeDish(dish);
          this.events.emit('sound', { kind: 'pop' });
          return;
        }
        // Einzelnes Grillgut zurück auf den Rost
        const single = (dish.bun && !dish.filling) || (!dish.bun && dish.filling) ? (dish.bun ?? dish.filling) : undefined;
        if (single && dish.sauces.length === 0 && this.onGrate(x, y)) {
          const piece = this.newPiece(single, x, y);
          const R = GRILL.grate;
          piece.view.setPosition(Phaser.Math.Clamp(x, R.left + 40, R.right - 40), Phaser.Math.Clamp(y, R.top + 30, R.bottom - 30));
          this.pieces.push(piece);
          this.removeDish(dish);
          return;
        }
        if (this.onPlate(x, y)) {
          this.followPlate();
          return;
        }
        this.poof(dish.view.x, dish.view.y);
        this.removeDish(dish);
        return;
      }
      case 'plate': {
        const kid = this.queue[0]?.kid;
        if (kid && !kid.scene.tweens.isTweening(kid)) {
          const b = kid.getBounds();
          Phaser.Geom.Rectangle.Inflate(b, 90, 60);
          if (b.contains(x, y) && this.dishes.length) return this.serve();
        }
        this.plateBack();
        return;
      }
      case 'bottle': {
        const dish = this.dishAt(x, y + 60) ?? this.dishAt(x, y);
        if (dish && !dish.sauces.includes(grab.sauce)) {
          dish.sauces.push(grab.sauce);
          this.redrawDish(dish);
          this.events.emit('sound', { kind: 'squirt' });
        }
        const home = GRILL.bottles[grab.sauce];
        this.tweens.add({ targets: grab.img, x: home.x, y: home.y, angle: 0, duration: 260, ease: 'Sine.easeOut', onComplete: () => grab.img.setDepth(DEPTH.bottles) });
        return;
      }
    }
  }

  /** Holzschild angetippt: zurück auf die Wiese. */
  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.params.onDone());
  }
}
