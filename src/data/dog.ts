// Der Hund im Hinterhof: ein schwarzer Labrador, der immer auf der Wiese lebt.
// Maße in px (Weltkoordinaten), Zeiten in ms, Geschwindigkeiten in px/s.

export const DOG = {
  /** Wo er beim allerersten Start liegt (Fußpunkt). */
  start: { x: 1000, y: 1010 },
  trotSpeed: 170,
  runSpeed: 540,
  /** So lange trödelt er, bevor er etwas Neues macht. */
  idleMin: 3500,
  idleMax: 8000,
  /** So weit läuft er beim Herumstreunen höchstens. */
  wanderRange: 420,
  /** Geworfenes in diesem Umkreis (waagerecht) jagt er. */
  fetchRange: 1500,
  /** Kinder in diesem Umkreis bekommen das Apportierte gebracht. */
  deliverRange: 1800,
  /** Abstand zum Kind beim Abgeben. */
  deliverGap: 120,
  /** Nach so vielen ms Jagd gibt er auf. */
  chaseTimeout: 9000,
  /** Fliegt etwas so nah (waagerecht/in der Tiefe) und so hoch über ihm, springt er und fängt es. */
  catchReach: 80,
  catchDepth: 70,
  catchHeightMin: 30,
  catchHeightMax: 220,
  /** So lange nach dem Nasswerden schüttelt er sich. */
  shakeDelay: 900,
  shakeMs: 1100,
  /** Tropfen spritzen so weit; Kinder darin kichern. */
  shakeReach: 230,
  /** Kind antippen/stupsen: so nah geht er heran. */
  nuzzleGap: 95,
  /** Tippt ihn nachts jemand an, bleibt er so lange wach. */
  awakeMs: 15000,
  /** Maul relativ zum Halsgelenk (in Kopfrichtung, ungespiegelt). */
  mouth: { dx: 54, dy: -12 },
  /** Ganze Figur verkleinert (Teile sind in voller Größe gezeichnet). */
  scale: 0.85,
};
