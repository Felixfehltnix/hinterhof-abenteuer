import Phaser from 'phaser';
import { WORLD_WIDTH } from '../config';
import { environment } from '../world/environment';

// Höchstens so viele Blasen gleichzeitig (Tablet-Leistung).
const MAX_BUBBLES = 40;
// Blasen liegen vor der Wiese, aber unter Leisten und gezogenen Objekten.
const DEPTH_BUBBLES = 5_000;

/** Eine Seifenblase: steigt schillernd auf, platzt beim Antippen oder nach ein paar Sekunden. */
export class Bubble extends Phaser.GameObjects.Image {
  private static count = 0;
  private readonly phase = Math.random() * 10;
  private readonly rise = Phaser.Math.Between(60, 110);
  private readonly lifetime = Phaser.Math.Between(5000, 8000);
  private age = 0;
  private vx = Phaser.Math.Between(-40, 40);
  private popped = false;

  static spawn(scene: Phaser.Scene, x: number, y: number): Bubble | null {
    if (Bubble.count >= MAX_BUBBLES) return null;
    return new Bubble(scene, x, y);
  }

  private constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'bubble');
    Bubble.count++;
    this.setScale(Phaser.Math.FloatBetween(0.5, 1.1)).setDepth(DEPTH_BUBBLES);
    scene.add.existing(this);
    this.addToUpdateList();
    // Große Touch-Fläche, auch für kleine Blasen
    this.setInteractive({ hitArea: new Phaser.Geom.Circle(30, 30, 50), hitAreaCallback: Phaser.Geom.Circle.Contains });
    this.setData('onTap', () => this.pop());
    this.once(Phaser.GameObjects.Events.DESTROY, () => Bubble.count--);
  }

  preUpdate(_time: number, delta: number): void {
    if (this.popped) return;
    const dt = delta / 1000;
    this.age += delta;
    const t = this.scene.time.now / 1000;
    this.vx += environment.wind * 0.9 * dt;
    this.vx *= Math.exp(-0.5 * dt);
    this.x += (this.vx + Math.sin(t * 2 + this.phase) * 30) * dt;
    this.y -= this.rise * dt;
    const r = this.displayWidth / 2;
    if (this.x < r || this.x > WORLD_WIDTH - r) this.vx = -this.vx;
    this.x = Phaser.Math.Clamp(this.x, r, WORLD_WIDTH - r);
    // Schillern
    const hue = (t * 0.15 + this.phase) % 1;
    this.setTint(Phaser.Display.Color.HSVToRGB(hue, 0.35, 1).color);
    if (this.age > this.lifetime || this.y < r + 10) this.pop();
  }

  pop(): void {
    if (this.popped) return;
    this.popped = true;
    this.scene.events.emit('sound', { kind: 'bubble', x: this.x });
    this.disableInteractive();
    this.scene.tweens.add({
      targets: this,
      scale: this.scale * 1.4,
      alpha: 0,
      duration: 160,
      ease: 'Quad.easeOut',
      onComplete: () => this.destroy(),
    });
  }
}
