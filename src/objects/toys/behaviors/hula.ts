import Phaser from 'phaser';
import type { PlaygroundScene } from '../../../scenes/PlaygroundScene';
import type { Kid } from '../../Kid';
import type { BehaviorFactory } from './types';

const SPIN = 9; // Umdrehungen pro … (Winkelgeschwindigkeit in rad/s)

/**
 * Hula-Hoop: Auf ein Kind ziehen → kreist um die Hüfte, bis man Kind oder Reifen antippt oder wegzieht.
 * Beim Kreisen liegt die hintere Hälfte hinter dem Kind, die vordere davor.
 */
export const hula: BehaviorFactory = (toy) => {
  let kid: Kid | undefined;
  // Beim Kreisen zwei Hälften derselben Grafik: Die obere Hälfte der Ellipse ist der hintere Teil
  // des Reifens (hinter dem Kind), die untere der vordere (davor zeichnet der Reifen selbst).
  let back: Phaser.GameObjects.Image | undefined;
  const half = toy.height / 2;

  const detach = (drop: boolean) => {
    const k = kid;
    if (!k) return;
    kid = undefined;
    k.hula = undefined;
    k.off('tapped', onKidTouched);
    k.off('grabbed', onKidTouched);
    if (k.active) k.setAngle(0);
    // Wieder ein ganzer, einteiliger Reifen
    back?.destroy();
    back = undefined;
    if (toy.active) toy.setCrop();
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
    back = toy.scene.add.image(toy.x, toy.y, toy.texture.key).setOrigin(toy.originX, toy.originY).setCrop(0, 0, toy.width, half);
    toy.setCrop(0, half, toy.width, half);
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
      // Die Ellipse wandert mit dem Hüftschwung und kippt dabei mit
      toy.setPosition(kid.x + Math.sin(t) * kid.displayWidth * 0.16, hipY + toy.displayHeight / 2);
      toy.setAngle(Math.sin(t) * 8);
      // Vordere Hälfte vor dem Kind, hintere dahinter (hinter Rumpf, Armen und Beinen)
      toy.setDepth(kid.depth + 0.5);
      back?.setPosition(toy.x, toy.y).setAngle(toy.angle).setScale(toy.scaleX, toy.scaleY).setDepth(kid.depth - 0.5);
      kid.setAngle(-Math.sin(t) * 3);
    },
    onRemove: () => detach(false),
    onDestroy: () => detach(false),
  };
};
