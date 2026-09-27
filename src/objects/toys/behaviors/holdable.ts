import type { PlaygroundScene } from '../../../scenes/PlaygroundScene';
import type { Kid } from '../../Kid';
import { drawString } from '../string';
import type { BehaviorFactory } from './types';

/**
 * Ein Kind kann das Spielzeug an der Schnur halten: Spielzeug auf ein Kind ziehen oder
 * ein Kind auf das Spielzeug ziehen. Es schwebt dann params.holdHeight über der Hand
 * und folgt dem Kind überallhin. Wegziehen = loslassen.
 */
export const holdable: BehaviorFactory = (toy) => {
  let line: Phaser.GameObjects.Graphics | undefined;
  const phase = Math.random() * 10;

  const attach = (kid: Kid): boolean => {
    if (kid.holding || kid.mode === 'leaving' || toy.heldBy) return false;
    toy.heldBy = kid;
    kid.holding = toy;
    toy.physics.stop();
    line ??= toy.scene.add.graphics();
    return true;
  };

  const detach = () => {
    const kid = toy.heldBy;
    if (!kid) return;
    if (kid.holding === toy) kid.holding = undefined;
    toy.heldBy = undefined;
    line?.clear();
    toy.setAngle(0);
  };

  return {
    onDragStart: detach,
    onDragEnd: (release) => {
      const scene = toy.scene as PlaygroundScene;
      const cx = toy.x;
      const cy = toy.y - toy.displayHeight / 2;
      const kid = scene.kidsOnMeadow().find((k) => !k.holding && k.getBounds().contains(cx, cy));
      if (kid && attach(kid)) release.handled = true;
    },
    onKidDropped: attach,
    update: (delta) => {
      const kid = toy.heldBy;
      if (!kid || !line) return;
      if (!kid.active || kid.mode === 'leaving') {
        // Das Kind geht: Spielzeug bleibt zurück (Schwebendes schwebt weiter, der Rest fällt).
        detach();
        if (!toy.def.behaviors.includes('float')) toy.physics.launch(0, 0);
        return;
      }
      const hand = kid.handPoint();
      const t = toy.scene.time.now / 1000;
      const sway = Math.sin(t * 1.6 + phase) * 14;
      const tx = hand.x + sway;
      const ty = Math.max(toy.displayHeight + 10, hand.y - toy.params.holdHeight + Math.sin(t * 2.1 + phase) * 6);
      // Weich hinterherziehen statt springen
      const k = 1 - Math.exp(-8 * (delta / 1000));
      toy.setPosition(toy.x + (tx - toy.x) * k, toy.y + (ty - toy.y) * k);
      toy.setAngle(sway * 0.4);
      toy.setDepth(kid.depth + 1);
      line.setDepth(kid.depth + 1);
      drawString(line, hand.x, hand.y, toy.x, toy.y - 4, 10);
    },
    onDestroy: () => {
      detach();
      line?.destroy();
    },
  };
};
