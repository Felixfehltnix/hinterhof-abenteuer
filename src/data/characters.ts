// Die Kinder aus der Nachbarschaft. Aktuell Platzhalter mit Farben;
// später kommt pro Kind eine fertige Grafik unter dem Key `kid-<id>` (ganze Figur)
// und `portrait-<id>` (nur der Kopf, fürs Gartentor) dazu.

export type HairStyle = 'short' | 'long' | 'pigtails' | 'curly' | 'spiky' | 'bun';

export interface CharacterDef {
  id: string;
  name: string;
  shirt: number;
  pants: number;
  hair: number;
  hairStyle: HairStyle;
  skin: number;
  /** Größe relativ zur Standardfigur (140×240). */
  size: number;
}

export const CHARACTERS = [
  { id: 'kind-a', name: 'Kind A', shirt: 0xff6b6b, pants: 0x3d5a80, hair: 0x6b3e26, hairStyle: 'short', skin: 0xf4c9a3, size: 1 },
  { id: 'kind-b', name: 'Kind B', shirt: 0x4d96ff, pants: 0x2b2d42, hair: 0xf2c14e, hairStyle: 'long', skin: 0xe0ac86, size: 1.05 },
  { id: 'kind-c', name: 'Kind C', shirt: 0x06d6a0, pants: 0x6c584c, hair: 0x2b1b12, hairStyle: 'curly', skin: 0x8d5524, size: 0.9 },
  { id: 'kind-d', name: 'Kind D', shirt: 0xffd166, pants: 0x118ab2, hair: 0xc1440e, hairStyle: 'pigtails', skin: 0xffdbac, size: 0.82 },
  { id: 'kind-e', name: 'Kind E', shirt: 0x9b5de5, pants: 0x3a3a3a, hair: 0x1b1b1b, hairStyle: 'spiky', skin: 0xc68642, size: 1.1 },
  { id: 'kind-f', name: 'Kind F', shirt: 0xf15bb5, pants: 0x00bbf9, hair: 0x5a3825, hairStyle: 'bun', skin: 0xf1c27d, size: 0.95 },
  { id: 'kind-g', name: 'Kind G', shirt: 0xfb8500, pants: 0x264653, hair: 0xe9d8a6, hairStyle: 'short', skin: 0xffe0bd, size: 0.78 },
  { id: 'kind-h', name: 'Kind H', shirt: 0x2a9d8f, pants: 0x9d0208, hair: 0x3d2314, hairStyle: 'long', skin: 0xa0662f, size: 1.12 },
] as const satisfies readonly CharacterDef[];

export type CharacterId = (typeof CHARACTERS)[number]['id'];

export function getCharacterDef(id: CharacterId): CharacterDef {
  const def = CHARACTERS.find((c) => c.id === id);
  if (!def) throw new Error(`Unbekanntes Kind: ${id}`);
  return def;
}
