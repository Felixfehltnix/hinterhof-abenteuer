import Phaser from 'phaser';
import {
  DEPTH_DRAGGING,
  DRAG_THRESHOLD,
  GAME_HEIGHT,
  GAME_WIDTH,
  GROUND_MAX_Y,
  GROUND_MIN_Y,
  GROUND_TOP,
  MAX_OBJECTS,
} from '../config';
import { CHARACTERS } from '../data/characters';
import { EQUIPMENT, PLACED_TOYS, TOY_BOX } from '../data/playground';
import { getToyDef, type ToyDef } from '../data/toys';
import { createEquipment, type Equipment } from '../objects/Equipment';
import { Kid } from '../objects/Kid';
import { ToyBox } from '../objects/ToyBox';
import { Toy } from '../objects/toys/Toy';

export class PlaygroundScene extends Phaser.Scene {
  private equipment: Equipment[] = [];
  private kids: Kid[] = [];
  private readonly toys = new Set<Toy>();
  private toyBox!: ToyBox;

  constructor() {
    super('Playground');
  }

  create(): void {
    this.drawBackground();

    this.equipment = EQUIPMENT.map((def) => createEquipment(this, def));
    this.kids = CHARACTERS.map((def) => new Kid(this, def));
    PLACED_TOYS.forEach((t) => this.spawnToy(getToyDef(t.toy), t.x, t.y));
    this.toyBox = new ToyBox(this, TOY_BOX.x, TOY_BOX.y);

    this.setupInput();
  }

  update(): void {
    this.equipment.forEach((e) => e.update());
  }

  // --- Spielzeuge auf der Wiese -------------------------------------------

  /** Legt ein neues Spielzeug auf die Wiese. null, wenn die Obergrenze erreicht ist. */
  spawnToy(def: ToyDef, x: number, y: number): Toy | null {
    if (this.toys.size + this.kids.length >= MAX_OBJECTS) return null;
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

  /** Schließt offene Leisten (Spielzeugkiste, Gartentor). */
  closeInventories(): void {
    this.toyBox?.close();
  }

  // --- Eingabe -------------------------------------------------------------

  private setupInput(): void {
    this.input.dragDistanceThreshold = DRAG_THRESHOLD;

    this.input.on('dragstart', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      if (obj instanceof Toy) {
        obj.handleDragStart();
        return;
      }
      if (!(obj instanceof Kid)) return;
      this.tweens.killTweensOf(obj);
      obj.seatedOn?.unseat(obj);
      obj.mode = 'dragging';
      obj.setRotation(0).setScale(1.08).setDepth(DEPTH_DRAGGING);
    });

    this.input.on(
      'drag',
      (p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
        if (obj instanceof Toy) obj.handleDrag(p, dragX, dragY);
        else if (obj instanceof Kid) obj.setPosition(dragX, dragY);
      },
    );

    this.input.on('dragend', (p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      if (obj instanceof Toy) {
        this.releaseToy(obj, p);
        return;
      }
      if (!(obj instanceof Kid)) return;
      obj.setScale(1);
      obj.mode = 'idle';
      const spot = this.equipment.find((e) => e.accepts(obj, obj.x, obj.y));
      if (spot) {
        spot.use(obj);
        return;
      }
      this.settle(obj);
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

  /** Lässt ein Kind auf die Wiese fallen, falls es in der Luft losgelassen wurde. */
  private settle(obj: Kid): void {
    obj.x = Phaser.Math.Clamp(obj.x, 60, GAME_WIDTH - 60);
    const targetY = Phaser.Math.Clamp(obj.y, GROUND_MIN_Y, GROUND_MAX_Y);

    if (obj.y >= targetY) {
      obj.y = targetY;
      obj.setDepth(obj.y);
      return;
    }

    const fall = targetY - obj.y;
    this.tweens.add({
      targets: obj,
      y: targetY,
      duration: 250 + fall * 0.8,
      ease: 'Bounce.easeOut',
      onUpdate: () => {
        obj.setDepth(obj.y);
      },
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
