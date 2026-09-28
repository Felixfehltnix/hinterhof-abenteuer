import type { Kid } from '../Kid';
import type { Toy } from './Toy';

/**
 * Gibt einem Kind ein Spielzeug in die Hand. Ein Kind hält immer nur eines: Hält es schon etwas,
 * fällt das alte vor die Füße. false = geht gerade nicht (Kind geht nach Hause, versteckt sich, …).
 */
export function takeInHand(kid: Kid, toy: Toy): boolean {
  if (kid.mode === 'leaving' || kid.mode === 'hiding' || toy.heldBy) return false;
  const old = kid.holding as Toy | undefined;
  if (old && old !== toy) old.letGo(true);
  toy.heldBy = kid;
  kid.holding = toy;
  toy.physics.stop();
  return true;
}

/** Nimmt das Spielzeug aus der Hand; drop = fällt vor die Füße des Kindes. */
export function takeFromHand(toy: Toy, drop: boolean): void {
  const kid = toy.heldBy;
  if (!kid) return;
  if (kid.holding === toy) kid.holding = undefined;
  toy.heldBy = undefined;
  toy.handTilt = 0;
  if (drop && toy.active) {
    toy.setAngle(0).setFlipX(false).setVisible(true);
    // Vor die Füße: auf der Linie, auf der das Kind steht (oder neben seinem Gerät)
    const feet = kid.exitPoint?.y ?? kid.y;
    toy.physics.launch(0, 0, feet + 2);
  }
}
