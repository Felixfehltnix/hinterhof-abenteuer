import Phaser from 'phaser';
import type { CharacterDef } from '../data/characters';
import { COSTUMES, costumeKey, SLOTS, type CostumeId, type Outfit, type Slot } from '../data/costumes';
import { KID_FRAME } from '../data/poses';
import { Kid } from '../objects/Kid';
import { COSTUME_ART, layerLayout } from './placeholders/costumes';
import { ROOM } from './placeholders/dressup';

/** Was die Wiese dem Ankleide-Spiel mitgibt. */
export interface DressUpData {
  def: CharacterDef;
  outfit: Outfit;
  /** Jede Änderung sofort zurückmelden (wird gleich gespeichert). */
  onChange(outfit: Outfit): void;
  /** Ausgang angetippt: zurück auf die Wiese. */
  onDone(): void;
}

interface Item {
  slot: Slot;
  costume: CostumeId;
  box: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Image;
  home: { x: number; y: number };
}

// Wie groß ein Teil am Kleiderständer höchstens ist (px).
const ITEM_W = 86;
const ITEM_H = 150;
const DRAG_THRESHOLD = 12;

/**
 * Ankleide-Spiel in der Pappkiste (#70): Das Kind steht vor dem großen Spiegel, rechts hängen am
 * Kleiderständer 10 Verkleidungen in 4 Reihen (Kopf, Oberteil, Hose/Rock, Schuhe).
 * Teil antippen oder aufs Kind ziehen = anziehen (nochmal antippen = ausziehen), am Kind ein Teil
 * antippen = ausziehen. Tür links antippen = zurück auf die Wiese. Kein Text.
 */
export class DressUpScene extends Phaser.Scene {
  private params!: DressUpData;
  private outfit: Outfit = {};
  private kid!: Kid;
  private mirrorKid!: Kid;
  private items: Item[] = [];
  private leaving = false;

  constructor() {
    super('DressUp');
  }

  create(data: DressUpData): void {
    this.params = data;
    this.outfit = { ...data.outfit };
    this.items = [];
    this.leaving = false;
    const { mirror: M, kid: K, door: D } = ROOM;

    // Töne spielt die Wiese (dort lebt der AudioContext)
    const playground = this.scene.get('Playground');
    this.events.on('sound', (e: unknown) => playground.events.emit('sound', e));

    this.add.image(0, 0, 'dressup-room').setOrigin(0);

    // Spiegelbild: das Kind noch einmal, gespiegelt, etwas bläulich, nur im Glas zu sehen
    this.mirrorKid = new Kid(this, data.def, M.x + M.w / 2, M.y + M.h - 24).setScale(1.35).setFlipX(true).setTint(0xdcecff);
    this.mirrorKid.disableInteractive();
    const glass = this.make.graphics({}, false);
    glass.fillStyle(0xffffff);
    glass.fillRoundedRect(M.x, M.y, M.w, M.h, 44);
    this.mirrorKid.setMask(glass.createGeometryMask());
    const shine = this.add.graphics().setDepth(this.mirrorKid.depth + 1);
    shine.fillStyle(0xffffff, 0.35);
    shine.fillPoints([new Phaser.Math.Vector2(M.x + 40, M.y + 120), new Phaser.Math.Vector2(M.x + 150, M.y + 30), new Phaser.Math.Vector2(M.x + 190, M.y + 30), new Phaser.Math.Vector2(M.x + 40, M.y + 180)], true);
    shine.fillPoints([new Phaser.Math.Vector2(M.x + 40, M.y + 240), new Phaser.Math.Vector2(M.x + 260, M.y + 40), new Phaser.Math.Vector2(M.x + 280, M.y + 40), new Phaser.Math.Vector2(M.x + 40, M.y + 262)], true);

    // Das Kind groß vor dem Spiegel
    this.kid = new Kid(this, data.def, K.x, K.y).setScale(K.scale).setDepth(K.y);
    this.input.setDraggable(this.kid, false);
    this.kid.setData('onTap', (p: Phaser.Input.Pointer) => this.tapKid(p));
    this.kid.setOutfit(this.outfit);
    this.mirrorKid.setOutfit(this.outfit);

    this.buildRack();

    // Ausgang: die Tür links (großzügige Touch-Fläche)
    const door = this.add.zone(D.x - 20, D.y - 30, D.w + 40, D.h + 60).setOrigin(0);
    door.setInteractive({ useHandCursor: true });
    door.setData('onTap', () => this.leave());
    // Die Tür lädt zum Hinausgehen ein: das Sonnenlicht draußen pulsiert leicht
    const light = this.add.rectangle(D.x, D.y + 60, D.w, D.h - 60, 0xffffff, 0).setOrigin(0).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: light, fillAlpha: 0.18, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.setupInput();
    this.cameras.main.fadeIn(350, 0, 0, 0);
    this.kid.cheer();
  }

