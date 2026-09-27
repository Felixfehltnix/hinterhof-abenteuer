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
import { createEquipment, type Equipment } from '../objects/Equipment';
import { GardenGate } from '../objects/GardenGate';
import { Kid } from '../objects/Kid';
import { ToyBox } from '../objects/ToyBox';
import { Toy } from '../objects/toys/Toy';
import { AutoSave } from '../save/AutoSave';
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
    this.toys.delete(toy);
  }

  /** Ein gezogenes Spielzeug wurde losgelassen: wegräumen oder auf die Wiese. */
  releaseToy(toy: Toy, pointer: Phaser.Input.Pointer): void {
    if (this.toyBox.accepts(pointer.x, pointer.y)) this.toyBox.putAway(toy);
    else toy.handleDragEnd(pointer);
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
    const spot = this.equipment.find((e) => e.accepts(kid, kid.x, kid.y));
    if (spot) {
      spot.use(kid);
      return;
    }
    // Neu angekommene Kinder freuen sich mit einem Hüpfer.
    kid.settle(arriving ? () => kid.hop() : undefined);
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
      if (typeof onTap === 'function') onTap();
    });
  }

  // --- Hintergrund (Platzhalter) --------------------------------------------

  private drawBackground(): void {
    const g = this.add.graphics().setDepth(-1000);

    // Himmel
    g.fillGradientStyle(0x7ec8ff, 0x7ec8ff, 0xd6f0ff, 0xd6f0ff, 1);
    g.fillRect(0, 0, GAME_WIDTH, GROUND_TOP);

    // Sonne
    g.fillStyle(0xffe066);
    g.fillCircle(1720, 140, 80);

    // Wolken
    g.fillStyle(0xf4faff);
    for (const [x, y] of [
      [300, 150],
      [900, 110],
      [1350, 220],
    ]) {
      g.fillCircle(x, y, 45);
      g.fillCircle(x + 50, y - 20, 55);
      g.fillCircle(x + 110, y, 45);
      g.fillRect(x, y, 110, 45);
    }

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
