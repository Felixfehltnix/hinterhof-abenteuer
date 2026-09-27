// Gemeinsamer Umwelt-Zustand, den Spielzeuge und Effekte abfragen.
// Das Wetter (#13, #14) setzt die Werte; alles andere liest nur.

export type TimeOfDay = 'morning' | 'noon' | 'evening' | 'night';

export const environment = {
  /** Aktuelle Tageszeit (Ziel des gerade laufenden Übergangs). */
  timeOfDay: 'noon' as TimeOfDay,
  /** Wind in px/s² (positiv = nach rechts). Leichte Dinge driften damit mit. */
  wind: 0,
};
