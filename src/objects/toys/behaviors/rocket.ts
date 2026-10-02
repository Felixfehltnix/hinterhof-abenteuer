import Phaser from 'phaser';
import { GROUND_MAX_Y, GROUND_MIN_Y, WORLD_WIDTH } from '../../../config';
import { WARP } from '../../../data/asteroids';
import { ALTITUDE_MAX, ROCKET, ROCKET_FLY_DEPTH, WEIGHTLESS_FROM } from '../../../data/space';
import type { PlaygroundScene } from '../../../scenes/PlaygroundScene';
import { ROCKET_ART } from '../../../scenes/placeholders/space';
import type { Kid } from '../../Kid';
import { ToySeats } from '../seats';
import type { BehaviorFactory } from './types';

// Touch-Fläche im Flug: ein Kreis um die Mitte (die Rakete dreht sich in alle Richtungen)
const FLY_HIT_RADIUS = 300;

/**
 * Rakete (#75): Bis zu 4 Kinder sitzen in der Kabine (Kind auf die Rakete ziehen). Festhalten und
 * ziehen = fliegen: Die Rakete fliegt dem Finger nach (etwas träge), die Kamera folgt ihr bis ins
 * Weltall (src/world/Space.ts). Loslassen in der Luft = sinkt langsam auf die Wiese, nach unten
 * ziehen = schnell zurück. Im Weltall schweben die Kinder und winken.
 * Die Rakete selbst ist die Rückseite mit Kabine; Kinder und Vorderseite (`rocket-front`, Fenster
 * ausgestanzt) liegen darüber.
 */
