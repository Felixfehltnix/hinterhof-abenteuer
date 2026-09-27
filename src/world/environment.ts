// Gemeinsamer Umwelt-Zustand, den Spielzeuge und Effekte abfragen.
// Das Wetter (#13, #14) setzt die Werte; alles andere liest nur.

export type TimeOfDay = 'morning' | 'noon' | 'evening' | 'night';

/** Wetterarten. Wind (#14) und Schnee (#15) kommen dazu. */
export type WeatherKind = 'sunny' | 'cloudy' | 'rain';

export const environment = {
  /** Aktuelle Tageszeit (Ziel des gerade laufenden Übergangs). */
  timeOfDay: 'noon' as TimeOfDay,
  /** Aktuelles Wetter. */
  weather: 'sunny' as WeatherKind,
  /** Wind in px/s² (positiv = nach rechts). Leichte Dinge driften damit mit. */
  wind: 0,
};

/** Regnet es gerade? */
export function isRaining(): boolean {
  return environment.weather === 'rain';
}
