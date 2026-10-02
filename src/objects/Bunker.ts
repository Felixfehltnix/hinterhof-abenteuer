import Phaser from 'phaser';
import { GROUND_MAX_Y, GROUND_MIN_Y } from '../config';
import { BUNKER } from '../data/bunker';
import { BUNKER_FRAME_SIZE } from '../scenes/placeholders/bunker';
import type { PlaygroundScene } from '../scenes/PlaygroundScene';
import { sandSpray } from './Garden';
import type { Kid } from './Kid';
import { Toy } from './toys/Toy';

const DIRT = 0x8d6240;
// Flache Dinge auf dem Boden liegen hinter allem, was darauf steht: Tiefe = hintere Kante.
const FLAT_DEPTH = -40;

/** Ein Kind buddelt gerade. */
interface Dig {
  kid: Kid;
  shovel: Toy;
  x: number;
  y: number;
  /** Blickrichtung des Kindes (1 = rechts). */
  dir: number;
  hole: Phaser.GameObjects.Image;
  pile: Phaser.GameObjects.Image;
  elapsed: number;
  scoops: number;
  onGrab: () => void;
}

interface Door {
  x: number;
  y: number;
  dir: number;
  lid: Phaser.GameObjects.Image;
  wheel: Phaser.GameObjects.Image;
  /** Aufgeschütteter Erdhaufen daneben. */
  pile?: Phaser.GameObjects.Image;
}

/**
 * Bunker unter der Wiese: Ein Kind mit Schaufel, weit links im Gras abgestellt, buddelt los und
 * findet eine Stahlluke. Antippen = das Handrad dreht sich, die Luke klappert (bleibt noch zu –
 * die Unterwelt dahinter kommt später). Gespeichert als Weltzustand „bunker“.
 */
export class Bunker {
  private door?: Door;
  private readonly digs = new Set<Dig>();

  constructor(private readonly scene: PlaygroundScene) {
    scene.registerWorldState('bunker', {
      save: () => (this.door ? { x: Math.round(this.door.x), y: Math.round(this.door.y), dir: this.door.dir } : null),
      load: (value) => this.load(value),
    });
    scene.events.on(Phaser.Scenes.Events.UPDATE, (_t: number, delta: number) => this.update(delta));
  }

  /** Wurde der Eingang schon gefunden? */
  get found(): boolean {
    return this.door !== undefined;
  }

  /** Ein Kind wurde auf der Wiese abgestellt: Hält es eine Schaufel und steht weit links im Gras, buddelt es. */
  onKidLanded(kid: Kid): void {
    const shovel = kid.holding;
    if (!(shovel instanceof Toy) || !shovel.def.behaviors.includes('dig')) return;
    if (kid.mode !== 'idle' || kid.x < BUNKER.zone.left || kid.x > BUNKER.zone.right) return;
    if ([...this.digs].some((d) => d.kid === kid)) return;
    const dir = kid.flipX ? -1 : 1;
    const x = Phaser.Math.Clamp(kid.x + dir * BUNKER.reach, BUNKER.zone.left, BUNKER.zone.right);
    const y = Phaser.Math.Clamp(kid.y - BUNKER.behind, GROUND_MIN_Y + 30, GROUND_MAX_Y - 30);
    const near = (p: { x: number; y: number }) => Math.hypot(p.x - x, (p.y - y) * 2) < BUNKER.keepAway;
    if ((this.door && near(this.door)) || [...this.digs].some(near)) return;
    if (this.scene.isInSandbox(x, y)) return;

    const hole = this.scene.add.image(x, y, 'dig-hole').setDepth(y + FLAT_DEPTH).setScale(0.15);
    const pile = this.scene.add
      .image(x + dir * BUNKER.pileOffset, y + 20, 'dirt-pile')
      .setOrigin(0.5, 1)
      .setDepth(y + 20)
      .setScale(0.1);
    const dig: Dig = { kid, shovel, x, y, dir, hole, pile, elapsed: 0, scoops: 0, onGrab: () => this.stop(dig, false) };
    kid.once('grabbed', dig.onGrab);
    this.digs.add(dig);
  }

  private update(delta: number): void {
    for (const dig of this.digs) {
      const { kid, shovel } = dig;
      if (!kid.active || kid.mode !== 'idle' || kid.holding !== shovel) {
        this.stop(dig, false);
        continue;
      }
      dig.elapsed += delta;
      const phase = (dig.elapsed / BUNKER.scoopMs) * Math.PI * 2;
      const scoop = Math.sin(phase);
      kid.setActivity('dig', { scoop });
      shovel.handTilt = 22 * scoop;
      // Bei jedem Schaufelstich fliegt Erde Richtung Haufen
      const scoops = Math.floor(dig.elapsed / BUNKER.scoopMs + 0.25);
      if (scoops > dig.scoops) {
        dig.scoops = scoops;
        sandSpray(this.scene, dig.x + dig.dir * 30, dig.y - 10, 5, DIRT);
        this.scene.events.emit('sound', { kind: 'dig', x: dig.x });
      }
      const p = Math.min(1, dig.elapsed / BUNKER.digMs);
      dig.hole.setScale(0.15 + 0.85 * p);
      dig.pile.setScale(0.1 + 0.9 * p);
      if (p >= 1) this.stop(dig, true);
    }
  }

