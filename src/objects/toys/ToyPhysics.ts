import Phaser from 'phaser';
import { GROUND_MAX_Y, GROUND_MIN_Y, WORLD_WIDTH } from '../../config';
import type { ToyParams } from '../../data/toys';
import type { Toy } from './Toy';
import { environment } from '../../world/environment';

// Unter dieser Aufprallgeschwindigkeit (px/s) springt nichts mehr hoch.
const MIN_BOUNCE_SPEED = 120;
// Unter dieser Rollgeschwindigkeit (px/s) bleibt ein Spielzeug liegen.
const MIN_ROLL_SPEED = 8;
// Ab dieser waagerechten Geschwindigkeit (px/s) wirkt der volle Auftrieb (Frisbee).
const LIFT_FULL_SPEED = 700;
// Anteil des Windes, der am Boden noch schiebt.
const GROUND_WIND = 0.5;

/**
 * Einfache 2,5D-Bewegung für Spielzeuge: Das Spielzeug hat eine Bodenlinie (groundY,
 * bestimmt die Tiefe) und eine Höhe z darüber. Auf dem Bildschirm steht es bei y = groundY - z.
 * vx bewegt nach links/rechts, vdepth die Bodenlinie nach hinten (−) oder vorne (+), vz die Höhe.
 * Die Weltränder (0 und WORLD_WIDTH) wirken wie eine Bande, ebenso Zaun (GROUND_MIN_Y) und Vorderkante (GROUND_MAX_Y).
 */
export class ToyPhysics {
  vx = 0;
  vz = 0;
  /** Geschwindigkeit entlang der Wiese in die Tiefe (px/s, − = nach hinten). */
  vdepth = 0;
  z = 0;
  groundY = 0;
  active = false;
  /** Wird bei jedem Aufprall auf dem Boden aufgerufen. */
  readonly landListeners: (() => void)[] = [];

  constructor(
    private readonly obj: Toy,
    private readonly params: ToyParams,
  ) {}

  /**
   * Setzt das Spielzeug in Bewegung. Geschwindigkeit in px/s auf dem Bildschirm
   * (vy < 0 = nach oben). Liegt es gerade still, zählt die aktuelle Position als Start.
   * groundY: optional eine andere Bodenlinie (Tiefe), auf der es landen soll.
   * vdepth: Bewegung in die Tiefe (px/s, − = nach hinten zum Zaun).
   */
  launch(vx: number, vy: number, groundY?: number, vdepth = 0): void {
    // Am Welt- oder Bildschirmrand losgelassen: sofort zurück hinter die Bande.
    const half = this.obj.displayWidth / 2;
    this.obj.x = Phaser.Math.Clamp(this.obj.x, half, WORLD_WIDTH - half);
    if (!this.active || groundY !== undefined) {
      this.groundY = Phaser.Math.Clamp(groundY ?? this.obj.y, GROUND_MIN_Y, GROUND_MAX_Y);
      // Mit vorgegebener Bodenlinie immer kurz fallen, damit ein Aufprall ausgelöst wird.
      this.z = Math.max(groundY !== undefined ? 1 : 0, this.groundY - this.obj.y);
      this.obj.setDepth(this.groundY);
    }
    this.vx = vx;
    this.vz = -vy;
    this.vdepth = vdepth;
    this.active = true;
  }

  stop(): void {
    this.active = false;
    this.vx = 0;
    this.vz = 0;
    this.vdepth = 0;
  }

  update(deltaMs: number): void {
    if (!this.active) return;
    const p = this.params;
    const obj = this.obj;
    const dt = Math.min(deltaMs, 50) / 1000; // große Ruckler nicht als Riesensprung

    const inAir = this.z > 0 || this.vz > 0;
    if (inAir) {
      // Auftrieb: schnelle, flache Dinge (Frisbee) fallen langsamer.
      const lift = p.lift * Math.min(1, Math.abs(this.vx) / LIFT_FULL_SPEED);
      this.vz -= p.gravity * (1 - lift) * dt;
      this.vx *= Math.exp(-p.airDrag * dt);
      this.vdepth *= Math.exp(-p.airDrag * dt);
      this.vx += environment.wind * p.windFactor * dt;
    }
    this.z += this.vz * dt;
    let x = obj.x + this.vx * dt;

    // Boden
    if (this.z <= 0) {
      const impact = inAir;
      this.z = 0;
      if (this.vz < -MIN_BOUNCE_SPEED) this.vz = -this.vz * p.bounce;
      else this.vz = 0;
      if (this.vz === 0) {
        this.vx *= Math.exp(-p.rollFriction * dt);
        this.vdepth *= Math.exp(-p.rollFriction * dt);
        // Leichtes rollt auch am Boden mit dem Wind
        this.vx += environment.wind * p.windFactor * GROUND_WIND * dt;
      }
      if (impact) this.landListeners.forEach((fn) => fn());
    }

    // Bewegung in die Tiefe: Zaun und Vorderkante der Wiese sind eine Bande
    this.groundY += this.vdepth * dt;
    if (this.groundY < GROUND_MIN_Y) {
      this.groundY = GROUND_MIN_Y;
      this.vdepth = Math.abs(this.vdepth) * p.bounce;
    } else if (this.groundY > GROUND_MAX_Y) {
      this.groundY = GROUND_MAX_Y;
      this.vdepth = -Math.abs(this.vdepth) * p.bounce;
    }
    obj.setDepth(this.groundY);

    // Bande links und rechts
    const half = obj.displayWidth / 2;
    if (x < half) {
      x = half;
      this.vx = Math.abs(this.vx) * p.bounce;
    } else if (x > WORLD_WIDTH - half) {
      x = WORLD_WIDTH - half;
      this.vx = -Math.abs(this.vx) * p.bounce;
    }

    // Bande oben
    const maxZ = this.groundY - obj.displayHeight;
    if (this.z > maxZ) {
      this.z = maxZ;
      this.vz = -Math.abs(this.vz) * p.bounce;
    }

    // Rollen: Drehung um die Mitte (Toy.spin), passend zum zurückgelegten Weg
    if (p.spin) obj.spin += ((this.vx + this.vdepth * 0.3 * Math.sign(this.vx || 1)) * dt) / half;
    obj.setPosition(x, this.groundY - this.z);

    const pushedByWind = Math.abs(environment.wind * p.windFactor) > 40;
    const rolling = Math.abs(this.vx) >= MIN_ROLL_SPEED || Math.abs(this.vdepth) >= MIN_ROLL_SPEED;
    if (this.z === 0 && this.vz === 0 && !rolling && !pushedByWind) this.stop();
  }
}
