import type { PlaygroundScene } from '../../../scenes/PlaygroundScene';
import type { Kid } from '../../Kid';
import type { BehaviorFactory } from './types';

const SPIN = 9; // Umdrehungen pro … (Winkelgeschwindigkeit in rad/s)

/** Hula-Hoop: Auf ein Kind ziehen → kreist um die Hüfte, bis man Kind oder Reifen antippt oder wegzieht. */
export const hula: BehaviorFactory = (toy) => {
  let kid: Kid | undefined;

  const detach = (drop: boolean) => {
    const k = kid;
    if (!k) return;
    kid = undefined;
    k.hula = undefined;
    k.off('tapped', onKidTouched);
    k.off('grabbed', onKidTouched);
    if (k.active) k.setAngle(0);
    // Reifen fällt vor die Füße
    if (drop && toy.active) toy.physics.launch(0, 0, k.y + 2);
  };
  const onKidTouched = () => detach(true);

  const attach = (k: Kid): boolean => {
    if (k.mode !== 'idle' || k.hula) return false;
    kid = k;
    k.hula = toy;
    k.on('tapped', onKidTouched);
    k.on('grabbed', onKidTouched);
    toy.physics.stop();
    return true;
  };

  return {
    // Antippen von Kind oder Reifen hält ihn an.
    onTap: () => detach(true),
    onDragStart: () => detach(false),
    onDragEnd: (release) => {
      const cx = toy.x;
      const cy = toy.y - toy.displayHeight / 2;
      const target = (toy.scene as PlaygroundScene)
        .kidsOnMeadow()
        .find((k) => k.mode === 'idle' && !k.hula && k.getBounds().contains(cx, cy));
      if (target && attach(target)) release.handled = true;
    },
    onKidDropped: attach,
    update: () => {
      if (!kid) return;
      if (!kid.active || kid.mode !== 'idle') {
        detach(true);
        return;
      }
      const t = (toy.scene.time.now / 1000) * SPIN;
      const hipY = kid.y - kid.displayHeight * 0.42;
      toy.setPosition(kid.x + Math.sin(t) * kid.displayWidth * 0.16, hipY + toy.displayHeight / 2);
      toy.setAngle(Math.sin(t) * 8);
      // Vorne/hinten abwechselnd: sieht aus, als kreise er um den Bauch
      toy.setDepth(kid.depth + (Math.cos(t) > 0 ? 0.5 : -0.5));
      kid.setAngle(-Math.sin(t) * 3);
    },
    onRemove: () => detach(false),
    onDestroy: () => detach(false),
  };
};
