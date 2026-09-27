import { DEPTH_LIGHTS } from '../../../config';
import type { BehaviorFactory } from './types';

/** Taschenlampe: Antippen = an/aus. Der Lichtkegel leuchtet in Blickrichtung (auch nachts über der Dunkelheit). */
export const flashlight: BehaviorFactory = (toy) => {
  let on = false;
  const cone = toy.scene.add.image(toy.x, toy.y, 'lightcone').setBlendMode('ADD').setVisible(false).setDepth(DEPTH_LIGHTS);

  return {
    onTap: () => {
      on = !on;
      toy.scene.events.emit('sound', { kind: 'click', x: toy.x });
    },
    update: () => {
      cone.setVisible(on && toy.visible);
      if (!on) return;
      const dir = toy.flipX ? -1 : 1;
      cone
        .setOrigin(dir > 0 ? 0 : 1, 0.5)
        .setFlipX(dir < 0)
        .setPosition(toy.x + (dir * toy.displayWidth) / 2 - dir * 4, toy.y - toy.displayHeight / 2)
        .setAngle(dir * 10);
    },
    onDestroy: () => cone.destroy(),
  };
};
