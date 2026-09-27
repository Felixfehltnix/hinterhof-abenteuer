# CLAUDE.md – Hinterhof-Abenteuer

Kinder-Spiel im Stil eines digitalen Puppenhauses: Figuren und Gegenstände auf einer
Spielwiese antippen und herumziehen. Kein Gewinnen, kein Verlieren, kein Text im Spiel.

## Stack
- TypeScript + Vite, Phaser 3, Capacitor (Android)
- `npm run dev` für den Browser, `npm run build` muss fehlerfrei durchlaufen (inkl. `tsc`)

## Konventionen
- Feste Auflösung 1920×1080, Querformat. Alle Koordinaten in diesem System.
- Position eines Objekts = Fußpunkt (Origin 0.5, 1).
- Tiefe = y-Koordinate (weiter unten = weiter vorne). Gezogene Objekte: `DEPTH_DRAGGING`.
- Inhalte (Spielgeräte, Gegenstände, Figuren) stehen als Daten in `src/data/`.
  Neues Zeug zuerst dort anlegen, Verhalten in `src/objects/`.
- Neue Spielgeräte: Klasse in `src/objects/Equipment.ts` von `Equipment` ableiten,
  `accepts()`/`use()`/`update()` überschreiben, in `createEquipment()` eintragen.
- Tippen: `obj.setData('onTap', fn)`. Die Szene ruft das auf, wenn nicht gezogen wurde.
- Grafiken: Platzhalter entstehen in `BootScene`. Echte PNGs kommen nach `public/assets/`
  und werden in `BootScene.preload()` unter demselben Texture-Key geladen.
- Code-Kommentare auf Deutsch, Bezeichner auf Englisch.

## Zielgruppe
Kleine Kinder: große Touch-Flächen, sofortiges Feedback, nichts, was man kaputt machen
kann, keine Menüs, keine Werbung, keine Netzwerkzugriffe.
