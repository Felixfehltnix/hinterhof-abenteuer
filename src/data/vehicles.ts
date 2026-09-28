// Maße der Fahrzeuge relativ zum Fußpunkt (Fahrzeug schaut nach rechts).
// Passend zu den Platzhalter-Grafiken – bei echten Grafiken hier anpassen.

export type RideStyle = 'sit' | 'run' | 'push' | 'cart';

export interface VehicleDef {
  /** Wie das Kind fährt: sitzen und wippen, laufen, stehen und abstoßen, in der Karre sitzen. */
  style: RideStyle;
  /**
   * Stehende Fahrstile (run, push): Fußpunkt des Kindes. Sitzende (sit, cart): wo die Hüfte
   * aufsitzt – die Beine hängen dann je nach Pose darunter bzw. nach vorn.
   */
  seat: { dx: number; dy: number };
  /** Radmitten und Radius. */
  wheels: { dx: number; dy: number; r: number }[];
  /** Ladefläche für Spielzeug (nur Schubkarre). */
  cargo?: { dx: number; dy: number };
  /** Antippen hupt (nur Bobbycar). */
  honk?: boolean;
}

export const VEHICLES: Record<string, VehicleDef> = {
  bobbycar: {
    style: 'sit',
    seat: { dx: -22, dy: -58 },
    wheels: [
      { dx: -55, dy: -22, r: 22 },
      { dx: 55, dy: -22, r: 22 },
    ],
    honk: true,
  },
  balancebike: {
    style: 'run',
    seat: { dx: -8, dy: 0 },
    wheels: [
      { dx: -60, dy: -27, r: 27 },
      { dx: 60, dy: -27, r: 27 },
    ],
  },
  scooter: {
    style: 'push',
    seat: { dx: -22, dy: -18 },
    wheels: [
      { dx: -52, dy: -14, r: 14 },
      { dx: 48, dy: -14, r: 14 },
    ],
  },
  wheelbarrow: {
    style: 'cart',
    // Sitzt vorn auf dem Wannenrand, die Beine baumeln vorn über den Rand.
    seat: { dx: 22, dy: -86 },
    cargo: { dx: 8, dy: -48 },
    wheels: [{ dx: 72, dy: -24, r: 24 }],
  },
};