  /** Buddeln endet: fertig (Fund oder zuschütten) oder abgebrochen (Kind hochgehoben, Schaufel weg). */
  private stop(dig: Dig, done: boolean): void {
    if (!this.digs.delete(dig)) return;
    const { kid, shovel } = dig;
    kid.off('grabbed', dig.onGrab);
    if (kid.active && kid.mode === 'idle') kid.setActivity('idle');
    shovel.handTilt = 0;

    if (done && !this.door) {
      this.reveal(dig.x, dig.y, dig.dir, true);
      dig.hole.destroy();
      this.door!.pile = dig.pile;
      this.scene.time.delayedCall(350, () => kid.active && kid.cheer());
      return;
    }
    // Ohne Fund (oder abgebrochen) schüttet sich das Loch wieder zu
    this.scene.tweens.add({
      targets: [dig.hole, dig.pile],
      scale: 0,
      alpha: 0,
      delay: done ? BUNKER.refillMs : 0,
      duration: 500,
      ease: 'Quad.easeIn',
      onComplete: () => {
        dig.hole.destroy();
        dig.pile.destroy();
      },
    });
  }

  /** Der Eingang erscheint (animate: frisch ausgegraben). */
  private reveal(x: number, y: number, dir: number, animate: boolean): void {
    const depth = y + FLAT_DEPTH;
    const frame = this.scene.add.image(x, y, 'bunker-frame').setOrigin(0.5, 0.55).setDepth(depth);
    const lid = this.scene.add.image(x, y + 6, 'bunker-lid').setDepth(depth + 0.1);
    const wheel = this.scene.add.image(x, y + 2, 'bunker-wheel').setDepth(depth + 0.2);
    this.door = { x, y, dir, lid, wheel };
    if (!animate) {
      this.door.pile = this.scene.add
        .image(x + dir * BUNKER.pileOffset, y + 20, 'dirt-pile')
        .setOrigin(0.5, 1)
        .setDepth(y + 20);
    }

    const pad = 30;
    frame.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-pad, -pad, BUNKER_FRAME_SIZE.width + 2 * pad, BUNKER_FRAME_SIZE.height + 2 * pad),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    // Liegt flach am Boden: Kinder und Spielzeug darauf gehen beim Antippen vor.
    frame.setData('scenery', true);
    frame.setData('onTap', () => this.rattle());

    if (!animate) return;
    for (const img of [frame, lid, wheel]) {
      const sy = img.scaleY;
      img.setScale(1, 0).setAlpha(0);
      this.scene.tweens.add({ targets: img, scaleY: sy, alpha: 1, duration: 500, ease: 'Back.easeOut' });
    }
    sandSpray(this.scene, x, y - 10, 16, DIRT);
    this.scene.events.emit('sound', { kind: 'bunker-found', x });
  }

  /** Antippen: Handrad dreht sich, die Luke hebt sich einen Spalt und fällt scheppernd zu. */
  private rattle(): void {
    const door = this.door;
    if (!door || this.scene.tweens.isTweening(door.lid)) return;
    this.scene.tweens.add({ targets: door.wheel, scaleX: -1, duration: 160, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
    this.scene.tweens.add({
      targets: [door.lid, door.wheel],
      y: '-=12',
      angle: 3,
      delay: 250,
      duration: 180,
      yoyo: true,
      ease: 'Quad.easeOut',
      onYoyo: () => this.scene.events.emit('sound', { kind: 'hatch', x: door.x }),
      onComplete: () => {
        door.lid.setAngle(0);
        door.wheel.setAngle(0);
        sandSpray(this.scene, door.x, door.y, 4, 0xbdbdb5);
      },
    });
  }

  private load(value: unknown): void {
    if (typeof value !== 'object' || value === null || this.door) return;
    const v = value as { x?: unknown; y?: unknown; dir?: unknown };
    if (typeof v.x !== 'number' || typeof v.y !== 'number' || !Number.isFinite(v.x) || !Number.isFinite(v.y)) return;
    const x = Phaser.Math.Clamp(v.x, BUNKER.zone.left, BUNKER.zone.right);
    const y = Phaser.Math.Clamp(v.y, GROUND_MIN_Y + 30, GROUND_MAX_Y - 30);
    this.reveal(x, y, v.dir === -1 ? -1 : 1, false);
  }
}
