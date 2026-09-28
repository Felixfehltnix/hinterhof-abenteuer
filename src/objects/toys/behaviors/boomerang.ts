import type { BehaviorFactory } from './types';

// So weit fliegt der Bumerang ungefähr hinaus, bevor er umkehrt (px).
const REACH = 650;
// Anteil der Schwerkraft, den er im Flug durch seine Drehung „wegträgt“.
const CARRY = 0.8;

/** Bumerang: geworfen fliegt er einen großen Bogen und kommt zurück. */
export const boomerang: BehaviorFactory = (toy) => {
  let flight: { dir: number; startX: number; accel: number } | undefined;

  return {
    // Hält es ein Kind: Kind antippen = in Blickrichtung werfen
    onUse: (kid) => {
      toy.throwFromHand(kid.flipX ? -1 : 1, kid.y);
      kid.act('throw');
      return true;
    },
    onDragStart: () => {
      flight = undefined;
    },
    onDragEnd: (release) => {
      if (release.vx === 0 && release.vy === 0) return; // nur abgelegt, nicht geworfen
      const dir = Math.sign(release.vx) || 1;
      const speed = Math.max(Math.abs(release.vx), 900);
      flight = { dir, startX: toy.x, accel: (speed * speed) / (2 * REACH) };
      release.vx = dir * speed;
      release.vy = Math.min(release.vy, -500);
    },
    update: (delta) => {
      const ph = toy.physics;
      if (!flight || !ph.active) {
        flight = undefined;
        return;
      }
      const dt = delta / 1000;
      ph.vx -= flight.dir * flight.accel * dt;
      if (ph.z > 0) ph.vz += toy.params.gravity * CARRY * dt;
      // Auf dem Rückweg wieder am Werfer: abbremsen und in der Nähe landen
      if (Math.sign(ph.vx) === -flight.dir && (toy.x - flight.startX) * flight.dir <= 0) {
        ph.vx *= 0.25;
        flight = undefined;
      }
    },
  };
};
