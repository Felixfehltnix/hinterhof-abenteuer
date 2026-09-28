import { HOLD_POSES } from '../../../data/poses';
import type { PlaygroundScene } from '../../../scenes/PlaygroundScene';
import type { Kid } from '../../Kid';
import { takeFromHand, takeInHand } from '../hand';
import type { BehaviorFactory } from './types';

/**
 * Ein Kind hält das Spielzeug in der Hand: aufs Kind ziehen oder Kind darauf ziehen. Wie es
 * gehalten wird, steht im Katalog (`hold`). Ein Kind hält nur eines; ein zweites tauscht.
 * Antippen des Kindes löst die Aktion des Spielzeugs aus (`onUse` anderer Bausteine).
 * Mit beiden Händen Gehaltenes fällt beim Aufsitzen (Schaukel, Fahrzeug, …) vor die Füße.
 */
export const handheld: BehaviorFactory = (toy) => {
  const hold = toy.def.hold ?? { pose: 'forward' as const, dx: 12, dy: toy.height / 2 };
  const pose = HOLD_POSES[hold.pose];
  // Für das Kind: welche Armhaltung (Kid.applyPose)
  toy.setData('holdPose', hold.pose);

  const attach = (kid: Kid): boolean => takeInHand(kid, toy);

  return {
    onDragStart: () => takeFromHand(toy, false),
    onDragEnd: (release) => {
      if (release.fromHand) return;
      const cx = toy.x;
      const cy = toy.y - toy.displayHeight / 2;
      const kid = (toy.scene as PlaygroundScene).kidsOnMeadow().find((k) => k.visible && k.getBounds().contains(cx, cy));
      if (kid && attach(kid)) release.handled = true;
    },
    onKidDropped: attach,
    onLetGo: (drop) => takeFromHand(toy, drop),
    update: () => {
      const kid = toy.heldBy;
      if (!kid) return;
      if (!kid.active || kid.mode === 'leaving') {
        takeFromHand(toy, true);
        return;
      }
      // Mit beiden Händen geht nicht gleichzeitig schaukeln, fahren, hüpfen …
      const busy = kid.mode !== 'idle' && kid.mode !== 'dragging' && kid.mode !== 'hiding';
      if (busy && pose.twoHanded) {
        takeFromHand(toy, true);
        return;
      }
      const hand = kid.handPoint();
      const dir = kid.flipX ? -1 : 1;
      toy
        .setPosition(hand.x + dir * hold.dx, hand.y + hold.dy)
        .setFlipX(kid.flipX)
        .setAngle(kid.angle + dir * ((hold.angle ?? 0) + toy.handTilt))
        .setVisible(kid.visible)
        .setDepth(kid.depth + 1);
    },
    onRemove: () => takeFromHand(toy, false),
    onDestroy: () => takeFromHand(toy, false),
  };
};
