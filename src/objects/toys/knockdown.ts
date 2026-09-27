import Phaser from 'phaser';
import { GROUND_MAX_Y, GROUND_MIN_Y } from '../../config';
import { ballsNear, speedOf } from './behaviors/targets';
import type { ToyBehavior } from './behaviors/types';
import type { Toy } from './Toy';

/** Ein Platz im Aufbau, relativ zum Fußpunkt des Spielzeugs. */
export interface Slot {
  dx: number;
  dy: number;
}

export interface KnockdownConfig {
  texture: string;
  slots: Slot[];
  /** Trifft dieser Ball? (großzügig prüfen) */
  hits(toy: Toy, ball: Toy): boolean;
  /** Wie hoch die Teile beim Umfallen hüpfen (px). */
  hop: number;
  /** Wie weit sie wegpurzeln (px). */
  spread: number;
}

const MIN_HIT_SPEED = 120;

/**
 * Gemeinsame Logik für Dosenpyramide und Kegel: Teile stehen auf ihren Plätzen und folgen
 * dem Spielzeug. Ein Ball trifft → alle purzeln um. Umgefallene Teile oder das Spielzeug
 * antippen → alles baut sich wieder auf (beliebig oft).
 */
export function knockdown(toy: Toy, config: KnockdownConfig): ToyBehavior {
  let state: 'up' | 'down' | 'moving' = 'up';
  const pieces = config.slots.map((slot) => {
    const piece = toy.scene.add.image(toy.x + slot.dx, toy.y + slot.dy, config.texture).setOrigin(0.5, 1);
    const pad = 35;
    piece.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-pad, -pad, piece.width + 2 * pad, piece.height + 2 * pad),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    piece.input!.enabled = false;
    piece.setData('onTap', () => rebuild());
    return piece;
  });

  const placeOnSlots = () => {
    pieces.forEach((p, i) => {
      const slot = config.slots[i];
      p.setPosition(toy.x + slot.dx, toy.y + slot.dy).setDepth(toy.depth + 1 + i * 0.01);
    });
  };

  const fall = (ball: Toy) => {
    state = 'moving';
    const tweens = toy.scene.tweens;
    const dir = Math.sign(ball.physics.vx) || (Math.random() < 0.5 ? -1 : 1);
    ball.physics.vx *= 0.4;
    pieces.forEach((p, i) => {
      const tx = p.x + dir * Phaser.Math.Between(config.spread * 0.2, config.spread) + Phaser.Math.Between(-40, 40);
      const ty = Phaser.Math.Clamp(toy.y + Phaser.Math.Between(-30, 50), GROUND_MIN_Y, GROUND_MAX_Y);
      const angle = dir * Phaser.Math.Between(75, 105) * (Math.random() < 0.8 ? 1 : -1);
      p.setDepth(ty);
      tweens.add({ targets: p, x: tx, angle, duration: 650, delay: i * 30, ease: 'Quad.easeOut' });
      tweens.chain({
        targets: p,
        tweens: [
          { y: Math.min(p.y, ty) - Phaser.Math.Between(config.hop * 0.5, config.hop), duration: 220, delay: i * 30, ease: 'Quad.easeOut' },
          { y: ty, duration: 430, ease: 'Bounce.easeOut' },
        ],
        onComplete: () => {
          p.input!.enabled = true;
          if (i === pieces.length - 1) state = 'down';
        },
      });
    });
  };

  const rebuild = () => {
    if (state !== 'down') return;
    state = 'moving';
    pieces.forEach((p, i) => {
      p.input!.enabled = false;
      const slot = config.slots[i];
      toy.scene.tweens.add({
        targets: p,
        x: toy.x + slot.dx,
        y: toy.y + slot.dy,
        angle: 0,
        duration: 380,
        delay: i * 70,
        ease: 'Back.easeOut',
        onComplete: () => {
          if (i === pieces.length - 1) {
            state = 'up';
            placeOnSlots();
          }
        },
      });
    });
  };

  return {
    onTap: rebuild,
    update: () => {
      if (state !== 'up') return;
      placeOnSlots();
      if (toy.isDragging) return;
      const ball = ballsNear(toy).find((b) => speedOf(b) >= MIN_HIT_SPEED && config.hits(toy, b));
      if (ball) fall(ball);
    },
    onDestroy: () => pieces.forEach((p) => p.destroy()),
  };
}
