import Phaser from 'phaser';
import type { CharacterDef } from '../data/characters';
import type { Outfit } from '../data/costumes';
import {
  FOODS,
  quality,
  randomOrder,
  SAUCE_MIN,
  signature,
  stageOf,
  stageProgress,
  STAGES,
  type FoodId,
  type OrderItem,
  type Sauce,
} from '../data/grill';
import { Kid } from '../objects/Kid';
import { BOTTLE_SIZE, drawOrderCard, drawSauce, foodSize, GRILL, sauceZigzag } from './placeholders/grill';

/** Was die Wiese dem Grill-Spiel mitgibt. */
export interface GrillData {
  kids: { def: CharacterDef; outfit: Outfit }[];
  /** Holzschild angetippt: zurück auf die Wiese. */
  onDone(): void;
}

/** Ein Stück Grillgut: Garstufe (Vielfache der Garzeit). Gewendet wird nicht. */
interface Food {
  id: FoodId;
  level: number;
  /** Brötchen aufgeschnitten. */
  cut: boolean;
}

/** Grillgut auf dem Rost (oder in der Hand). */
interface Piece {
  food: Food;
  view: Phaser.GameObjects.Container;
  img: Phaser.GameObjects.Image;
  /** Nächste Garstufe darüber, blendet langsam ein (man sieht es braun werden). */
  next: Phaser.GameObjects.Image;
  smoke: Phaser.GameObjects.Particles.ParticleEmitter;
  stage: number;
}

type Point = { x: number; y: number };
/** Soßen-Kleckse in Koordinaten des Gerichts (Mitte = 0, 0). */
type SaucePoints = Record<Sauce, Point[]>;

