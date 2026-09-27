import type { BehaviorFactory } from './types';

/** Trommel: Antippen → wackelt, Schallringe breiten sich aus. Sendet ein Ton-Ereignis. */
export const drum: BehaviorFactory = (toy) => ({
  onTap: () => {
    const scene = toy.scene;
    scene.events.emit('sound', { kind: 'drum', pitch: 0, x: toy.x });
    scene.tweens.killTweensOf(toy);
    toy.setScale(1);
    scene.tweens.add({ targets: toy, scaleY: 0.88, scaleX: 1.06, duration: 70, yoyo: true, ease: 'Quad.easeOut' });
    const y = toy.y - toy.displayHeight + 12;
    for (let i = 0; i < 3; i++) {
      const ring = scene.add.ellipse(toy.x, y, 60, 20).setStrokeStyle(5, 0xffd166).setDepth(toy.depth + 1).setAlpha(0);
      scene.tweens.add({
        targets: ring,
        scaleX: 3.2,
        scaleY: 3.2,
        alpha: { from: 0.9, to: 0 },
        duration: 600,
        delay: i * 110,
        ease: 'Quad.easeOut',
        onComplete: () => ring.destroy(),
      });
    }
  },
});
