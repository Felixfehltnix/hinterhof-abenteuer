import Phaser from 'phaser';
import {
  DRAG_THRESHOLD,
  GAME_HEIGHT,
  GAME_WIDTH,
  GROUND_MAX_Y,
  GROUND_MIN_Y,
  GROUND_TOP,
  MAX_OBJECTS,
} from '../config';
import { CHARACTERS, getCharacterDef, type CharacterDef, type CharacterId } from '../data/characters';
import { EQUIPMENT, GARDEN_GATE, PLACED_KIDS, PLACED_TOYS, TOY_BOX } from '../data/playground';
import { getToyDef, TOYS, type ToyDef } from '../data/toys';
import { createEquipment, Sandbox, type Equipment } from '../objects/Equipment';
import { Garden } from '../objects/Garden';
import { GardenGate } from '../objects/GardenGate';
import { Kid } from '../objects/Kid';
import { ToyBox } from '../objects/ToyBox';
import { Toy } from '../objects/toys/Toy';
import { AutoSave } from '../save/AutoSave';
import { DayCycle } from '../world/DayCycle';
import { Weather } from '../world/Weather';
import { loadSave, SAVE_VERSION, type SaveData } from '../save/storage';

/** Ein Stück Weltzustand, das mitgespeichert wird (Tageszeit, Wetter, …). */
export interface WorldState {
  save(): unknown;
  /** Bekommt den gespeicherten Wert – kann alles sein, selbst prüfen! */
  load(value: unknown): void;
}

export class PlaygroundScene extends Phaser.Scene {
  private equipment: Equipment[] = [];
  private readonly kids = new Set<Kid>();
  private readonly toys = new Set<Toy>();
  private toyBox!: ToyBox;
  private gate!: GardenGate;
  /** Blumen und Sandkuchen */
  garden!: Garden;
  /** Tageszeiten, Himmel, Einfärbung */
  dayCycle!: DayCycle;
  /** Wetter (Regen, Pfützen, Regenbogen) */
  weather!: Weather;
  private readonly worldStates = new Map<string, WorldState>();
  private savedWorld: Record<string, unknown> = {};

  constructor() {
    super('Playground');
  }

  create(): void {
    this.drawBackground();

    this.equipment = EQUIPMENT.map((def) => createEquipment(this, def));
    this.gate = new GardenGate(this, GARDEN_GATE.x, GARDEN_GATE.y);
    this.toyBox = new ToyBox(this, TOY_BOX.x, TOY_BOX.y);

    const save = loadSave();
    if (save) this.restore(save);
    else {
      // Allererster Start: die Standard-Wiese.
      PLACED_KIDS.forEach((k) => this.spawnKid(getCharacterDef(k.kid), k.x, k.y));
      PLACED_TOYS.forEach((t) => this.spawnToy(getToyDef(t.toy), t.x, t.y));
    }

    this.garden = new Garden(this);
    this.dayCycle = new DayCycle(this);
    this.weather = new Weather(this, this.dayCycle);

    this.setupInput();
    new AutoSave(this, () => this.snapshot());
  }

  update(): void {
    this.equipment.forEach((e) => e.update());
  }

  // --- Speichern ----------------------------------------------------------

  /** Meldet einen Weltzustand zum Mitspeichern an; ein gespeicherter Wert wird sofort geladen. */
  registerWorldState(key: string, state: WorldState): void {
    this.worldStates.set(key, state);
    if (key in this.savedWorld) state.load(this.savedWorld[key]);
  }

  private snapshot(): SaveData {
    const pos = (p: { x: number; y: number }) => ({ x: Math.round(p.x), y: Math.round(p.y) });
    const world: Record<string, unknown> = {};
    for (const [key, state] of this.worldStates) world[key] = state.save();
    return {
      version: SAVE_VERSION,
      kids: [...this.kids].map((k) => ({ id: k.def.id, ...pos(k.restPosition()) })),
      toys: [...this.toys].map((t) => ({ id: t.def.id, ...pos(t.restPosition()) })),
      world,
    };
  }

