// Die Kinder aus der Nachbarschaft. Aktuell Platzhalter mit Farben;
// später kommt hier pro Kind der Pfad zur fertigen Grafik dazu.

export interface CharacterDef {
  id: string;
  name: string;
  shirt: number;
  pants: number;
  hair: number;
  skin: number;
  x: number;
  y: number;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'kind-a',
    name: 'Kind A',
    shirt: 0xff6b6b,
    pants: 0x3d5a80,
    hair: 0x6b3e26,
    skin: 0xf4c9a3,
    x: 460,
    y: 960,
  },
  {
    id: 'kind-b',
    name: 'Kind B',
    shirt: 0x4d96ff,
    pants: 0x2b2d42,
    hair: 0xf2c14e,
    skin: 0xe0ac86,
    x: 1700,
    y: 990,
  },
];
