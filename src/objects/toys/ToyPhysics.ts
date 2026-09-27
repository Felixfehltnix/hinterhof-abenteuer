import Phaser from 'phaser';
import { GAME_WIDTH, GROUND_MAX_Y, GROUND_MIN_Y } from '../../config';
import type { ToyParams } from '../../data/toys';

// Unter dieser Aufprallgeschwindigkeit (px/s) springt nichts mehr hoch.
const MIN_BOUNCE_SPEED = 120;
// Unter dieser Rollgeschwindigkeit (px/s) bleibt ein Spielzeug liegen.
const MIN_ROLL_SPEED = 8;
// Ab dieser waagerechten Geschwindigkeit (px/s) wirkt der volle Auftrieb (Frisbee).
const LIFT_FULL_SPEED = 700;

/**
 * Einfache 2,5D-Bewegung für Spielzeuge: Das Spielzeug hat eine Bodenlinie (groundY,
 * bestimmt die Tiefe) und eine Höhe z darüber. Auf dem Bildschirm steht es bei y = groundY - z.
 * Die Bildränder wirken wie eine Bande, nichts fliegt aus dem Bild.
 */
export class ToyPhysics {
  vx = 0;
  vz = 0;
  z = 0;
  groundY = 0;
  active = false;
  /** Wird bei jedem Aufprall auf dem Boden aufgerufen. */
  readonly landListeners: (() => void)[] = [];

  constructor(
    private readonly obj: Phaser.GameObjects.Image,
    private readonly params: ToyParams,
  ) {}

  /**
   * Setzt das Spielzeug in Bewegung. Geschwindigkeit in px/s auf dem Bildschirm
   * (vy < 0 = nach oben). Liegt es gerade still, zählt die aktuelle Position als Start.
   * groundY: optional eine andere Bodenlinie (Tiefe), auf der es landen soll.
   */
  launch(vx: number, vy: number, groundY?: number): void {
    if (!this.active || groundY !== undefined) {
      this.groundY = Phaser.Math.Clamp(groundY ?? this.obj.y, GROUND_MIN_Y, GROUND_MAX_Y);
      // Mit vorgegebener Bodenlinie immer kurz fallen, damit ein Aufprall ausgelöst wird.
      this.z = Math.max(groundY !== undefined ? 1 : 0, this.groundY - this.obj.y);
      this.obj.setDepth(this.groundY);
    }
    this.vx = vx;
    this.vz = -vy;
    this.active = true;
  }

  stop(): void {
    this.active = false;
    this.vx = 0;
    this.vz = 0;
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
    }
    this.z += this.vz * dt;
    let x = obj.x + this.vx * dt;

    // Boden
    if (this.z <= 0) {
      const impact = inAir;
      this.z = 0;
      if (this.vz < -MIN_BOUNCE_SPEED) this.vz = -this.vz * p.bounce;
      else this.vz = 0;
      if (this.vz === 0) this.vx *= Math.exp(-p.rollFriction * dt);
      if (impact) this.landListeners.forEach((fn) => fn());
    }

    // Bande links und rechts
    const half = obj.displayWidth / 2;
    if (x < half) {
      x = half;
      this.vx = Math.abs(this.vx) * p.bounce;
    } else if (x > GAME_WIDTH - half) {
      x = GAME_WIDTH - half;
      this.vx = -Math.abs(this.vx) * p.bounce;
    }

    // Bande oben
    const maxZ = this.groundY - obj.displayHeight;
    if (this.z > maxZ) {
      this.z = maxZ;
      this.vz = -Math.abs(this.vz) * p.bounce;
    }

    if (p.spin) obj.rotation += (this.vx * dt) / half;
    obj.setPosition(x, this.groundY - this.z);

    if (this.z === 0 && this.vz === 0 && Math.abs(this.vx) < MIN_ROLL_SPEED) this.stop();
  }
}
