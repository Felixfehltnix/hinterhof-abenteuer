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
- Tippen: `obj.setData('onTap', fn)`. Die Szene ruft `fn(pointer)` auf, wenn nicht gezogen wurde.
- Grafiken: Platzhalter entstehen in `BootScene` (Spielzeuge: `src/scenes/placeholders/toys.ts`). Echte PNGs kommen nach `public/assets/`
  und werden in `BootScene.preload()` unter demselben Texture-Key geladen.
- Code-Kommentare auf Deutsch, Bezeichner auf Englisch.

## Kinder
- Alle Kinder stehen in `src/data/characters.ts`, wer beim Start da ist in `PLACED_KIDS`
  (`src/data/playground.ts`). Die übrigen holt man durchs Gartentor.
- Texturen: `kid-<id>` (ganze Figur) und `portrait-<id>` (Kopf fürs Tor),
  Platzhalter in `src/scenes/placeholders/kids.ts`.
- Kinder kommen nur über `scene.spawnKid()` auf die Wiese und gehen über `GardenGate.sendHome()`.
  Wer ein Kind festhält (`Seat`), muss `unseat()` sauber umsetzen.

## Töne (vorbereitet)
Noch gibt es keinen Ton. Alles, was klingen soll, sendet `scene.events.emit('sound', { kind, pitch?, x })`.
Bisher: `honk`, `drum` (pitch 0), `xylophone` (pitch 0–7), `sprinkler-on`/`-off`, `click`, `peekaboo`.
Eine spätere Tonausgabe muss nur auf `'sound'` hören.

## Speichern
- Die Wiese speichert sich automatisch lokal (`src/save/`, localStorage, kein Netzwerk).
  `AutoSave` vergleicht alle 250 ms den Stand und schreibt 500 ms nach der letzten Änderung.
- Gespeichert werden Kinder und Spielzeuge mit ihrer `restPosition()` (laufende Aktionen
  zählen nicht) sowie Weltzustände, die per `scene.registerWorldState(key, …)` angemeldet sind.
- Format ändern: `SAVE_VERSION` erhöhen. Unbekannte Versionen und kaputte Daten führen zur
  Standard-Wiese (`PLACED_KIDS`/`PLACED_TOYS`), nie zu einem Absturz.

## So fügt man ein Spielzeug hinzu
1. Eintrag in `TOYS` in `src/data/toys.ts`: `id` (zugleich Texture-Key), `width`/`height`,
   `behaviors` (Bausteine) und optional `params` (Abweichungen von `DEFAULT_TOY_PARAMS`,
   z. B. `bounce`, `gravity`, `airDrag`, `spin`).
2. Platzhalter-Zeichnung unter derselben id in `src/scenes/placeholders/toys.ts`
   (fehlt sie, meldet `tsc` einen Fehler).
3. Es erscheint automatisch in der Spielzeugkiste. Soll es beim Start schon auf der Wiese liegen: Eintrag in `PLACED_TOYS` in `src/data/playground.ts`.

Szenencode bleibt unberührt. Vorhandene Bausteine (`src/objects/toys/behaviors/`):
`draggable` (ziehen, landet auf der Wiese), `fling` (schnell loslassen = werfen),
`kick` (Antippen = Schuss im Bogen), `wobble` (Antippen = wackeln),
`glide` (gleitet mit `params.lift`, z. B. Frisbee), `kidKick` (auf ein Kind fallen lassen = Kind kickt),
`plane` (Papierflieger mit Looping), `boomerang` (kommt zurück), `kite` (steigt beim Ziehen an
der Schnur), `float` (schwebt am Himmel), `holdable` (Kind hält es an der Schnur, `params.holdHeight`),
`pop` (Antippen = platzt mit Konfetti), `bubbles` (Antippen = Seifenblasen).
`hoop` (Basketballkorb mit Zielhilfe), `goal` (Fußballtor, Kinder jubeln), `cans`/`pins`
(Dosen/Kegel purzeln, Antippen baut neu auf; gemeinsame Logik in `toys/knockdown.ts`).
Treffer-Ziele reagieren nur auf Spielzeuge mit `tags: ['ball']`; Treffer bewusst großzügig.
`rideable` (Fahrzeug: Kind aufsitzen, fahren, ausrollen; Maße in `src/data/vehicles.ts`),
`honk` (Antippen = Hupe; sendet `scene.events.emit('sound', { kind })` für den späteren Sound).
`trampoline`, `seesaw`, `hopper` (Hüpfball), `pool` (Planschbecken): Kinder sitzen über den
Helfer `toys/seats.ts` (`ToySeats`, Seat-Prinzip). `hula`: Reifen kreist um ein Kind, hört auf
bei `kid.emit('tapped'|'grabbed')`.
`dig` (Schaufel), `fillable` (Eimer füllt sich), `mold` (Sandkuchen), `water` (Gießkanne,
Blumen), `sprinkler` (Partikel-Fontäne). Blumen und Sandkuchen verwaltet `src/objects/Garden.ts`
(`scene.garden`, gespeichert als Weltzustand `garden`, Obergrenzen 30 bzw. 5).
Hook `onReceive(kind, amount)` über `toy.receive()` (z. B. Sand in den Eimer).
`drum`, `xylophone` (Platte aus der Tippstelle), `tent` (Kinder verstecken sich, Modus `hiding`),
`handheld` (Kind hält es in der Hand), `flashlight` (Lichtkegel, Tiefe `DEPTH_LIGHTS`).
Weitere Hooks: `onToyDropped` (Spielzeug auf Spielzeug, z. B. Schubkarre), `onRemove`
(vor dem Wegräumen: Kinder absteigen lassen, Ladung ausschütten).
Bausteine können beim Loslassen `release.handled = true` setzen (eigene Bewegung statt Wurf-Physik).
Wind: `src/world/environment.ts` (`environment.wind`), Spielzeuge reagieren mit `params.windFactor`.

Neuer Baustein: Datei in `src/objects/toys/behaviors/` mit einer `BehaviorFactory`
(Hooks `onTap`, `onDragStart`, `onDragEnd`, `update`), in `behaviors/index.ts` eintragen,
`BehaviorId` in `toys.ts` erweitern. Bewegung läuft über `toy.physics` (`ToyPhysics`:
Bodenlinie + Höhe, Bildränder sind eine Bande), nicht über eigene Tweens auf x/y.
Aufpralle: `toy.physics.landListeners`. Szene-Abfragen (z. B. Kinder) über `toy.scene as PlaygroundScene`.

## Zielgruppe
Kleine Kinder: große Touch-Flächen, sofortiges Feedback, nichts, was man kaputt machen
kann, keine Menüs, keine Werbung, keine Netzwerkzugriffe.
Ausnahme Inventare: erlaubt, wenn sie Teil der Spielwelt sind (Spielzeugkiste, Gartentor)
und ganz ohne Text auskommen. Dafür gibt es die Leiste `src/objects/Tray.ts`.
