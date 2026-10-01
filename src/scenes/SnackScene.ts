import Phaser from 'phaser';
import type { CharacterDef } from '../data/characters';
import type { Outfit } from '../data/costumes';
import { compartmentX, newRound, SNACK, SNACKS, type Round, type SnackId } from '../data/snacks';
import { Kid } from '../objects/Kid';

/** Was die Wiese dem Snackbox-Spiel mitgibt. */
export interface SnackData {
  kids: { def: CharacterDef; outfit: Outfit }[];
  /** Holzschild angetippt: zurück auf die Wiese. */
  onDone(): void;
}

/** Ein Snack, der gerade gezogen wird oder auf dem Teller liegt. */
interface Snack {
  id: SnackId;
  img: Phaser.GameObjects.Image;
}

const DEPTH = { kids: 100, plate: 200, snacks: 300, box: 250, drag: 900, ui: 950 };

/**
 * Snackbox-Spiel: Zwei Kinder halten eine Zahl + Snack hoch. Aus den Fächern der Box zieht man genau
 * so viele Snacks auf den Teller, wie beide Zahlen zusammen ergeben (Addition). Stimmt die Menge,
 * freuen sich die Kinder, die Rechnung erscheint kurz und jedes Kind bekommt seine Snacks.
 * Falscher Snack oder zu viel: Kopfschütteln, nichts geht kaputt. Das Holzschild führt zurück.
 */
export class SnackScene extends Phaser.Scene {
  private params!: SnackData;
  private kids: Kid[] = [];
  private cards: Phaser.GameObjects.Container[] = [];
  private plateSnacks: Snack[] = [];
  private drags = new Map<number, Snack>();
  private round!: Round;
  private roundIndex = 0;
  private busy = false;
  private leaving = false;

  constructor() {
    super('Snack');
  }

  create(data: SnackData): void {
    this.params = data;
    this.kids = [];
    this.cards = [];
    this.plateSnacks = [];
    this.drags = new Map();
    this.roundIndex = 0;
    this.busy = false;
    this.leaving = false;

    // Töne spielt die Wiese (dort lebt der AudioContext)
    const playground = this.scene.get('Playground');
    this.events.on('sound', (e: unknown) => playground.events.emit('sound', e));

    this.add.image(0, 0, 'snack-bg').setOrigin(0);
    this.add.image(SNACK.plate.x, SNACK.plate.y, 'snack-plate').setDepth(DEPTH.plate);
    this.add.image(SNACK.box.x, SNACK.box.y, 'snack-box').setDepth(DEPTH.box);
    this.add.text(960, 300, '+', { fontFamily: 'sans-serif', fontSize: '150px', fontStyle: 'bold', color: '#ffffff', stroke: '#2d6a4f', strokeThickness: 14 }).setOrigin(0.5).setDepth(DEPTH.ui);

    // Fächer: aus jedem darf man beliebig viel herausziehen
    for (const id of SNACKS) {
      const x = compartmentX(id);
      for (let i = 0; i < 3; i++) {
        this.add.image(x - 50 + i * 50, SNACK.box.y + (i % 2) * 14 - 4, `snack-${id}`).setScale(0.8).setAngle(-12 + i * 12).setDepth(DEPTH.box + 1);
      }
      const zone = this.add.zone(x, SNACK.box.y, SNACK.box.w / SNACKS.length - 20, SNACK.box.h - 20).setInteractive({ useHandCursor: true }).setDepth(DEPTH.box + 2);
      zone.on('pointerdown', (p: Phaser.Input.Pointer) => this.take(p, id));
    }

    // Ausgang: Holzschild (großzügige Touch-Fläche)
    const E = SNACK.exit;
    this.add.image(E.x, E.y, 'snack-sign').setOrigin(0).setDepth(DEPTH.ui);
    this.add.zone(E.x - 20, E.y - 20, E.w + 60, E.h + 60).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.leave());

