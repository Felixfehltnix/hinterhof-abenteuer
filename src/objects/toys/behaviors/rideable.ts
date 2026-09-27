import Phaser from 'phaser';
import { GROUND_MAX_Y, GROUND_MIN_Y, WORLD_WIDTH } from '../../../config';
import { VEHICLES, type VehicleDef } from '../../../data/vehicles';
import type { Kid, Seat } from '../../Kid';
import type { Toy } from '../Toy';
import type { BehaviorFactory } from './types';

const FALLBACK: VehicleDef = { style: 'sit', seat: { dx: 0, dy: -20 }, wheels: [] };

/**
 * Fahrzeug: Ein Kind darauf ziehen = aufsitzen (wie bei der Schaukel über `Seat`).
 * Fahrzeug ziehen = fahren (Räder drehen sich, das Kind wippt je nach Fahrstil).
 * Loslassen = rollt aus. Kind herunterziehen = absteigen.
 * Mit Ladefläche (Schubkarre) kann statt eines Kindes auch ein Spielzeug hinein.
 */
export const rideable: BehaviorFactory = (toy) => {
  const geo = VEHICLES[toy.def.id] ?? FALLBACK;
  const scene = toy.scene;
  const wheels = geo.wheels.map((w) => scene.add.image(toy.x, toy.y, 'wheel').setScale(w.r / 22));
  let rider: Kid | undefined;
  let cargo: Toy | undefined;
  let facing = 1;
  let lastX = toy.x;
  let travel = 0;

  const seat: Seat = {
    unseat: (kid) => {
      if (rider !== kid) return;
      rider = undefined;
      kid.seatedOn = undefined;
      kid.exitPoint = undefined;
      kid.mode = 'idle';
      kid.setAngle(0).setFlipX(false);
    },
  };

  const mount = (kid: Kid): boolean => {
    if (rider || cargo || kid.mode !== 'idle') return false;
    scene.tweens.killTweensOf(kid);
    rider = kid;
    kid.seatedOn = seat;
    kid.mode = 'riding';
    return true;
  };

  const load = (other: Toy): boolean => {
    if (!geo.cargo || rider || cargo) return false;
    // Schwebendes, Fahrzeuge und große Ziele passen nicht hinein.
    const tooBig = other.displayWidth > 160 || other.displayHeight > 160;
    if (tooBig || other.def.behaviors.some((b) => b === 'float' || b === 'rideable' || b === 'kite')) return false;
    cargo = other;
    other.physics.stop();
    return true;
  };

  /** Bewegung des Kindes je nach Fahrstil (nur während gefahren wird). */
  const pose = (): { bob: number; angle: number } => {
    switch (geo.style) {
      case 'run':
        return { bob: -Math.abs(Math.sin(travel / 25)) * 10, angle: Math.sin(travel / 25) * 4 };
      case 'push': {
        const push = Math.abs(Math.sin(travel / 60));
        return { bob: -push * 8, angle: -facing * push * 6 };
      }
      case 'cart':
        return { bob: Math.sin(travel / 15) * 2, angle: 0 };
      case 'sit':
        return { bob: Math.sin(travel / 18) * 3, angle: Math.sin(travel / 36) * 2 };
    }
  };

  return {
    onKidDropped: mount,
    onToyDropped: load,
    onDragEnd: (release) => {
      // Fährt am Boden aus, statt zu fliegen.
      release.vx = Phaser.Math.Clamp(release.pointerVelocity.x * 0.6, -900, 900);
      release.vy = 0;
    },
    update: () => {
      const dx = toy.x - lastX;
      lastX = toy.x;
      if (Math.abs(dx) > 0.5) {
        facing = Math.sign(dx);
        toy.setFlipX(facing < 0);
      }
      travel += Math.abs(dx);

      geo.wheels.forEach((w, i) => {
        wheels[i]
          .setPosition(toy.x + facing * w.dx, toy.y + w.dy)
          .setDepth(toy.depth + 0.1)
          .setRotation(wheels[i].rotation + dx / w.r);
      });

      if (rider && (!rider.active || rider.seatedOn !== seat)) rider = undefined;
      if (rider) {
        const { bob, angle } = pose();
        rider
          .setPosition(toy.x + facing * geo.seat.dx, toy.y + geo.seat.dy + bob)
          .setAngle(angle)
          .setFlipX(facing < 0)
          .setDepth(toy.depth - 0.5);
        rider.exitPoint = { x: toy.x + 100, y: toy.y + 10 };
      }

      if (cargo && (!cargo.active || cargo.isDragging || cargo.heldBy)) cargo = undefined;
      if (cargo && geo.cargo) {
        cargo.physics.stop();
        cargo.setPosition(toy.x + facing * geo.cargo.dx, toy.y + geo.cargo.dy + pose().bob).setDepth(toy.depth - 0.5);
      }
    },
    onRemove: () => {
      // Wird weggeräumt: Kind steigt vorher ab und bleibt auf der Wiese, Ladung fällt heraus.
      if (rider) {
        const kid = rider;
        seat.unseat(kid);
        kid.setPosition(Phaser.Math.Clamp(toy.x + 110, 60, WORLD_WIDTH - 60), Phaser.Math.Clamp(toy.y + 10, GROUND_MIN_Y, GROUND_MAX_Y));
        kid.setDepth(kid.y);
        kid.hop();
      }
      if (cargo) {
        cargo.physics.launch(0, 0);
        cargo = undefined;
      }
    },
    onDestroy: () => wheels.forEach((w) => w.destroy()),
  };
};
