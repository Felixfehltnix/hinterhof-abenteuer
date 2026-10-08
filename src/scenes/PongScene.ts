import Phaser from 'phaser';
import type { CharacterDef } from '../data/characters';
import type { Outfit } from '../data/costumes';
import { AI, BALL, KIDS, LAYOUT, PADDLE, RALLY, STARS_MAX, TABLE, type PongMode } from '../data/pong';
import { Kid } from '../objects/Kid';
import { PADDLE_ORIGIN_X, TABLE_PAD } from './placeholders/pong';

/** Was die Wiese dem Tischtennis mitgibt: die zwei Kinder an der Platte. */
export interface PongData {
  kids: { def: CharacterDef; outfit: Outfit }[];
  /** Holzschild angetippt: zurück auf die Wiese. */
  onDone(): void;
}

/** Links (−1) oder rechts (1). */
type Side = -1 | 1;

interface Paddle {
  side: Side;
  y: number;
  /** Wohin der Finger (oder der Computer) den Schläger haben will. */
  target: number;
  img: Phaser.GameObjects.Image;
  kid: Kid;
  /** Finger, der den Schläger führt. */
  pointer?: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  live: boolean;
  /** Flugbogen: von wo nach wo, aufgesetzt? */
  fromX: number;
  toX: number;
  bounced: boolean;
  /** Treffer mit diesem Ball (macht ihn schneller). */
  hits: number;
  img: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
}

const DEPTH = { table: 10, shadow: 20, kids: 30, paddles: 40, ball: 50, ui: 100, overlay: 200 };
const TOP = TABLE.y - TABLE.h / 2;
const BOTTOM = TABLE.y + TABLE.h / 2;

const paddleX = (side: Side) => TABLE.x + side * (TABLE.w / 2 + PADDLE.inset);

/**
 * Tischtennis (Pong, #90): Platte von oben, an jedem Ende ein Kind mit Schläger. Finger hoch und runter
 * = Schläger führen. Allein spielt rechts der Computer mit (gutmütig), zu zweit hat jeder eine
 * Bildschirmhälfte. Ein Ball, der vorbeigeht, kommt einfach neu; Ballwechsel werden mit kleinen
 * Bällen oben gezählt, alle `RALLY` Treffer gibt es einen goldenen Stern. Kein Text, kein Verlieren.
 */
export class PongScene extends Phaser.Scene {
  private params!: PongData;
  private mode?: PongMode;
  private paddles: Paddle[] = [];
  private ball!: Ball;
  private rally = 0;
  private rallyIcons: Phaser.GameObjects.Image[] = [];
  private stars: Phaser.GameObjects.Image[] = [];
  private aiError = 0;
  private serveTo: Side = -1;
  private choice: Phaser.GameObjects.GameObject[] = [];
  private switches: { mode: PongMode; view: Phaser.GameObjects.Container }[] = [];
  private leaving = false;

  constructor() {
    super('Pong');
  }