  private restore(save: SaveData): void {
    const x = (v: number) => Phaser.Math.Clamp(v, 60, GAME_WIDTH - 60);
    const y = (v: number) => Phaser.Math.Clamp(v, GROUND_MIN_Y, GROUND_MAX_Y);
    for (const k of save.kids) {
      const def = CHARACTERS.find((c) => c.id === k.id);
      if (def) this.spawnKid(def, x(k.x), y(k.y));
    }
    for (const t of save.toys) {
      const def = TOYS.find((d) => d.id === t.id);
      if (def) this.spawnToy(def, x(t.x), y(t.y));
    }
    this.savedWorld = save.world;
    for (const [key, state] of this.worldStates) if (key in this.savedWorld) state.load(this.savedWorld[key]);
  }

  // --- Spielzeuge auf der Wiese -------------------------------------------

  /** Legt ein neues Spielzeug auf die Wiese. null, wenn die Obergrenze erreicht ist. */
  spawnToy(def: ToyDef, x: number, y: number): Toy | null {
    if (this.isFull()) return null;
    const toy = new Toy(this, def, x, y);
    this.toys.add(toy);
    return toy;
  }

  /** Spielzeug zählt nicht mehr zur Wiese (z. B. weil es gerade weggeräumt wird). */
  forgetToy(toy: Toy): void {
    if (this.toys.delete(toy)) toy.notifyRemoved();
  }

  /** Liegt (x, y) in einem Sandkasten? */
  isInSandbox(x: number, y: number): boolean {
    return this.equipment.some((e) => e instanceof Sandbox && e.contains(x, y));
  }

  /** Alle Spielzeuge, die gerade auf der Wiese sind. */
  toysOnMeadow(): Toy[] {
    return [...this.toys];
  }

  /** Spielzeug verschwindet ohne Animation (z. B. geplatzter Ballon). */
  removeToy(toy: Toy): void {
    this.forgetToy(toy);
    toy.destroy();
  }

  /** Ein gezogenes Spielzeug wurde losgelassen: wegräumen oder auf die Wiese. */
  releaseToy(toy: Toy, pointer: Phaser.Input.Pointer): void {
    if (this.toyBox.accepts(pointer.x, pointer.y)) {
      this.toyBox.putAway(toy);
      return;
    }
    // Auf ein anderes Spielzeug fallen gelassen, das es aufnimmt (z. B. Schubkarre)?
    for (const other of this.toys) {
      if (other !== toy && this.dropZone(other).contains(pointer.x, pointer.y) && other.offerToy(toy)) {
        toy.handleDragEnd(pointer);
        toy.physics.stop();
        return;
      }
    }
    toy.handleDragEnd(pointer);
  }

  /** Großzügige Fläche, auf der man etwas auf einem Spielzeug fallen lassen kann. */
  private dropZone(toy: Toy): Phaser.Geom.Rectangle {
    const b = toy.getBounds();
    return new Phaser.Geom.Rectangle(b.x - 40, b.y - 60, b.width + 80, b.height + 100);
  }

  // --- Kinder auf der Wiese -----------------------------------------------

  /** Holt ein Kind auf die Wiese. null, wenn es schon da ist oder die Obergrenze erreicht ist. */
  spawnKid(def: CharacterDef, x: number, y: number): Kid | null {
    if (this.isFull() || this.hasKid(def.id as CharacterId)) return null;
    const kid = new Kid(this, def, x, y);
    this.kids.add(kid);
    this.gate?.refresh();
    return kid;
  }

  /** Alle Kinder, die gerade auf der Wiese sind. */
  kidsOnMeadow(): Kid[] {
    return [...this.kids];
  }

  hasKid(id: CharacterId): boolean {
    for (const kid of this.kids) if (kid.def.id === id) return true;
    return false;
  }

  /** Kind zählt nicht mehr zur Wiese (geht gerade nach Hause). */
  forgetKid(kid: Kid): void {
    this.kids.delete(kid);
    this.gate.refresh();
  }