export const rocket: BehaviorFactory = (toy) => {
  const scene = toy.scene as PlaygroundScene;
  const H = ROCKET_ART.height;
  const seats = new ToySeats(toy, ROCKET.seats, 'riding');
  const front = scene.add.image(toy.x, toy.y - H / 2, 'rocket-front');
  const flame = scene.add.image(toy.x, toy.y, 'rocket-flame').setOrigin(0.5, 0).setVisible(false);
  const smoke = scene.add.particles(0, 0, 'smoke', {
    speedY: { min: 60, max: 140 },
    speedX: { min: -50, max: 50 },
    scale: { start: 0.8, end: 2.4 },
    alpha: { start: 0.55, end: 0 },
    lifespan: 1300,
    frequency: 60,
    emitting: false,
  });

  let airborne = false;
  let steering = false;
  let target = { x: toy.x, y: toy.y };
  let vx = 0;
  let vy = 0;
  let tilt = 0;
  // Auf dieser Bodenlinie landet sie (wo sie zuletzt über der Wiese war)
  let landY = toy.y;
  // Finger liegt still auf der fliegenden Rakete (noch nicht gezogen): sie schwebt auf der Stelle
  let holdPointer: number | undefined;
  // So lange (s) wird die Rakete schon oben am Weltall-Rand weiter nach oben gezogen (Warp)
  let warp = 0;
  // Kinder, deren Touch-Fläche im Flug aus ist (beim Aussteigen wieder an)
  const muted = new Set<Kid>();

  toy.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (p: Phaser.Input.Pointer) => {
    if (airborne) holdPointer = p.id;
  });
  const onPointerUp = (p: Phaser.Input.Pointer) => {
    if (p.id === holdPointer) holdPointer = undefined;
  };
  scene.input.on(Phaser.Input.Events.POINTER_UP, onPointerUp);
  scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, onPointerUp);

  const groundLine = (y: number) => Phaser.Math.Clamp(y, GROUND_MIN_Y, GROUND_MAX_Y);

  // Am Boden: die Rakete selbst; im Flug ein Kreis um die Mitte (sie kann quer oder kopfüber liegen)
  const groundHit = toy.input?.hitArea as Phaser.Geom.Rectangle;
  const flyHit = new Phaser.Geom.Circle(toy.width / 2, toy.height / 2, FLY_HIT_RADIUS);
  let flyingHit = false;
  const setHitArea = (flying: boolean) => {
    if (!toy.input || flying === flyingHit) return;
    flyingHit = flying;
    toy.input.hitArea = flying ? flyHit : groundHit;
    toy.input.hitAreaCallback = flying ? Phaser.Geom.Circle.Contains : Phaser.Geom.Rectangle.Contains;
  };

  /** Punkt an der Rakete (relativ zum Fußpunkt, ungeneigt) in der Welt – mit Neigung um die Mitte. */
  const at = (dx: number, dy: number) => {
    const cx = toy.x;
    const cy = toy.y - H / 2;
    const ly = dy + H / 2;
    const c = Math.cos(tilt);
    const s = Math.sin(tilt);
    return { x: cx + dx * c - ly * s, y: cy + dx * s + ly * c };
  };

  /** Rauchwolke an der Düse (Start, Landung, Antippen). */
  const puff = (n: number) => {
    const p = at(ROCKET_ART.nozzle.dx, ROCKET_ART.nozzle.dy);
    smoke.emitParticleAt(p.x, p.y + 20, n);
  };

  const liftOff = () => {
    airborne = true;
    landY = groundLine(toy.y);
    vx = 0;
    vy = 0;
    puff(12);
    scene.events.emit('sound', { kind: 'liftoff', x: toy.x });
  };

  const land = () => {
    airborne = false;
    vx = 0;
    vy = 0;
    toy.y = landY;
    puff(10);
    scene.events.emit('sound', { kind: 'rocket-land', x: toy.x });
    if (scene.cameraControl.isFollowing(toy)) scene.cameraControl.follow(undefined);
    // Kurzes Nachfedern
    scene.tweens.add({ targets: front, scaleY: { from: 0.94, to: 1 }, duration: 260, ease: 'Back.easeOut' });
  };

  const fly = (dt: number) => {
    let gx = 0;
    let gy: number = holdPointer !== undefined ? 0 : ROCKET.sinkSpeed;
    if (steering) {
      // Direkt auf den Finger zu, in jede Richtung gleich schnell
      gx = (target.x - toy.x) * ROCKET.pull;
      gy = (target.y - toy.y) * ROCKET.pull;
      const speed = Math.hypot(gx, gy);
      if (speed > ROCKET.maxSpeed) {
        gx *= ROCKET.maxSpeed / speed;
        gy *= ROCKET.maxSpeed / speed;
      }
    }
    const k = 1 - Math.exp(-ROCKET.response * dt);
    vx += (gx - vx) * k;
    vy += (gy - vy) * k;
    toy.x += vx * dt;
    toy.y += vy * dt;

    // Weltränder: links/rechts, oben das Ende des Weltalls, unten die Vorderkante der Wiese
    const half = toy.displayWidth / 2;
    if (toy.x < half || toy.x > WORLD_WIDTH - half) {
      toy.x = Phaser.Math.Clamp(toy.x, half, WORLD_WIDTH - half);
      vx = 0;
    }
    const top = -ALTITUDE_MAX + H + 40;
    if (toy.y < top) {
      toy.y = top;
      vy = Math.max(0, vy);
    }
    if (toy.y > GROUND_MAX_Y) {
      toy.y = GROUND_MAX_Y;
      vy = Math.min(0, vy);
    }
    warpOut(dt, toy.y <= top + 2);
    // Über der Wiese abgesenkt oder zur Seite gesteuert: dort landet sie später
    // (beim Aufsteigen bleibt es bei der Stelle, an der sie gestartet ist)
    if (steering && toy.y >= GROUND_MIN_Y && vy >= 0) landY = groundLine(toy.y);
    if (!steering && toy.y >= landY) land();
  };

  /**
   * Oben am Ende des Weltalls weiter nach oben ziehen: Die Sterne werden zu Strichen, nach
   * WARP.holdTime geht es in den Sternenflug (Asteroiden). Loslassen oder zurück = Warp klingt ab.
   */
  const warpOut = (dt: number, atTop: boolean) => {
    const pushing = steering && atTop && target.y < toy.y - WARP.pushMargin;
    warp = pushing ? warp + dt : Math.max(0, warp - dt * 2);
    scene.space.warp = Math.min(1, warp / WARP.holdTime);
    if (warp < WARP.holdTime) return;
    warp = 0;
    scene.space.warp = 0;
    scene.events.emit('sound', { kind: 'warp', x: toy.x });
    scene.openAsteroids(seats.riders.filter((k): k is Kid => k !== undefined));
  };

  /** Flamme und Rauch an der Düse, je nach Schub. */
  const engine = () => {
    const t = scene.time.now / 1000;
    const thrust = steering ? 0.5 + 0.8 * Phaser.Math.Clamp(Math.hypot(vx, vy) / ROCKET.maxSpeed, 0, 1) : 0.3;
    const n = at(ROCKET_ART.nozzle.dx, ROCKET_ART.nozzle.dy);
    flame
      .setVisible(airborne)
      .setPosition(n.x, n.y)
      .setRotation(tilt)
      .setScale(0.85 + 0.12 * Math.sin(t * 33), thrust * (0.9 + 0.18 * Math.sin(t * 41)))
      .setDepth(toy.depth - 0.2);
    smoke.setDepth(toy.depth - 0.3);
    // Qualm nur nah am Boden (beim Starten und Landen), oben leuchtet nur die Flamme
    const low = toy.y > GROUND_MIN_Y - 500;
    if (airborne && low && (steering || vy > 0)) {
      if (!smoke.emitting) smoke.start();
      smoke.setPosition(n.x, n.y + 30);
    } else if (smoke.emitting) smoke.stop();
  };

  /** Kinder in der Kabine: sitzen, im Weltall schweben sie (Arme hoch, leicht auf und ab). */
  const placeKids = () => {
    const t = scene.time.now / 1000;
    const altitude = GROUND_MAX_Y - toy.y;
    const float = Phaser.Math.Clamp((altitude - WEIGHTLESS_FROM) / 700, 0, 1);
    seats.riders.forEach((kid, i) => {
      if (!kid) return;
      const seat = ROCKET_ART.seats[i];
      const bob = float * (7 + 6 * Math.sin(t * 1.8 + i * 1.3));
      const hip = at(seat.dx, seat.dy - bob);
      const drop = kid.hipHeight();
      kid.setScale(ROCKET.kidScale).setRotation(tilt).setFlipX(false);
      kid.setPosition(hip.x - drop * Math.sin(tilt), hip.y + drop * Math.cos(tilt));
      kid.setDepth(toy.depth + (seat.front ? 0.2 : 0.1));
      kid.setActivity('rocket', { float });
      // Im Flug steuert jede Berührung die Rakete (die Kinder bleiben sitzen)
      if (kid.input) kid.input.enabled = !airborne;
      if (airborne) muted.add(kid);
    });
    for (const kid of muted) {
      if (airborne && seats.riders.includes(kid)) continue;
      if (kid.input) kid.input.enabled = true;
      muted.delete(kid);
    }
  };

  return {
    onDragStart: () => {
      toy.setScale(1);
      steering = true;
      holdPointer = undefined;
      if (!airborne) liftOff();
      target = { x: toy.x, y: toy.y };
      scene.cameraControl.follow(toy);
    },
    onSteer: (x, y) => {
      target = { x, y };
    },
    onDragEnd: (release) => {
      release.handled = true;
      steering = false;
      toy.setScale(1);
      // Auf der Wiese losgelassen: setzt sich hier ab
      if (toy.y >= GROUND_MIN_Y) landY = groundLine(toy.y);
    },
    onKidDropped: (kid) => {
      if (airborne) return false;
      if (seats.mount(kid) < 0) return false;
      kid.setScale(ROCKET.kidScale);
      scene.events.emit('sound', { kind: 'pop', x: toy.x });
      return true;
    },
    onTap: () => {
      if (airborne) return;
      // Triebwerk kurz anwerfen
      puff(8);
      scene.events.emit('sound', { kind: 'rocket', x: toy.x });
      flame.setVisible(true);
      scene.tweens.add({ targets: front, angle: { from: -1.5, to: 1.5 }, duration: 60, yoyo: true, repeat: 3, onComplete: () => front.setAngle(0) });
    },
    update: (deltaMs) => {
      const dt = Math.min(deltaMs, 50) / 1000;
      seats.cleanup(airborne ? landY : toy.y);
      if (airborne) fly(dt);
      toy.restY = airborne ? landY : undefined;
      toy.physics.stop();

      // Gesteuert zeigt die Spitze immer in Flugrichtung (zum Finger), auch zur Seite und nach unten.
      // Losgelassen richtet sie sich wieder auf, im Weltall schaukelt sie dabei sanft.
      const altitude = GROUND_MAX_Y - toy.y;
      let goal = 0;
      if (airborne && steering) {
        goal = Math.hypot(vx, vy) > ROCKET.turnFromSpeed ? Math.atan2(vx, -vy) : tilt;
      } else if (airborne && altitude > WEIGHTLESS_FROM) {
        goal = Math.sin(scene.time.now / 900) * 0.07;
      }
      tilt = Phaser.Math.Angle.Wrap(tilt + Phaser.Math.Angle.Wrap(goal - tilt) * (1 - Math.exp(-ROCKET.turnRate * dt)));
      toy.spin = tilt;
      setHitArea(airborne);

      toy.setDepth(airborne ? ROCKET_FLY_DEPTH : toy.y);
      front
        .setPosition(toy.x, toy.y - H / 2)
        .setRotation(tilt)
        .setDepth(toy.depth + 0.3);
      if (!scene.tweens.isTweening(front)) front.setAngle(Phaser.Math.RadToDeg(tilt));
      engine();
      placeKids();
      if (airborne && !scene.cameraControl.isFollowing(toy)) scene.cameraControl.follow(toy);
    },
    onRemove: () => {
      // Wird weggeräumt (auch mitten im Flug): Kinder steigen aus und stehen auf der Wiese.
      seats.riders.forEach((kid) => {
        if (!kid) return;
        kid.setScale(1);
        if (kid.input) kid.input.enabled = true;
      });
      seats.dismountAll(airborne ? landY : toy.y);
      scene.space.warp = 0;
      if (scene.cameraControl.isFollowing(toy)) scene.cameraControl.follow(undefined);
    },
    onDestroy: () => {
      scene.input.off(Phaser.Input.Events.POINTER_UP, onPointerUp);
      scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, onPointerUp);
      for (const kid of muted) if (kid.input) kid.input.enabled = true;
      front.destroy();
      flame.destroy();
      smoke.destroy();
    },
  };
};
