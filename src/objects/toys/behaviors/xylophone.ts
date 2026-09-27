import Phaser from 'phaser';
import type { BehaviorFactory } from './types';

// Platten in der Platzhalter-Grafik (300×110): 8 Stück, jede 34 px breit ab x = 20.
const BAR_LEFT = 20;
const BAR_STEP = 34;
const BARS = 8;
export const XYLOPHONE_COLORS = [0xe63946, 0xf77f00, 0xffd166, 0x06d6a0, 0x118ab2, 0x4d96ff, 0x9b5de5, 0xf15bb5];

/** Xylophon: jede der 8 Platten einzeln antippen → eine Note fliegt hoch. Ton-Ereignis mit Tonhöhe 0–7. */
export const xylophone: BehaviorFactory = (toy) => ({
  onTap: (pointer) => {
    const scene = toy.scene;
    const left = toy.x - toy.displayWidth / 2;
    const wx = pointer ? scene.cameras.main.getWorldPoint(pointer.x, pointer.y).x : toy.x;
    const localX = pointer ? (wx - left) / toy.scaleX : toy.width / 2;
    const bar = Phaser.Math.Clamp(Math.floor((localX - BAR_LEFT) / BAR_STEP), 0, BARS - 1);
    scene.events.emit('sound', { kind: 'xylophone', pitch: bar, x: toy.x });

    const bx = left + (BAR_LEFT + bar * BAR_STEP + BAR_STEP / 2 - 3) * toy.scaleX;
    const by = toy.y - toy.displayHeight * 0.55;
    // Platte leuchtet kurz auf
    const flash = scene.add.rectangle(bx, by, 26, 70, 0xffffff, 0.7).setDepth(toy.depth + 0.5);
    scene.tweens.add({ targets: flash, alpha: 0, duration: 250, onComplete: () => flash.destroy() });
    // Note fliegt hoch
    const note = scene.add.image(bx, by - 40, 'note').setTint(XYLOPHONE_COLORS[bar]).setDepth(toy.depth + 1);
    scene.tweens.add({
      targets: note,
      y: by - 200 - bar * 8,
      x: bx + Phaser.Math.Between(-30, 30),
      angle: Phaser.Math.Between(-20, 20),
      alpha: 0,
      duration: 1000,
      ease: 'Sine.easeOut',
      onComplete: () => note.destroy(),
    });
  },
});
