import Phaser from 'phaser';
import type { Kid } from '../../Kid';
import { ToySeats } from '../seats';
import type { BehaviorFactory } from './types';

// Sitzplätze im Halbkreis (relativ zum Fußpunkt). Die Reihenfolge ist auch die Zähl-Reihenfolge.
// Die Kinder sitzen tief im Wasser: Der vordere Rand verdeckt die Beine.
const SLOTS = [
  { dx: -105, dy: -18 },
  { dx: -35, dy: -26 },
  { dx: 35, dy: -26 },
  { dx: 105, dy: -18 },
  { dx: -70, dy: -6 },
  { dx: 70, dy: -6 },
];
const COUNT_STEP = 600; // ms pro Kind beim Durchzählen
const COUNT_DELAY = 350; // ms vor der ersten Zahl
const HOP_TIME = 320;
const HOP_HEIGHT = 36;

/**
 * Whirlpool: bis zu 6 Kinder sitzen im sprudelnden Wasser. Beim Hineinsetzen (und beim
 * Antippen) zählen sie der Reihe nach durch: Hüpfer, Zahl über dem Kopf, Ton `count`.
 * Ein siebtes Kind landet daneben, und die Kinder rufen noch einmal die Anzahl.
 * Antippen (Pool oder ein Kind darin) lässt alle noch einmal durchzählen.
 */