  create(data: PongData): void {
    this.params = data;
    this.mode = undefined;
    this.paddles = [];
    this.rally = 0;
    this.rallyIcons = [];
    this.stars = [];
    this.choice = [];
    this.switches = [];
    this.serveTo = -1;
    this.leaving = false;

    // Töne spielt die Wiese (dort lebt der AudioContext)
    const playground = this.scene.get('Playground');
    this.events.off('sound');
    this.events.on('sound', (e: unknown) => playground.events.emit('sound', e));

    this.add.image(0, 0, 'pong-bg').setOrigin(0);
    this.add.image(TABLE.x - TABLE.w / 2 - TABLE_PAD, TOP - TABLE_PAD, 'pong-table').setOrigin(0).setDepth(DEPTH.table);

    // Die zwei Kinder mit ihren Schlägern (links rot, rechts schwarz)
    ([-1, 1] as Side[]).forEach((side, i) => {
      const { def, outfit } = data.kids[i];
      const y = TABLE.y;
      const kid = new Kid(this, def, paddleX(side) + side * KIDS.behind, y + KIDS.feet).setScale(KIDS.scale).setDepth(DEPTH.kids);
      kid.setOutfit(outfit);
      kid.setFlipX(side === 1);
      this.input.setDraggable(kid, false);
      kid.disableInteractive();
      const img = this.add
        .image(paddleX(side), y, side === -1 ? 'pong-racket-red' : 'pong-racket-black')
        .setOrigin(PADDLE_ORIGIN_X, 0.5)
        .setAngle(side === -1 ? 180 : 0)
        .setDepth(DEPTH.paddles);
      this.paddles.push({ side, y, target: y, img, kid });
    });

    const shadow = this.add.image(TABLE.x, TABLE.y, 'pong-shadow').setDepth(DEPTH.shadow).setVisible(false);
    const img = this.add.image(TABLE.x, TABLE.y, 'pong-ball').setDepth(DEPTH.ball).setVisible(false);
    this.ball = { x: TABLE.x, y: TABLE.y, vx: 0, vy: 0, live: false, fromX: TABLE.x, toX: TABLE.x, bounced: false, hits: 0, img, shadow };

    // Ausgang: Holzschild (großzügige Touch-Fläche)
    const E = LAYOUT.exit;
    this.add.image(E.x, E.y, 'chalk-sign').setOrigin(0).setDepth(DEPTH.ui);
    this.add
      .zone(E.x - 20, E.y - 20, E.w + 60, E.h + 60)
      .setOrigin(0)
      .setDepth(DEPTH.overlay + 1)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.leave());