  // --- Kleiderständer ----------------------------------------------------------------

  private buildRack(): void {
    const R = ROOM.rack;
    SLOTS.forEach((slot, row) => {
      COSTUMES.forEach((costume, i) => {
        const x = R.left + (i + 0.5) * R.cell;
        const y = R.rows[row];
        if (slot === 'top' || slot === 'bottom') this.add.image(x, y - 62, 'dressup-hanger').setScale(0.9);
        const glow = this.add.image(x, y, 'dressup-glow').setScale(1.4).setVisible(false);
        const box = this.itemIcon(slot, costume);
        box.setPosition(x, y);
        box.setSize(R.cell, ITEM_H + 20);
        box.setInteractive(new Phaser.Geom.Rectangle(0, 0, R.cell, ITEM_H + 20), Phaser.Geom.Rectangle.Contains);
        this.input.setDraggable(box);
        const item: Item = { slot, costume, box, glow, home: { x, y } };
        box.setData('onTap', () => this.toggle(item));
        box.setData('item', item);
        this.items.push(item);
      });
    });
    this.refreshGlow();
  }

  /** Ein Teil als flaches Bild am Ständer, zusammengesetzt aus seinen Ebenen. */
  private itemIcon(slot: Slot, costume: CostumeId): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0);
    const img = (layer: string, x: number, y: number, angle = 0, originY?: number) => {
      const key = costumeKey(costume, slot, layer);
      if (!this.textures.exists(key)) return;
      const art = COSTUME_ART[costume][slot].find((a) => a.layer === layer);
      if (!art) return;
      const lay = layerLayout(art);
      c.add(this.add.image(x, y, key).setOrigin(lay.originX, originY ?? lay.originY).setAngle(angle));
    };
    const layers = new Set(COSTUME_ART[costume][slot].map((a) => a.layer));
    // Arme bzw. Beine seitlich neben dem Rumpf, wie auf einen Tisch gelegt
    if (layers.has('back')) img('back', 0, 0);
    if (slot === 'top') {
      img('arm', -44, -74, 24);
      img('arm', 44, -74, -24);
    }
    if (slot === 'bottom' || slot === 'feet') {
      img('leg', -15, 0);
      img('leg', 15, 0);
    }
    if (layers.has('body')) img('body', 0, 0);
    if (layers.has('head')) img('head', 0, 0);
    // Einpassen: auf die sichtbare Fläche zentrieren und auf Platzgröße bringen
    const b = c.getBounds();
    const cx = b.centerX;
    const cy = b.centerY;
    c.each((child: Phaser.GameObjects.Image) => child.setPosition(child.x - cx, child.y - cy));
    c.setScale(Math.min(ITEM_W / b.width, ITEM_H / b.height, 0.9));
    return c;
  }

  private refreshGlow(): void {
    for (const it of this.items) it.glow.setVisible(this.outfit[it.slot] === it.costume);
  }

  // --- Anziehen und Ausziehen ------------------------------------------------------------

  private toggle(item: Item): void {
    if (this.outfit[item.slot] === item.costume) this.takeOff(item.slot);
    else this.wear(item.slot, item.costume);
  }

  private wear(slot: Slot, costume: CostumeId): void {
    this.outfit[slot] = costume;
    this.changed();
    this.sparkle(slot);
    this.kid.cheer();
    this.mirrorKid.cheer();
    this.events.emit('sound', { kind: 'pop' });
  }

  private takeOff(slot: Slot): void {
    if (!this.outfit[slot]) {
      this.kid.giggle();
      return;
    }
    delete this.outfit[slot];
    this.changed();
    this.sparkle(slot);
    this.kid.giggle();
    this.mirrorKid.giggle();
    this.events.emit('sound', { kind: 'bubble' });
  }

  private changed(): void {
    this.kid.setOutfit(this.outfit);
    this.mirrorKid.setOutfit(this.outfit);
    this.refreshGlow();
    this.params.onChange({ ...this.outfit });
  }

  /** Welches Teil am Kind liegt unter dem Finger? (nach Höhe: Kopf, Oberteil, Hose, Schuhe) */
  private slotAt(y: number): Slot {
    const h = KID_FRAME.height * this.params.def.size * this.kid.scaleY;
    const r = (this.kid.y - y) / h;
    if (r < 0.12) return 'feet';
    if (r < 0.44) return 'bottom';
    if (r < 0.68) return 'top';
    return 'head';
  }

  private tapKid(p: Phaser.Input.Pointer): void {
    this.takeOff(this.slotAt(p.y));
  }

  /** Sternchen an der Stelle, die sich geändert hat. */
  private sparkle(slot: Slot): void {
    const h = KID_FRAME.height * this.params.def.size * this.kid.scaleY;
    const at: Record<Slot, number> = { head: 0.86, top: 0.56, bottom: 0.3, feet: 0.05 };
    const y = this.kid.y - h * at[slot];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const s = this.add.image(this.kid.x, y, 'star').setDepth(this.kid.depth + 1).setScale(0.8);
      this.tweens.add({
        targets: s,
        x: this.kid.x + Math.cos(a) * 150,
        y: y + Math.sin(a) * 110,
        alpha: 0,
        scale: 0.3,
        angle: 180,
        duration: 600,
        ease: 'Quad.easeOut',
        onComplete: () => s.destroy(),
      });
    }
  }

  // --- Eingabe -------------------------------------------------------------------------

  private setupInput(): void {
    this.input.dragDistanceThreshold = DRAG_THRESHOLD;
    this.input.on('gameobjectup', (pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      if (pointer.getDistance() >= DRAG_THRESHOLD) return;
      const onTap: unknown = obj.getData('onTap');
      if (typeof onTap === 'function') onTap(pointer);
    });
    this.input.on('dragstart', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Container) => {
      obj.setDepth(5000);
      this.tweens.add({ targets: obj, scale: obj.scale * 1.3, duration: 120 });
    });
    this.input.on('drag', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Container, x: number, y: number) => obj.setPosition(x, y));
    this.input.on('dragend', (p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Container) => {
      const item = obj.getData('item') as Item | undefined;
      if (!item) return;
      // Aufs Kind fallen gelassen (großzügig): anziehen
      const b = this.kid.getBounds();
      Phaser.Geom.Rectangle.Inflate(b, 60, 40);
      if (b.contains(p.x, p.y)) this.wear(item.slot, item.costume);
      this.tweens.add({ targets: obj, x: item.home.x, y: item.home.y, scale: obj.scale / 1.3, duration: 260, ease: 'Sine.easeOut', onComplete: () => obj.setDepth(0) });
    });
  }

  /** Tür angetippt: Das Kind geht zur Tür, dann zurück auf die Wiese. */
  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    const D = ROOM.door;
    this.kid.setActivity('walk');
    this.tweens.add({ targets: this.kid, x: D.x + D.w / 2, y: D.y + D.h, scale: 1.2, duration: 700, ease: 'Sine.easeIn' });
    this.time.delayedCall(450, () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.params.onDone());
    });
  }
}