    // Die zwei Kinder, die Karten halten
    data.kids.slice(0, 2).forEach(({ def, outfit }, i) => {
      const spot = SNACK.kids[i];
      const kid = new Kid(this, def, spot.x, spot.y).setScale(SNACK.kidScale).setDepth(DEPTH.kids + i);
      kid.setOutfit(outfit);
      kid.setFlipX(i === 1);
      kid.setPose('armsUp', 0);
      this.input.setDraggable(kid, false);
      this.kids.push(kid);
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const s = this.drags.get(p.id);
      if (s) s.img.setPosition(p.x, p.y);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.drop(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.drop(p));

    this.startRound();
    this.cameras.main.fadeIn(350, 0, 0, 0);
  }

  // --- Runde -----------------------------------------------------------------------

  private startRound(): void {
    this.round = newRound(this.roundIndex, this.round);
    this.cards.forEach((c) => c.destroy());
    this.cards = [this.round.a, this.round.b].map((n, i) => this.makeCard(i, n));
    this.busy = false;
  }

  /** Zahlenkarte über dem Kopf des Kindes: große Zahl und der Snack darunter. */
  private makeCard(i: number, n: number): Phaser.GameObjects.Container {
    const spot = SNACK.kids[i];
    const card = this.add.container(spot.x, SNACK.cardY).setDepth(DEPTH.ui);
    const text = this.add.text(0, -55, String(n), { fontFamily: 'sans-serif', fontSize: '130px', fontStyle: 'bold', color: '#264653' }).setOrigin(0.5);
    const snack = this.add.image(0, 70, `snack-${this.round.snack}`).setScale(1.1);
    card.add([this.add.image(0, 0, 'snack-card'), text, snack]);
    card.setScale(0.1);
    this.tweens.add({ targets: card, scale: 1, duration: 320, ease: 'Back.easeOut' });
    return card;
  }

  private get total(): number {
    return this.round.a + this.round.b;
  }

  // --- Ziehen ----------------------------------------------------------------------

  private take(p: Phaser.Input.Pointer, id: SnackId): void {
    if (this.busy || this.leaving || this.drags.has(p.id)) return;
    this.events.emit('sound', { kind: 'snack-take' });
    this.grab(p, this.newSnack(id, p.x, p.y));
  }

  private newSnack(id: SnackId, x: number, y: number): Snack {
    const img = this.add.image(x, y, `snack-${id}`).setDepth(DEPTH.snacks);
    return { id, img };
  }

  private grab(p: Phaser.Input.Pointer, s: Snack): void {
    s.img.disableInteractive().setDepth(DEPTH.drag).setScale(1.15);
    this.drags.set(p.id, s);
  }

  /** Snack auf dem Teller antippen und ziehen = wieder herausnehmen. */
  private makePlateSnackDraggable(s: Snack): void {
    s.img.setInteractive({ useHandCursor: true });
    s.img.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.busy || this.leaving || this.drags.has(p.id)) return;
      this.plateSnacks = this.plateSnacks.filter((o) => o !== s);
      this.layoutPlate();
      this.grab(p, s);
    });
  }

  private drop(p: Phaser.Input.Pointer): void {
    const s = this.drags.get(p.id);
    if (!s) return;
    this.drags.delete(p.id);
    s.img.setScale(1);
    const inBox = p.y >= SNACK.box.top;
    if (inBox) {
      this.events.emit('sound', { kind: 'snack-back' });
      this.discard(s);
      this.checkWin();
      return;
    }
    if (s.id !== this.round.snack) {
      // Falscher Snack: Kopfschütteln, zurück ins Fach
      this.kids.forEach((k) => k.shakeHead());
      this.events.emit('sound', { kind: 'snack-nope' });
      this.discard(s, true);
      return;
    }
    if (this.plateSnacks.length >= SNACK.maxOnPlate) {
      this.discard(s, true);
      return;
    }
    this.plateSnacks.push(s);
    this.makePlateSnackDraggable(s);
    s.img.setDepth(DEPTH.snacks + this.plateSnacks.length);
    this.layoutPlate();
    this.events.emit('sound', { kind: 'snack-put', pitch: Math.min(this.plateSnacks.length - 1, 7) });
    if (this.plateSnacks.length > this.total) {
      // Zu viele: die Kinder schütteln den Kopf, man kann einfach einen herausnehmen
      this.kids.forEach((k) => k.shakeHead());
      this.events.emit('sound', { kind: 'snack-nope' });
    }
    this.checkWin();
  }

  /** Snack verschwindet (optional fliegt er erst ins Fach zurück). */
  private discard(s: Snack, flyBack = false): void {
    s.img.disableInteractive();
    if (!flyBack) {
      s.img.destroy();
      return;
    }
    this.tweens.add({ targets: s.img, x: compartmentX(s.id), y: SNACK.box.y, scale: 0.8, duration: 260, ease: 'Quad.easeIn', onComplete: () => s.img.destroy() });
  }

  /** Snacks in zwei Reihen auf dem Teller anordnen. */
  private layoutPlate(): void {
    const { perRow, dx, y } = SNACK.plateSlots;
    this.plateSnacks.forEach((s, i) => {
      const row = Math.floor(i / perRow);
      const inRow = Math.min(perRow, this.plateSnacks.length - row * perRow);
      const col = i % perRow;
      const x = SNACK.plate.x + (col - (inRow - 1) / 2) * dx;
      this.tweens.add({ targets: s.img, x, y: y[row], duration: 160, ease: 'Quad.easeOut' });
    });
  }

  // --- Geschafft -------------------------------------------------------------------

  private checkWin(): void {
    if (this.busy || this.plateSnacks.length !== this.total) return;
    this.busy = true;
    this.plateSnacks.forEach((s) => s.img.disableInteractive());
    this.kids.forEach((k) => k.cheer());
    this.events.emit('sound', { kind: 'snack-win' });

    const { a, b } = this.round;
    const sum = this.add
      .text(960, 560, `${a} + ${b} = ${a + b}`, { fontFamily: 'sans-serif', fontSize: '110px', fontStyle: 'bold', color: '#ffffff', stroke: '#2d6a4f', strokeThickness: 16 })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui)
      .setScale(0.2);
    this.tweens.add({ targets: sum, scale: 1, duration: 340, ease: 'Back.easeOut' });

    // Nach kurzer Pause bekommt jedes Kind seine Snacks (erst links, dann rechts)
    this.time.delayedCall(1300, () => {
      this.plateSnacks.forEach((s, i) => {
        const kid = this.kids[i < a ? 0 : 1];
        this.time.delayedCall(i * 150, () => {
          const hand = kid.handPoint();
          this.tweens.add({
            targets: s.img,
            x: hand.x,
            y: hand.y - 60,
            scale: 0.4,
            duration: 380,
            ease: 'Quad.easeInOut',
            onComplete: () => {
              s.img.destroy();
              this.events.emit('sound', { kind: 'yum' });
              kid.giggle();
            },
          });
        });
      });
      this.plateSnacks = [];
      this.tweens.add({ targets: sum, alpha: 0, delay: 900, duration: 400, onComplete: () => sum.destroy() });
      this.time.delayedCall(this.total * 150 + 1500, () => {
        if (this.leaving) return;
        this.roundIndex++;
        this.startRound();
      });
    });
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.params.onDone());
  }
}
