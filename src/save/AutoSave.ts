import Phaser from 'phaser';
import { writeSave, type SaveData } from './storage';

// So oft wird nachgesehen, ob sich etwas geändert hat (ms).
const CHECK_INTERVAL = 250;
// Gespeichert wird erst, wenn sich so lange nichts mehr geändert hat (ms).
const QUIET_TIME = 500;
// Spätestens so lange nach der ersten ungespeicherten Änderung wird trotzdem geschrieben (ms),
// auch wenn es nie ruhig wird (z. B. die Schneedecke wächst ständig).
const MAX_WAIT = 3000;

/**
 * Speichert automatisch: vergleicht regelmäßig den aktuellen Stand mit dem zuletzt
 * gespeicherten und schreibt gebündelt, sobald es kurz ruhig ist – spätestens aber nach
 * MAX_WAIT, falls sich ständig etwas ändert. Geht die App in den
 * Hintergrund (oder wird geschlossen), wird sofort gespeichert.
 */
export class AutoSave {
  private saved: string;
  private current: string;
  private lastChange = 0;
  /** Seit wann gibt es ungespeicherte Änderungen? undefined = alles gespeichert. */
  private dirtySince: number | undefined;

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
    const time = this.scene.time.now;
    const now = JSON.stringify(this.snapshot());
    if (now !== this.current) {
      this.current = now;
      this.lastChange = time;
    }
    if (this.current === this.saved) {
      this.dirtySince = undefined;
      return;
    }
    this.dirtySince ??= this.lastChange;
    if (time - this.lastChange >= QUIET_TIME || time - this.dirtySince >= MAX_WAIT) this.write();
  }

  private write(): void {
    if (this.current === this.saved) return;
    writeSave(JSON.parse(this.current) as SaveData);
    this.saved = this.current;
    this.dirtySince = undefined;
  }
}