export const whirlpool: BehaviorFactory = (toy) => {
  const scene = toy.scene;
  const seats = new ToySeats(toy, SLOTS.length, 'bathing');
  const front = scene.add.image(toy.x, toy.y, 'whirlpool-front').setOrigin(0.5, 1);
  const bubbles = scene.add.particles(toy.x, toy.y, 'bubble', {
    x: { min: -140, max: 140 },
    y: { min: -60, max: -20 },
    speedY: { min: -70, max: -30 },
    speedX: { min: -10, max: 10 },
    scale: { start: 0.28, end: 0.08 },
    alpha: { start: 0.8, end: 0 },
    lifespan: 900,
    frequency: 70,
  });
  const hopStart: (number | undefined)[] = SLOTS.map(() => undefined);
  let timers: Phaser.Time.TimerEvent[] = [];
  let lastCount = 0;
  // Kinder im Pool antippen zählt auch neu (sie verdecken den Pool fast ganz).
  const listening = new Set<Kid>();
  const onKidTapped = () => countRound();
  const syncListeners = () => {
    const inside = new Set(seats.riders.filter((k): k is Kid => !!k));
    for (const kid of listening) {
      if (!inside.has(kid)) {
        kid.off('tapped', onKidTapped);
        listening.delete(kid);
      }
    }
    for (const kid of inside) {
      if (!listening.has(kid)) {
        kid.on('tapped', onKidTapped);
        listening.add(kid);
      }
    }
  };

  const cancelCounting = () => {
    timers.forEach((t) => t.remove(false));
    timers = [];
  };

  /** Alle Kinder im Pool zählen der Reihe nach durch (eine neue Runde bricht die alte ab). */
  const countRound = () => {
    cancelCounting();
    const inPool = seats.riders.map((kid, slot) => ({ kid, slot })).filter((e): e is { kid: Kid; slot: number } => !!e.kid);
    inPool.forEach((e, i) => {
      timers.push(
        scene.time.delayedCall(COUNT_DELAY + i * COUNT_STEP, () => {
          if (!e.kid.active || seats.riders[e.slot] !== e.kid) return;
          hopStart[e.slot] = scene.time.now;
          showNumber(e.kid, i + 1);
          scene.events.emit('sound', { kind: 'count', value: i + 1, voice: e.kid.def.id, x: e.kid.x });
        }),
      );
    });
  };

  /**
   * Ziffer in einer Seifenblase über dem Kopf, darunter so viele Punkte.
   * Bewusste Ausnahme von „kein Text im Spiel“: Ziffern gehören zum Zählenlernen.
   */
  const showNumber = (kid: Kid, n: number) => {
    const y = kid.y - kid.displayHeight - 40;
    const bubble = scene.add.image(0, 0, 'bubble').setScale(1.9).setTint(0xbde0fe);
    const digit = scene.add
      .text(0, 2, String(n), { fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif', fontSize: '64px', fontStyle: 'bold', color: '#1d3557' })
      .setOrigin(0.5)
      .setStroke('#ffffff', 8);
    const dots = Array.from({ length: n }, (_, i) => scene.add.circle((i - (n - 1) / 2) * 18, 70, 6, 0xffd166).setStrokeStyle(2, 0x1d3557));
    const label = scene.add.container(kid.x, y, [bubble, digit, ...dots]).setDepth(toy.depth + 50).setScale(0.3).setAlpha(0);
    scene.tweens.chain({
      targets: label,
      tweens: [
        { scale: 1, alpha: 1, y: y - 20, duration: 220, ease: 'Back.easeOut' },
        { alpha: 0, y: y - 60, duration: 350, delay: 700, ease: 'Quad.easeIn' },
      ],
      onComplete: () => label.destroy(),
    });
  };

  const splash = (x: number, y: number, strength = 10) => {
    scene.events.emit('sound', { kind: 'splash', x });
    for (let i = 0; i < strength; i++) {
      const drop = scene.add.circle(x, y, Phaser.Math.Between(4, 8), 0x8ecae6).setDepth(toy.depth + 1);
      const a = -Math.PI / 2 + Phaser.Math.FloatBetween(-1.2, 1.2);
      const r = Phaser.Math.Between(40, 120);
      scene.tweens.add({
        targets: drop,
        x: x + Math.cos(a) * r,
        y: y + Math.sin(a) * r * 0.8 + 50,
        alpha: 0,
        duration: Phaser.Math.Between(450, 700),
        ease: 'Quad.easeOut',
        onComplete: () => drop.destroy(),
      });
    }
  };

  return {
    onKidDropped: (kid) => {
      if (seats.count >= SLOTS.length) {
        // Voll: kräftig blubbern, das Kind landet daneben, alle rufen noch einmal die Anzahl.
        bubbles.explode(30, toy.x, toy.y - 40);
        splash(toy.x, toy.y - 50, 18);
        kid.setPosition(toy.x + toy.displayWidth / 2 + 70, toy.y + 10);
        countRound();
        return true;
      }
      const slot = seats.mount(kid, seats.riders.findIndex((r) => !r));
      if (slot < 0) return false;
      splash(toy.x + SLOTS[slot].dx, toy.y - 40);
      lastCount = seats.count;
      countRound();
      return true;
    },
    onTap: () => {
      if (seats.count > 0) countRound();
      else bubbles.explode(12, toy.x, toy.y - 40);
    },
    update: () => {
      seats.cleanup();
      syncListeners();
      // Ein Kind ging (herausgezogen, nach Hause): laufende Zählrunde sauber abbrechen.
      if (seats.count < lastCount) cancelCounting();
      lastCount = seats.count;

      const t = scene.time.now;
      front.setPosition(toy.x, toy.y).setDepth(toy.depth + 0.6).setScale(toy.scaleX, toy.scaleY);
      bubbles.setPosition(toy.x, toy.y).setDepth(toy.depth + 0.7);
      seats.riders.forEach((kid, i) => {
        if (!kid) return;
        const slot = SLOTS[i];
        let hop = 0;
        const start = hopStart[i];
        if (start !== undefined) {
          const p = (t - start) / HOP_TIME;
          if (p >= 1) hopStart[i] = undefined;
          else hop = Math.sin(p * Math.PI) * HOP_HEIGHT;
        }
        // Leichtes Wippen im sprudelnden Wasser
        const bob = Math.sin(t / 300 + i * 1.3) * 3;
        kid.setPosition(toy.x + slot.dx, toy.y + slot.dy + bob - hop).setDepth(toy.depth + (slot.dy > -10 ? 0.5 : 0.4));
      });
    },
    onRemove: () => {
      cancelCounting();
      seats.dismountAll();
      syncListeners();
    },
    onDestroy: () => {
      cancelCounting();
      listening.forEach((kid) => kid.off('tapped', onKidTapped));
      listening.clear();
      front.destroy();
      bubbles.destroy();
    },
  };
};
