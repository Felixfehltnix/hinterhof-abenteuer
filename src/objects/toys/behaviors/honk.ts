import type { BehaviorFactory } from './types';

/** Antippen: Hupe! Das Fahrzeug federt, Schallbögen gehen vorne raus (Ton kommt später). */
export const honk: BehaviorFactory = (toy) => ({
  onTap: () => {
    const scene = toy.scene;
    // Für den späteren Sound: ein Ereignis, auf das eine Tonausgabe hören kann.
    scene.events.emit('sound', { kind: 'honk', x: toy.x });
    if (!scene.tweens.isTweening(toy)) {
      scene.tweens.add({ targets: toy, scaleY: 0.9, scaleX: 1.06, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
    }
    const dir = toy.flipX ? -1 : 1;
    const x = toy.x + dir * (toy.displayWidth / 2 + 10);
    const y = toy.y - toy.displayHeight * 0.6;
    for (let i = 0; i < 3; i++) {
      const g = scene.add.graphics({ x, y }).setDepth(toy.depth + 1);
      g.lineStyle(5, 0xffd166);
      g.beginPath();
      g.arc(0, 0, 18 + i * 14, dir > 0 ? -0.7 : Math.PI - 0.7, dir > 0 ? 0.7 : Math.PI + 0.7, false);
      g.strokePath();
      g.setAlpha(0);
      scene.tweens.add({
        targets: g,
        alpha: { from: 1, to: 0 },
        x: x + dir * 30,
        duration: 450,
        delay: i * 90,
        onComplete: () => g.destroy(),
      });
    }
  },
});
