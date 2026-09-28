import type { PlaygroundScene } from '../../../scenes/PlaygroundScene';
import type { LightSource } from '../../../world/LightLayer';
import type { BehaviorFactory } from './types';

/**
 * Taschenlampe: Antippen = an/aus. Der Lichtkegel leuchtet in Blickrichtung, auch nachts über der
 * Dunkelheit (Lichtebene). Kinder und Dinge, die vor dem haltenden Kind stehen, verdecken ihn.
 */
export const flashlight: BehaviorFactory = (toy) => {
  let on = false;
  const scene = toy.scene as PlaygroundScene;
  const cone = scene.add.image(toy.x, toy.y, 'lightcone').setBlendMode('ADD').setVisible(false);
  const light: LightSource = {
    objects: [cone],
    // Gehalten: auf der Tiefe des Kindes (leuchtet vor ihm), sonst knapp vor der Lampe
    depth: () => (toy.heldBy ? toy.heldBy.depth : toy.depth + 0.5),
    active: () => cone.visible,
  };
  scene.lightLayer.add(light);

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
    onDestroy: () => {
      scene.lightLayer.remove(light);
      cone.destroy();
    },
  };
};
