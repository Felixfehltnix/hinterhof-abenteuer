import Phaser from 'phaser';
import { writeSave, type SaveData } from './storage';

// So oft wird nachgesehen, ob sich etwas geändert hat (ms).
const CHECK_INTERVAL = 250;
// Gespeichert wird erst, wenn sich so lange nichts mehr geändert hat (ms).
const QUIET_TIME = 500;

/**
 * Speichert automatisch: vergleicht regelmäßig den aktuellen Stand mit dem zuletzt
 * gespeicherten und schreibt gebündelt, sobald es kurz ruhig ist. Geht die App in den
 * Hintergrund (oder wird geschlossen), wird sofort gespeichert.
 */
export class AutoSave {
  private saved: string;
  private current: string;
  private lastChange = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly snapshot: () => SaveData,
  ) {
    // Der Anfangszustand (geladen oder Standard) muss nicht gleich gespeichert werden.
    this.saved = this.current = JSON.stringify(snapshot());
    scene.time.addEvent({ delay: CHECK_INTERVAL, loop: true, callback: () => this.check() });

    const onHidden = () => {
      if (document.visibilityState === 'hidden') this.flush();
    };
    const onPageHide = () => this.flush();
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', onPageHide);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', onPageHide);
    });
  }

  /** Sofort speichern, falls sich etwas geändert hat. */
  flush(): void {
    this.current = JSON.stringify(this.snapshot());
    this.write();
  }

  private check(): void {
    const now = JSON.stringify(this.snapshot());
    if (now !== this.current) {
      this.current = now;
      this.lastChange = this.scene.time.now;
    }
    if (this.current !== this.saved && this.scene.time.now - this.lastChange >= QUIET_TIME) this.write();
  }

  private write(): void {
    if (this.current === this.saved) return;
    writeSave(JSON.parse(this.current) as SaveData);
    this.saved = this.current;
  }
}
