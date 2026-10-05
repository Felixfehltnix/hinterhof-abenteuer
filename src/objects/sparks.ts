import Phaser from 'phaser';

/** Ein paar farbige Funken, die auseinanderfliegen und verblassen (Textur `brew-spark`). */
export function sparkBurst(scene: Phaser.Scene, x: number, y: number, color: number, count = 10, depth = 1000, power = 1): void {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = (40 + Math.random() * 80) * power;
    const img = scene.add.image(x, y, 'brew-spark').setTint(color).setDepth(depth).setScale(0.4 + Math.random() * 0.7);
    scene.tweens.add({
      targets: img,
      x: x + Math.cos(a) * d,
      y: y + Math.sin(a) * d - 30,
      alpha: 0,
      scale: 0.1,
      angle: Math.random() * 180 - 90,
      duration: 500 + Math.random() * 500,
      ease: 'Quad.easeOut',
      onComplete: () => img.destroy(),
    });
  }
}
