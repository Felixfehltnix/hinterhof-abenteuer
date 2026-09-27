import type { PlaygroundScene } from '../../../scenes/PlaygroundScene';
import type { Kid } from '../../Kid';
import type { BehaviorFactory } from './types';

/** Ein Kind hält das Spielzeug in der Hand (z. B. Taschenlampe): aufs Kind ziehen oder Kind darauf ziehen. */
export const handheld: BehaviorFactory = (toy) => {
  const attach = (kid: Kid): boolean => {
    if (kid.holding || kid.mode === 'leaving' || kid.mode === 'hiding' || toy.heldBy) return false;
    toy.heldBy = kid;
    kid.holding = toy;
    toy.physics.stop();
    return true;
  };
  const detach = () => {
    const kid = toy.heldBy;
    if (!kid) return;
    if (kid.holding === toy) kid.holding = undefined;
    toy.heldBy = undefined;
  };

  return {
    onDragStart: detach,
    onDragEnd: (release) => {
      const cx = toy.x;
      const cy = toy.y - toy.displayHeight / 2;
      const kid = (toy.scene as PlaygroundScene).kidsOnMeadow().find((k) => !k.holding && k.visible && k.getBounds().contains(cx, cy));
      if (kid && attach(kid)) release.handled = true;
    },
    onKidDropped: attach,
    update: () => {
      const kid = toy.heldBy;
      if (!kid) return;
      if (!kid.active || kid.mode === 'leaving') {
        detach();
        toy.physics.launch(0, 0);
        return;
      }
      const hand = kid.handPoint();
      const dir = kid.flipX ? -1 : 1;
      toy
        .setPosition(hand.x + dir * 12, hand.y + toy.displayHeight / 2)
        .setFlipX(kid.flipX)
        .setAngle(kid.angle)
        .setVisible(kid.visible)
        .setDepth(kid.depth + 1);
    },
    onRemove: detach,
  };
};