  /** Ein gezogenes Kind wurde losgelassen: nach Hause, auf ein Spielgerät oder auf die Wiese. */
  releaseKid(kid: Kid, pointer: Phaser.Input.Pointer, arriving = false): void {
    kid.endDrag();
    if (this.gate.accepts(pointer.x, pointer.y)) {
      this.gate.sendHome(kid);
      return;
    }
    // Auf ein Spielzeug gezogen, das Kinder annimmt (z. B. Drachen, Ballon festhalten)?
    for (const toy of this.toys) {
      const zone = this.dropZone(toy);
      if ((zone.contains(pointer.x, pointer.y) || zone.contains(kid.x, kid.y)) && toy.offerKid(kid)) {
        // Hält das Kind nur etwas fest (Ballon), steht es auf der Wiese; sitzt es auf einem Fahrzeug, nicht.
        if (kid.mode === 'idle') kid.settle();
        return;
      }
    }
    const spot = this.equipment.find((e) => e.accepts(kid, kid.x, kid.y));
    if (spot) {
      spot.use(kid);
      return;
    }
    kid.settle(() => {
      // Neu angekommene Kinder freuen sich mit einem Hüpfer; in einer Pfütze spritzt es.
      this.weather.onKidLanded(kid);
      if (arriving) kid.hop();
    });
  }

  private isFull(): boolean {
    return this.toys.size + this.kids.size >= MAX_OBJECTS;
  }

  /** Schließt offene Leisten (Spielzeugkiste, Gartentor). */
  closeInventories(): void {
    this.toyBox?.close();
    this.gate?.close();
  }

  // --- Eingabe -------------------------------------------------------------

  private setupInput(): void {
    this.input.dragDistanceThreshold = DRAG_THRESHOLD;

    this.input.on('dragstart', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      if (obj instanceof Toy) {
        obj.handleDragStart();
        return;
      }
      if (obj instanceof Kid) obj.handleDragStart();
    });

    this.input.on(
      'drag',
      (p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
        if (obj instanceof Toy) obj.handleDrag(p, dragX, dragY);
        else if (obj instanceof Kid) obj.handleDrag(p, dragX, dragY);
      },
    );

    this.input.on('dragend', (p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      if (obj instanceof Toy) {
        this.releaseToy(obj, p);
        return;
      }
      if (obj instanceof Kid) this.releaseKid(obj, p);
    });

    // Tippen auf eine freie Stelle schließt offene Leisten.
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length === 0 && pointer.getDistance() < DRAG_THRESHOLD) this.closeInventories();
    });

    // Tippen = Finger runter und wieder hoch, ohne nennenswert zu ziehen.
    this.input.on('gameobjectup', (pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      if (pointer.getDistance() >= DRAG_THRESHOLD) return;
      const onTap: unknown = obj.getData('onTap');
      if (typeof onTap === 'function') onTap(pointer);
    });
  }

  // --- Hintergrund (Platzhalter) --------------------------------------------

  /** Zaun und Wiese. Himmel, Sonne, Mond und Wolken zeichnet der DayCycle. */
  private drawBackground(): void {
    const g = this.add.graphics().setDepth(-1000);

    // Zaun im Hinterhof
    g.fillStyle(0xc98b5a);
    g.fillRect(0, GROUND_TOP - 120, GAME_WIDTH, 120);
    g.lineStyle(4, 0xa56f45);
    for (let x = 0; x < GAME_WIDTH; x += 60) g.lineBetween(x, GROUND_TOP - 120, x, GROUND_TOP);

    // Wiese
    g.fillStyle(0x7cc96a);
    g.fillRect(0, GROUND_TOP, GAME_WIDTH, GAME_HEIGHT - GROUND_TOP);
    g.fillStyle(0x6ab85a);
    g.fillRect(0, GROUND_TOP, GAME_WIDTH, 28);

    // Blümchen (deterministisch verteilt)
    const colors = [0xffffff, 0xffd6e0, 0xfff3b0];
    for (let i = 0; i < 45; i++) {
      const x = (i * 197 + 40) % GAME_WIDTH;
      const y = GROUND_TOP + 50 + ((i * 89) % (GAME_HEIGHT - GROUND_TOP - 70));
      g.fillStyle(colors[i % colors.length]);
      g.fillCircle(x, y, 6);
    }
  }
}