/** Ein Gericht auf dem Teller: frei hingelegt (Versatz zur Tellermitte), Brötchen und/oder Füllung, Soßen. */
interface Dish {
  dx: number;
  dy: number;
  bun?: Food;
  filling?: Food;
  sauce: SaucePoints;
  view: Phaser.GameObjects.Container;
  sauceGfx: Phaser.GameObjects.Graphics;
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
  | { kind: 'bottle'; sauce: Sauce; img: Phaser.GameObjects.Image }
  | { kind: 'cloth' };

interface Touch {
  pointer: Phaser.Input.Pointer;
  target: Phaser.GameObjects.GameObject;
  dragging?: Grab;
  offset: { x: number; y: number };
}

const DRAG_THRESHOLD = 12;
const DEPTH = { kids: 100, grill: 300, embers: 305, pieces: 400, plate: 500, dishes: 510, bottles: 520, cloth: 530, drag: 900, card: 950 };
const SAUCE_COLOR: Record<Sauce, number> = { ketchup: 0xd62828, mustard: 0xf2c230 };
const SIZZLE_EVERY = 1400;
/** Höchstens so viele Gerichte auf dem Teller. */
const MAX_DISHES = 5;
/** Flasche kopfüber: alle so viele ms ein Klecks, höchstens so viele je Soße und Gericht. */
const SQUIRT_EVERY = 30;
const SAUCE_MAX = 260;
/** Wie weit unter der Tülle die Soße auftrifft. */
const SQUIRT_REACH = 34;
/** Das Tuch wischt in diesem Umkreis ab. */
const WIPE_RADIUS = 58;

/**
 * Grill-Spiel hinter Felix' grünem Gartentor (#66). Rechts liegt der Vorrat, in der Mitte der
 * Rost (gart von allein, ohne Wenden: man sieht, wie es langsam braun wird), links wird auf dem
 * Teller frei angerichtet (Brötchen antippen = aufschneiden, Würstchen/Käse ins Brötchen ziehen).
 * Soßenflasche hochheben = sie dreht sich um, über dem Essen kommt Soße heraus; das Tuch wischt
 * sie wieder ab. Hinter dem Grill bestellen die Kinder nacheinander (Karte oben, ohne Text);
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
  private cloth!: Phaser.GameObjects.Image;
  /** Soßenstrahl aus der Flasche (nur solange etwas herauskommt). */
  private stream!: Phaser.GameObjects.Graphics;
  private squirtTimer = 0;
  private nextSquirtSound = 0;
  private nextWipeSound = 0;

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
        this.add.image(p.x - 50 + i * 50, p.y + (i % 2) * 8 - 6, this.foodKey({ id, level: 0, cut: false })).setScale(0.5).setDepth(DEPTH.grill + 1).setAngle(-8 + i * 8);
      }
      this.add.zone(p.x, p.y + 10, 240, 120).setInteractive({ useHandCursor: true }).setData('grab', `source:${id}`).setDepth(DEPTH.grill + 2);
    }

    // Teller, Soßenflaschen (drehen sich um die Mitte) und Wischtuch
    const P = GRILL.plate;
    this.plate = this.add.image(P.x, P.y, 'grill-plate').setDepth(DEPTH.plate);
    this.plate.setInteractive(new Phaser.Geom.Ellipse(P.w / 2, P.h / 2, P.w, P.h), Phaser.Geom.Ellipse.Contains).setData('grab', 'plate');
    for (const sauce of ['ketchup', 'mustard'] as Sauce[]) {
      const home = this.bottleHome(sauce);
      const img = this.add.image(home.x, home.y, `grill-bottle-${sauce}`).setDepth(DEPTH.bottles);
      img.setInteractive({ useHandCursor: true }).setData('grab', `bottle:${sauce}`);
    }
    this.stream = this.add.graphics().setDepth(DEPTH.drag - 1);
    this.cloth = this.add.image(GRILL.cloth.x, GRILL.cloth.y, 'grill-cloth').setDepth(DEPTH.cloth);
    this.cloth.setInteractive({ useHandCursor: true }).setData('grab', 'cloth');

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
    this.squirt(delta);
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

  private foodKey(food: Food, stage = stageOf(food.level)): string {
    return food.id === 'bun' && food.cut ? `food-buncut-${stage}` : `food-${food.id}-${stage}`;
  }

  private newPiece(food: Food, x: number, y: number): Piece {
    const img = this.add.image(0, 0, this.foodKey(food));
    const next = this.add.image(0, 0, this.foodKey(food)).setAlpha(0);
    const { width, height } = foodSize(food.id);
    const view = this.add.container(x, y, [img, next]).setDepth(DEPTH.pieces);
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
    const piece: Piece = { food, view, img, next, smoke, stage: -1 };
    view.setData('grab', piece);
    this.showStage(piece);
    return piece;
  }

  private removePiece(piece: Piece): void {
    this.pieces = this.pieces.filter((p) => p !== piece);
    piece.smoke.stop();
    this.time.delayedCall(1800, () => piece.smoke.destroy());
    piece.view.destroy();
  }

  /** Auf dem Rost gart das Grillgut; ab kräftig gebräunt qualmt es, verkohlt stark. */
  private cook(dt: number): void {
    const R = GRILL.grate;
    for (const piece of this.pieces) {
      const f = piece.food;
      const onGrill = piece.view.x > R.left - 20 && piece.view.x < R.right + 20 && piece.view.y > R.top - 20 && piece.view.y < R.bottom + 20;
      if (!onGrill) continue;
      f.level += dt / FOODS[f.id].cook;
      const before = piece.stage;
      const stage = this.showStage(piece);
      // Gar geworden: kleiner Hüpfer
      if (before === 1 && stage === 2) this.tweens.add({ targets: piece.img, scale: { from: 1, to: 1.12 }, duration: 140, yoyo: true });
      piece.smoke.setPosition(piece.view.x, piece.view.y - 10);
      if (stage >= 3) {
        piece.smoke.frequency = stage >= 4 ? 120 : 380;
        piece.smoke.setParticleTint(stage >= 4 ? 0x333333 : 0xdddddd);
        if (!piece.smoke.emitting) piece.smoke.start();
      } else if (piece.smoke.emitting) piece.smoke.stop();
    }
    if (this.pieces.length && this.time.now > this.nextSizzle) {
      this.nextSizzle = this.time.now + SIZZLE_EVERY;
      this.events.emit('sound', { kind: 'sizzle' });
    }
  }

  /** Bild zur Garstufe, die nächste Stufe schimmert schon durch. */
  private showStage(piece: Piece): number {
    const f = piece.food;
    const stage = stageOf(f.level);
    if (stage !== piece.stage) {
      piece.stage = stage;
      piece.img.setTexture(this.foodKey(f));
      if (stage < STAGES - 1) piece.next.setTexture(this.foodKey(f, stage + 1));
    }
    piece.next.setAlpha(stage < STAGES - 1 ? stageProgress(f.level) : 0);
    return stage;
  }

  /** Antippen auf dem Rost: kurz wackeln (gewendet wird nicht). */
  private wiggle(piece: Piece): void {
    if (this.tweens.isTweening(piece.img)) return;
    this.tweens.add({ targets: [piece.img, piece.next], angle: { from: -6, to: 6 }, duration: 70, yoyo: true, repeat: 1, onComplete: () => {
      piece.img.setAngle(0);
      piece.next.setAngle(0);
    } });
    this.events.emit('sound', { kind: 'sizzle' });
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

  /** Gerichtsmitte auf dem Teller: innerhalb der Tellerform halten. */
  private clampToPlate(dx: number, dy: number): Point {
    const P = GRILL.plate;
    const rx = P.w / 2 - 95;
    const ry = P.h / 2 - 48;
    const r = Math.hypot(dx / rx, dy / ry);
    return r <= 1 ? { x: dx, y: dy } : { x: dx / r, y: dy / r };
  }

  /** Baut das Bild eines Gerichts: Brötchen (ggf. aufgeschnitten), Füllung hinein, Soßen drauf. */
  private drawDish(view: Phaser.GameObjects.Container, bun: Food | undefined, filling: Food | undefined, sauce: SaucePoints): Phaser.GameObjects.Graphics {
    view.removeAll(true);
    if (bun) view.add(this.add.image(0, 0, this.foodKey(bun)));
    if (filling) {
      const img = this.add.image(0, bun ? -2 : 0, this.foodKey(filling));
      // Im Brötchen etwas kleiner, damit es darin liegt
      if (bun) img.setScale(Math.min(1, (foodSize('buncut').width - 40) / img.width), 0.85);
      view.add(img);
    }
    const gfx = this.add.graphics();
    this.drawSauces(gfx, sauce);
    view.add(gfx);
    return gfx;
  }

  private drawSauces(gfx: Phaser.GameObjects.Graphics, sauce: SaucePoints): void {
    gfx.clear();
    for (const s of ['ketchup', 'mustard'] as Sauce[]) drawSauce(gfx, sauce[s], SAUCE_COLOR[s]);
  }

  /** Halbe Größe der Essfläche eines Gerichts (dort landet Soße). */
  private dishHalf(dish: Pick<Dish, 'bun' | 'filling'>): Point {
    const size = dish.bun ? foodSize(dish.bun.cut ? 'buncut' : 'bun') : foodSize(dish.filling!.id);
    return { x: size.width / 2, y: size.height / 2 };
  }

  private newDish(x: number, y: number, bun: Food | undefined, filling: Food | undefined): Dish {
    const d = this.clampToPlate(x - this.plate.x, y - this.plate.y);
    const view = this.add.container(this.plate.x + d.x, this.plate.y + d.y);
    const dish: Dish = { dx: d.x, dy: d.y, bun, filling, sauce: { ketchup: [], mustard: [] }, view, sauceGfx: undefined! };
    view.setData('grab', dish);
    this.redrawDish(dish);
    this.dishes.push(dish);
    this.followPlate();
    return dish;
  }

  private redrawDish(dish: Dish): void {
    dish.sauceGfx = this.drawDish(dish.view, dish.bun, dish.filling, dish.sauce);
    // Touch-Fläche so groß wie das Essen (etwas mehr), damit der Tellerrand frei zum Greifen bleibt
    const half = this.dishHalf(dish);
    const w = half.x * 2 + 16;
    const h = Math.max(half.y * 2 + 20, 100);
    dish.view.setSize(w, h);
    if (dish.view.input) dish.view.input.hitArea = new Phaser.Geom.Rectangle(0, 0, w, h);
    else dish.view.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
  }

  private removeDish(dish: Dish): void {
    this.dishes = this.dishes.filter((d) => d !== dish);
    dish.view.destroy();
  }

  /** Gericht unter einem Punkt (großzügig, das nächste). */
  private dishAt(x: number, y: number, except?: Dish): Dish | undefined {
    let best: Dish | undefined;
    let bestD = Infinity;
    for (const d of this.dishes) {
      if (d === except) continue;
      const dx = Math.abs(d.view.x - x);
      const dy = Math.abs(d.view.y - y);
      if (dx < 110 && dy < 72 && dx + dy < bestD) {
        best = d;
        bestD = dx + dy;
      }
    }
    return best;
  }

  private onPlate(x: number, y: number): boolean {
    const P = GRILL.plate;
    return ((x - this.plate.x) / (P.w / 2 + 30)) ** 2 + ((y - this.plate.y) / (P.h / 2 + 40)) ** 2 <= 1;
  }

  private onGrate(x: number, y: number): boolean {
    const R = GRILL.grate;
    return x > R.left - 30 && x < R.right + 30 && y > R.top - 40 && y < R.bottom + 30;
  }

  /** Beide Soßen eines Gerichts in ein anderes übernehmen (beim Zusammenlegen). */
  private mergeSauce(into: Dish, from: Dish): void {
    for (const s of ['ketchup', 'mustard'] as Sauce[]) into.sauce[s] = [...into.sauce[s], ...from.sauce[s]].slice(-SAUCE_MAX);
  }

  /** Grillgut auf den Teller: ins aufgeschnittene Brötchen, zur Füllung dazu oder frei hingelegt. */
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
    if (this.dishes.length >= MAX_DISHES) return false;
    if (food.id === 'bun') this.newDish(x, y, food, undefined);
    else this.newDish(x, y, undefined, food);
    return true;
  }

  // --- Soße und Tuch -------------------------------------------------------------------

  private bottleHome(sauce: Sauce): Point {
    const b = GRILL.bottles[sauce];
    return { x: b.x, y: b.y - BOTTLE_SIZE.height / 2 };
  }

  /** Tülle der Flasche (oben in der Zeichnung), folgt der Drehung um die Mitte. */
  private nozzle(img: Phaser.GameObjects.Image): Point {
    const r = img.rotation;
    const h = BOTTLE_SIZE.height / 2;
    return { x: img.x + h * Math.sin(r), y: img.y - h * Math.cos(r) };
  }

  /** Flasche kopfüber über dem Essen: Soße kommt heraus (Kleckse auf das Gericht darunter). */
  private squirt(delta: number): void {
    this.stream.clear();
    let squirting = false;
    for (const t of this.touches.values()) {
      const grab = t.dragging;
      if (grab?.kind !== 'bottle' || Math.cos(grab.img.rotation) > -0.85) continue;
      const tip = this.nozzle(grab.img);
      const hit = { x: tip.x, y: tip.y + SQUIRT_REACH };
      const dish = this.dishUnder(hit);
      if (!dish) continue;
      squirting = true;
      this.stream.lineStyle(8, SAUCE_COLOR[grab.sauce]);
      this.stream.lineBetween(tip.x, tip.y + 4, hit.x, hit.y);
      this.squirtTimer += delta;
      const pts = dish.sauce[grab.sauce];
      let added = false;
      while (this.squirtTimer >= SQUIRT_EVERY) {
        this.squirtTimer -= SQUIRT_EVERY;
        if (pts.length >= SAUCE_MAX) continue;
        // Auf der Essfläche landen (großzügig gezielt, dann auf das Essen geschoben)
        const half = this.dishHalf(dish);
        const lx = Phaser.Math.Clamp(hit.x - dish.view.x + Phaser.Math.Between(-3, 3), -half.x + 14, half.x - 14);
        const ly = Phaser.Math.Clamp(hit.y - dish.view.y + Phaser.Math.Between(-3, 3), -half.y + 8, half.y - 8);
        pts.push({ x: lx, y: ly });
        added = true;
      }
      if (added) this.drawSauces(dish.sauceGfx, dish.sauce);
      if (this.time.now > this.nextSquirtSound) {
        this.nextSquirtSound = this.time.now + 450;
        this.events.emit('sound', { kind: 'squirt' });
      }
    }
    if (!squirting) this.squirtTimer = 0;
  }

  /** Gericht, dessen Essfläche den Punkt (großzügig) enthält; das nächste zuerst. */
  private dishUnder(p: Point): Dish | undefined {
    let best: Dish | undefined;
    let bestD = Infinity;
    for (const d of this.dishes) {
      const half = this.dishHalf(d);
      const dx = Math.abs(p.x - d.view.x);
      const dy = Math.abs(p.y - d.view.y);
      if (dx < half.x - 4 && dy < half.y + 16 && dy < bestD) {
        best = d;
        bestD = dy;
      }
    }
    return best;
  }

  /** Tuch über das Essen ziehen: Soße in der Nähe verschwindet. */
  private wipe(): void {
    let wiped = false;
    for (const d of this.dishes) {
      const cx = this.cloth.x - d.view.x;
      const cy = this.cloth.y - d.view.y;
      let changed = false;
      for (const s of ['ketchup', 'mustard'] as Sauce[]) {
        const before = d.sauce[s].length;
        d.sauce[s] = d.sauce[s].filter((p) => Math.hypot(p.x - cx, p.y - cy) > WIPE_RADIUS);
        if (d.sauce[s].length !== before) changed = true;
      }
      if (changed) {
        this.drawSauces(d.sauceGfx, d.sauce);
        wiped = true;
      }
    }
    if (wiped) {
      this.cloth.setAngle(Phaser.Math.Between(-10, 10));
      if (this.time.now > this.nextWipeSound) {
        this.nextWipeSound = this.time.now + 300;
        this.events.emit('sound', { kind: 'wipe' });
      }
    }
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

  /**
   * Bestellkarte oben, an einer Klammer: jedes Gericht (gar, mit Soßen) auf einem eigenen
   * kleinen Teller, mit Abstand dazwischen. Ohne Text.
   */
  private showCard(items: OrderItem[]): void {
    const C = GRILL.card;
    const card = this.add.container(C.x, C.y).setDepth(DEPTH.card);
    const bg = this.add.graphics();
    const { centers, y } = drawOrderCard(bg, items.length);
    card.add(bg);
    items.forEach((item, i) => {
      const view = this.add.container(centers[i], y);
      const perfect = (id: FoodId, cut = false): Food => ({ id, level: 1.4, cut });
      const sauce: SaucePoints = { ketchup: [], mustard: [] };
      item.sauces.forEach((s, k) => (sauce[s] = sauceZigzag(k ? 8 : item.sauces.length > 1 ? -8 : 0)));
      this.drawDish(view, item.bun ? perfect('bun', true) : undefined, perfect(item.main), sauce);
      card.add(view);
    });
    // Klappt an der Klammer herunter und pendelt aus
    card.setScale(0.3).setAngle(-14);
    this.tweens.add({ targets: card, scale: 1, duration: 300, ease: 'Back.easeOut' });
    this.tweens.add({ targets: card, angle: 0, duration: 1100, ease: 'Elastic.easeOut', easeParams: [1.2, 0.35] });
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
    const bad = this.dishes.some((d) => (d.filling && quality(d.filling.id, d.filling.level) !== 'good') || (d.bun && quality('bun', d.bun.level) !== 'good'));
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

  /** Stimmt der Teller mit der Bestellung? (jedes bestellte Gericht einmal, Soßen genau; ein paar Kleckse zählen) */
  private matches(items: OrderItem[]): boolean {
    const left = [...this.dishes];
    for (const item of items) {
      const i = left.findIndex(
        (d) =>
          d.filling?.id === item.main &&
          !!d.bun === item.bun &&
          (!d.bun || d.bun.cut) &&
          (['ketchup', 'mustard'] as Sauce[]).filter((s) => d.sauce[s].length >= SAUCE_MIN).join() ===
            [...item.sauces].sort().join(),
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

  /** Gerichte liegen fest auf dem Teller (weiter unten = weiter vorn). */
  private followPlate(): void {
    for (const d of this.dishes) d.view.setPosition(this.plate.x + d.dx, this.plate.y + d.dy).setDepth(this.plate.depth + 10 + (d.dy + 200) / 100);
  }

  // --- Eingabe -------------------------------------------------------------------------

  private setupInput(): void {
    this.input.on('gameobjectdown', (pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      if (this.leaving || this.touches.has(pointer.id)) return;
      const grab = obj.getData('grab');
      // Aus dem Vorrat: sofort ein neues Stück in der Hand
      if (typeof grab === 'string' && grab.startsWith('source:')) {
        const id = grab.slice(7) as FoodId;
        const piece = this.newPiece({ id, level: 0, cut: false }, pointer.x, pointer.y);
        piece.view.setDepth(DEPTH.drag);
        this.touches.set(pointer.id, { pointer, target: piece.view, dragging: { kind: 'piece', piece, fromGrill: false }, offset: { x: 0, y: 0 } });
        return;
      }
      // Soßenflasche: sofort hochheben und umdrehen (Tülle nach unten)
      if (typeof grab === 'string' && grab.startsWith('bottle:')) {
        const img = obj as Phaser.GameObjects.Image;
        this.tweens.killTweensOf(img);
        img.setDepth(DEPTH.drag);
        this.tweens.add({ targets: img, angle: 180, duration: 220, ease: 'Back.easeOut' });
        this.touches.set(pointer.id, { pointer, target: obj, dragging: { kind: 'bottle', sauce: grab.slice(7) as Sauce, img }, offset: { x: img.x - pointer.x, y: img.y - pointer.y } });
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
          t.dragging.img.setPosition(x, y);
          break;
        case 'cloth':
          this.cloth.setPosition(x, y);
          this.wipe();
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
    if (grab === 'cloth') {
      this.tweens.killTweensOf(this.cloth);
      this.cloth.setDepth(DEPTH.drag).setScale(0.9);
      return { kind: 'cloth' };
    }
    if (grab && typeof grab === 'object' && 'food' in grab) {
      const piece = grab as Piece;
      if (this.tweens.isTweening(piece.view)) return undefined;
      this.pieces = this.pieces.filter((p) => p !== piece);
      piece.view.setDepth(DEPTH.drag).setScale(1.08);
      return { kind: 'piece', piece, fromGrill: true };
    }
    if (grab && typeof grab === 'object' && 'sauce' in grab) {
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
    if (grab === 'cloth') {
      this.tweens.add({ targets: this.cloth, angle: { from: -8, to: 8 }, duration: 80, yoyo: true, repeat: 1, onComplete: () => this.cloth.setAngle(0) });
      return;
    }
    if (grab && typeof grab === 'object' && 'food' in grab) return this.wiggle(grab as Piece);
    if (grab && typeof grab === 'object' && 'sauce' in grab) {
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
          this.mergeSauce(other, dish);
          this.redrawDish(other);
          this.removeDish(dish);
          this.events.emit('sound', { kind: 'pop' });
          return;
        }
        if (other && dish.bun?.cut && !dish.filling && other.filling && !other.bun && FOODS[other.filling.id].fillsBun) {
          other.bun = dish.bun;
          this.mergeSauce(other, dish);
          this.redrawDish(other);
          this.removeDish(dish);
          this.events.emit('sound', { kind: 'pop' });
          return;
        }
        // Einzelnes Grillgut zurück auf den Rost
        const single = (dish.bun && !dish.filling) || (!dish.bun && dish.filling) ? (dish.bun ?? dish.filling) : undefined;
        if (single && !dish.sauce.ketchup.length && !dish.sauce.mustard.length && this.onGrate(x, y)) {
          const piece = this.newPiece(single, x, y);
          const R = GRILL.grate;
          piece.view.setPosition(Phaser.Math.Clamp(x, R.left + 40, R.right - 40), Phaser.Math.Clamp(y, R.top + 30, R.bottom - 30));
          this.pieces.push(piece);
          this.removeDish(dish);
          return;
        }
        if (this.onPlate(x, y)) {
          // Frei hinlegen, wo man loslässt
          const d = this.clampToPlate(dish.view.x - this.plate.x, dish.view.y - this.plate.y);
          dish.dx = d.x;
          dish.dy = d.y;
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
        // Zurück an ihren Platz, wieder aufrecht
        const home = this.bottleHome(grab.sauce);
        this.tweens.killTweensOf(grab.img);
        this.tweens.add({ targets: grab.img, x: home.x, y: home.y, angle: 0, duration: 300, ease: 'Sine.easeOut', onComplete: () => grab.img.setDepth(DEPTH.bottles) });
        return;
      }
      case 'cloth': {
        const C = GRILL.cloth;
        this.tweens.add({ targets: this.cloth, x: C.x, y: C.y, angle: 0, scale: 1, duration: 280, ease: 'Sine.easeOut', onComplete: () => this.cloth.setDepth(DEPTH.cloth) });
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