    this.buildSwitches();
    this.showChoice();
    this.setupInput();
    this.cameras.main.fadeIn(350, 0, 0, 0);
  }

  // --- Auswahl 1P / 2P ------------------------------------------------------------------

  /** Knopf mit Porträts: 1P = das linke Kind allein, 2P = beide Kinder. */
  private modeButton(mode: PongMode, x: number, y: number, size: number, key: string): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    c.add(this.add.image(0, 0, key));
    const ids = this.params.kids.slice(0, mode).map((k) => k.def.id);
    const scale = (size / 130) * (mode === 1 ? 0.62 : 0.42);
    ids.forEach((id, i) => {
      const dx = mode === 1 ? 0 : (i === 0 ? -1 : 1) * size * 0.2;
      c.add(this.add.image(dx, 0, `portrait-${id}`).setScale(scale));
    });
    return c;
  }

  /** Beim Start: zwei große Knöpfe über der abgedunkelten Platte. */
  private showChoice(): void {
    const { y, gap, size } = LAYOUT.choice;
    const dim = this.add.rectangle(0, 0, 1920, 1080, 0x000000, 0.35).setOrigin(0).setDepth(DEPTH.overlay);
    this.choice.push(dim);
    ([1, 2] as PongMode[]).forEach((mode, i) => {
      const view = this.modeButton(mode, TABLE.x + (i === 0 ? -1 : 1) * (gap / 2), y, size, 'pong-mode-big').setDepth(DEPTH.overlay + 1);
      view.setScale(0.2);
      this.tweens.add({ targets: view, scale: 1, duration: 380, delay: 150 + i * 120, ease: 'Back.easeOut' });
      this.tweens.add({ targets: view, angle: { from: -3, to: 3 }, duration: 900 + i * 150, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      view.setData('mode', mode);
      this.choice.push(view);
    });
  }

  /** Klein unten in der Mitte: jederzeit umschalten. */
  private buildSwitches(): void {
    const { y, gap, size } = LAYOUT.switch;
    ([1, 2] as PongMode[]).forEach((mode, i) => {
      const view = this.modeButton(mode, TABLE.x + (i === 0 ? -1 : 1) * (gap / 2), y, size, 'pong-mode-small').setDepth(DEPTH.ui);
      this.switches.push({ mode, view });
    });
    this.updateSwitches();
  }

  private updateSwitches(): void {
    for (const s of this.switches) {
      const on = s.mode === this.mode;
      s.view.setScale(on ? 1.1 : 0.85).setAlpha(this.mode === undefined ? 0 : on ? 1 : 0.75);
    }
  }

  private setMode(mode: PongMode): void {
    const first = this.mode === undefined;
    if (mode === this.mode) return;
    this.mode = mode;
    for (const p of this.paddles) p.pointer = undefined;
    this.events.emit('sound', { kind: 'click' });
    this.updateSwitches();
    if (first) {
      // Auswahl verschwindet, dann kommt der erste Ball
      this.tweens.add({ targets: this.choice, alpha: 0, duration: 250, onComplete: () => this.choice.forEach((o) => o.destroy()) });
      this.choice = [];
      this.time.delayedCall(400, () => this.serve());
    }
  }

  // --- Eingabe -----------------------------------------------------------------------

  private setupInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.leaving) return;
      if (this.mode === undefined) {
        const { y, gap, size } = LAYOUT.choice;
        ([1, 2] as PongMode[]).forEach((mode, i) => {
          const x = TABLE.x + (i === 0 ? -1 : 1) * (gap / 2);
          if (Phaser.Math.Distance.Between(p.x, p.y, x, y) < size / 2 + 20) this.setMode(mode);
        });
        return;
      }
      const sw = this.switches.find((s) => Phaser.Math.Distance.Between(p.x, p.y, s.view.x, s.view.y) < LAYOUT.switch.size / 2 + 10);
      if (sw) {
        this.setMode(sw.mode);
        return;
      }
      // Allein: jeder Finger führt den linken Schläger. Zu zweit: die Bildschirmhälfte entscheidet.
      const side: Side = this.mode === 1 || p.x < TABLE.x ? -1 : 1;
      const paddle = this.paddles.find((q) => q.side === side)!;
      paddle.pointer = p.id;
      paddle.target = p.y;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const paddle = this.paddles.find((q) => q.pointer === p.id);
      if (paddle && p.isDown) paddle.target = p.y;
    });
    const up = (p: Phaser.Input.Pointer) => {
      for (const q of this.paddles) if (q.pointer === p.id) q.pointer = undefined;
    };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);
  }

  /** Spielt der Computer diesen Schläger? */
  private isAi(p: Paddle): boolean {
    return this.mode === 1 && p.side === 1;
  }

  // --- Spiel -------------------------------------------------------------------------

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    for (const p of this.paddles) this.movePaddle(p, dt);
    this.moveBall(dt);
  }

  private movePaddle(p: Paddle, dt: number): void {
    const before = p.y;
    if (this.isAi(p)) {
      const b = this.ball;
      const coming = b.live && b.vx * p.side > 0;
      const want = coming ? this.predictY(p.side) + this.aiError : TABLE.y;
      const speed = Math.hypot(b.vx, b.vy);
      const slow = 1 - AI.tired * Phaser.Math.Clamp((speed - BALL.serve) / (BALL.max - BALL.serve), 0, 1);
      const step = AI.speed * slow * dt * (coming ? 1 : 0.5);
      p.y += Phaser.Math.Clamp(want - p.y, -step, step);
    } else {
      p.y += (p.target - p.y) * (1 - Math.exp(-PADDLE.follow * dt));
    }
    p.y = Phaser.Math.Clamp(p.y, TOP - 30, BOTTOM + 30);
    // Schläger kippt etwas in Bewegungsrichtung, das Kind läuft mit
    const tilt = Phaser.Math.Clamp(((p.y - before) / Math.max(dt, 0.001)) * 0.012, -18, 18);
    p.img.setPosition(paddleX(p.side), p.y).setAngle((p.side === -1 ? 180 : 0) - tilt * p.side);
    const kid = p.kid;
    kid.y += (p.y + KIDS.feet - kid.y) * (1 - Math.exp(-9 * dt));
  }

  /** Wo kommt der Ball an der Linie des Schlägers an (mit Abprallen an der Bande)? */
  private predictY(side: Side): number {
    const b = this.ball;
    if (b.vx === 0) return b.y;
    const t = Math.max(0, (this.hitLine(side) - b.x) / b.vx);
    const lo = TOP + BALL.radius;
    const span = BOTTOM - BALL.radius - lo;
    let y = (b.y - lo + b.vy * t) % (2 * span);
    if (y < 0) y += 2 * span;
    return lo + (y > span ? 2 * span - y : y);
  }

  private hitLine(side: Side): number {
    return paddleX(side) - side * (BALL.radius + 14);
  }

  private moveBall(dt: number): void {
    const b = this.ball;
    if (!b.live) return;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    // Bande oben/unten
    const lo = TOP + BALL.radius;
    const hi = BOTTOM - BALL.radius;
    if (b.y < lo || b.y > hi) {
      b.y = b.y < lo ? 2 * lo - b.y : 2 * hi - b.y;
      b.vy = -b.vy;
      this.events.emit('sound', { kind: 'pong-table', pitch: 2 });
    }
    // Aufsetzen auf der Platte
    const progress = (b.x - b.fromX) / (b.toX - b.fromX);
    if (!b.bounced && progress >= BALL.bounceAt) {
      b.bounced = true;
      this.events.emit('sound', { kind: 'pong-table', pitch: 4 });
    }
    // Schläger erreicht?
    const side: Side = b.vx < 0 ? -1 : 1;
    const paddle = this.paddles.find((p) => p.side === side)!;
    const line = this.hitLine(side);
    if (side * b.x >= side * line && side * b.x < side * line + 60) {
      const reach = PADDLE.reach + (this.isAi(paddle) ? 0 : PADDLE.assist);
      if (Math.abs(b.y - paddle.y) <= reach) this.hit(paddle);
    }
    // Vorbei: Ball rollt weg, ein neuer kommt
    if (Math.abs(b.x - TABLE.x) > TABLE.w / 2 + 300) this.miss(side);
    this.drawBall();
  }

  /** Ball fliegt los (Aufschlag oder Treffer) von x Richtung dir. */
  private launch(x: number, y: number, dir: Side, speed: number, angleDeg: number): void {
    const b = this.ball;
    const a = Phaser.Math.DegToRad(angleDeg);
    b.x = x;
    b.y = y;
    b.vx = dir * speed * Math.cos(a);
    b.vy = speed * Math.sin(a);
    b.fromX = x;
    b.toX = this.hitLine(dir);
    b.bounced = false;
    b.live = true;
  }

  private serve(): void {
    if (this.leaving) return;
    const b = this.ball;
    b.hits = 0;
    const dir = this.serveTo;
    const y = TABLE.y + Phaser.Math.Between(-140, 140);
    this.launch(TABLE.x, y, dir, BALL.serve, Phaser.Math.Between(-22, 22));
    this.aiError = this.newAiError();
    b.img.setVisible(true).setAlpha(1);
    b.shadow.setVisible(true).setAlpha(1);
    this.tweens.add({ targets: b.img, scale: { from: 0.2, to: 1 }, duration: 220, ease: 'Back.easeOut' });
    this.events.emit('sound', { kind: 'pop' });
    this.drawBall();
  }

  private newAiError(): number {
    return Phaser.Math.FloatBetween(-AI.error, AI.error);
  }

  /** Treffer: Winkel je nach Trefferstelle, etwas schneller, Ballwechsel zählt. */
  private hit(p: Paddle): void {
    const b = this.ball;
    const reach = PADDLE.reach + (this.isAi(p) ? 0 : PADDLE.assist);
    const offset = Phaser.Math.Clamp((b.y - p.y) / reach, -1, 1);
    b.hits++;
    const speed = Math.min(BALL.max, BALL.serve + BALL.speedUp * b.hits);
    this.launch(this.hitLine(p.side), b.y, (-p.side) as Side, speed, offset * PADDLE.maxAngle);
    this.aiError = this.newAiError();
    this.events.emit('sound', { kind: 'pong-hit', pitch: p.side === -1 ? 3 : 5 });
    this.tweens.add({ targets: p.img, scale: { from: 1.15, to: 1 }, duration: 160, ease: 'Quad.easeOut' });
    p.kid.hop();
    this.countRally();
  }

  /** Ballwechsel oben mitzählen; voll = goldener Stern, beide Kinder jubeln. */
  private countRally(): void {
    this.rally++;
    const i = this.rallyIcons.length;
    const x = TABLE.x + (i - (RALLY - 1) / 2) * 56;
    const icon = this.add.image(x, LAYOUT.rallyY, 'pong-ball').setDepth(DEPTH.ui).setScale(0.2);
    this.tweens.add({ targets: icon, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.rallyIcons.push(icon);
    if (this.rallyIcons.length < RALLY) return;
    // Stern!
    const icons = this.rallyIcons;
    this.rallyIcons = [];
    this.time.delayedCall(250, () => {
      this.tweens.add({ targets: icons, x: TABLE.x, alpha: 0, scale: 0.4, duration: 350, ease: 'Quad.easeIn', onComplete: () => icons.forEach((o) => o.destroy()) });
      this.addStar();
      for (const p of this.paddles) p.kid.cheer();
      this.events.emit('sound', { kind: 'pong-star' });
    });
  }

  private addStar(): void {
    if (this.stars.length >= STARS_MAX) {
      // Reihe voll: der älteste geht
      const old = this.stars.shift()!;
      this.tweens.add({ targets: old, alpha: 0, scale: 0.2, duration: 300, onComplete: () => old.destroy() });
      this.stars.forEach((s, i) => this.tweens.add({ targets: s, x: LAYOUT.starsX - i * 70, duration: 300 }));
    }
    const star = this.add.image(TABLE.x, LAYOUT.rallyY, 'gold-star').setDepth(DEPTH.ui).setScale(0.3);
    this.tweens.add({ targets: star, x: LAYOUT.starsX - this.stars.length * 70, scale: 1, angle: 360, duration: 650, ease: 'Back.easeOut' });
    this.stars.push(star);
  }

  /** Vorbei: Das Kind auf der Seite kichert, der neue Ball geht zu ihm. Nichts wird abgezogen. */
  private miss(side: Side): void {
    const b = this.ball;
    b.live = false;
    this.tweens.add({ targets: [b.img, b.shadow], alpha: 0, duration: 200 });
    this.events.emit('sound', { kind: 'pong-miss' });
    this.paddles.find((p) => p.side === side)!.kid.giggle();
    // Angefangener Ballwechsel löst sich auf
    const icons = this.rallyIcons;
    this.rallyIcons = [];
    this.tweens.add({ targets: icons, alpha: 0, y: LAYOUT.rallyY - 30, duration: 300, onComplete: () => icons.forEach((o) => o.destroy()) });
    this.serveTo = side;
    this.time.delayedCall(BALL.serveDelay, () => this.serve());
  }

  /** Ball im Bogen: steigt, setzt auf, steigt wieder zum Schläger; Schatten bleibt auf der Platte. */
  private drawBall(): void {
    const b = this.ball;
    const p = Phaser.Math.Clamp((b.x - b.fromX) / (b.toX - b.fromX), 0, 1.4);
    const at = BALL.bounceAt;
    const h = p < at ? BALL.arc * Math.sin((Math.PI * p) / at) : BALL.arc * 0.8 * Math.sin(Math.min(1, (p - at) / (1 - at)) * (Math.PI / 2));
    b.img.setPosition(b.x, b.y - h);
    if (!this.tweens.isTweening(b.img)) b.img.setScale(1 + h / 260);
    b.shadow.setPosition(b.x + h * 0.25, b.y + 6).setScale(1 - h / 320);
  }

  // --- Zurück ------------------------------------------------------------------------

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.events.emit('sound', { kind: 'click' });
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.params.onDone());
  }
}

