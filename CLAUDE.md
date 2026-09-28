# CLAUDE.md – Hinterhof-Abenteuer

Kinder-Spiel im Stil eines digitalen Puppenhauses: Figuren und Gegenstände auf einer
Spielwiese antippen und herumziehen. Kein Gewinnen, kein Verlieren, kein Text im Spiel.

## Stack
- TypeScript + Vite, Phaser 3, Capacitor (Android)
- `npm run dev` für den Browser, `npm run build` muss fehlerfrei durchlaufen (inkl. `tsc`)

## Konventionen
- Feste Auflösung 1920×1080 (`GAME_WIDTH`), Querformat. Die Welt ist breiter (`WORLD_WIDTH`,
  3 Bildschirme) und scrollt waagerecht (`src/world/CameraControl.ts`, `scene.cameraControl`).
- **Welt- vs. Bildschirm-Koordinaten:** Objekte auf der Wiese leben in Weltkoordinaten; Grenzen
  (Bande, Klemmen) benutzen `WORLD_WIDTH`. Zeiger für Welt-Prüfungen immer über
  `scene.worldPoint(pointer)`, nie `pointer.x`. Fest stehende Dinge (Himmel, Sonne/Mond, Sterne,
  Einfärbung, Regen/Schnee/Blätter, Spielzeugkiste, Leisten) haben `setScrollFactor(0)` und
  rechnen in Bildschirmkoordinaten (`GAME_WIDTH`); Wolken `CLOUD_PARALLAX`. „Zur Bildmitte“
  heißt: `cameras.main.worldView.centerX`.
- Ziehen: Die Szene führt jedes gezogene Objekt selbst nach (`beginDrag`/`followDrag`/`endDrag`,
  Versatz zum Finger bleibt). Neue Arten, etwas zu ziehen (z. B. aus einer Leiste), müssen sich dort
  anmelden, sonst folgen sie beim Scrollen am Bildschirmrand (`EDGE_SCROLL_ZONE`) nicht dem Finger.
  Die Wurfgeschwindigkeit misst die Fingerbewegung auf dem Bildschirm (Mitscrollen ist kein Wurf).
- Position eines Objekts = Fußpunkt (Origin 0.5, 1).
- Tiefe = y-Koordinate (weiter unten = weiter vorne). Gezogene Objekte: `DEPTH_DRAGGING`.
- Tageszeit (`src/world/DayCycle.ts`): Die ganze Szene wird über ein Rechteck mit
  Multiplizieren-Blend auf `DEPTH_TINT` eingefärbt, alles liegt darunter – auch gezogene
  Objekte (`DEPTH_DRAGGING` < `DEPTH_TINT`). Was leuchten soll (Mond, Sterne, Lichterkette,
  Taschenlampe), meldet sich bei der **Lichtebene** an (`scene.lightLayer.add({ objects, depth, active })`,
  `src/world/LightLayer.ts`): Sie zeichnet die Lichter über der Einfärbung (`DEPTH_LIGHTS`) und
  radiert pixelgenau aus, was auf der Welt davor steht (Tiefe größer als `depth()`). Lichter nie
  direkt auf `DEPTH_LIGHTS` legen, sonst scheinen sie durch Kinder hindurch (#52). Himmel, Sonne, Mond und Wolken
  zeichnet der DayCycle, die Szene nur Zaun und Wiese.
- Wetter (`src/world/Weather.ts`): Wolke antippen → nächstes Wetter (`WEATHER_ORDER`).
  Abfragen über `environment.weather` / `isRaining()` / `environment.wind`. Kein Gewitter,
  keine Blitze. Pfützen: `scene.weather.puddleAt(x, y)`.
  Wind setzt `environment.wind` (Grundwind + Böen), `windStrength()` gibt 0..~1,6.
  Spielzeuge driften über `params.windFactor` (in der Luft und am Boden).
  Schnee (`src/world/Snow.ts`): Schneedecke, Mützen, Schmelzen. Schneebälle/Schneemänner sind
  Katalog-Spielzeuge mit `hidden: true` (nicht in der Kiste) und `tags: ['snow']` (schmelzen).
- Inhalte (Spielgeräte, Gegenstände, Figuren) stehen als Daten in `src/data/`.
  Neues Zeug zuerst dort anlegen, Verhalten in `src/objects/`.
- Neue Spielgeräte: Klasse in `src/objects/Equipment.ts` von `Equipment` ableiten,
  `accepts()`/`use()`/`update()` überschreiben, in `createEquipment()` eintragen.
- Tippen: `obj.setData('onTap', fn)`. Die Szene ruft `fn(pointer)` auf, wenn nicht gezogen wurde.
- **Vorrang beim Antippen/Ziehen** (`touchRank` in `PlaygroundScene`): Kinder und kleine Spielzeuge
  gehen vor großen Spielgeräten (`large: true` im Katalog, z. B. Korb, Tor, Pool, Fahrzeuge) und vor
  feststehender Deko (`setData('scenery', true)`, z. B. der Baum) – auch wenn sie dahinter liegen.
  Leisten, Kiste und Tor behalten ihren Platz. Große Deko bekommt eine kleine Touch-Fläche.
- Grafiken: Platzhalter entstehen in `BootScene` (Spielzeuge: `src/scenes/placeholders/toys.ts`). Echte PNGs kommen nach `public/assets/`
  und werden in `BootScene.preload()` unter demselben Texture-Key geladen.
- Code-Kommentare auf Deutsch, Bezeichner auf Englisch.

## Kinder
- Alle Kinder stehen in `src/data/characters.ts`, wer beim Start da ist in `PLACED_KIDS`
  (`src/data/playground.ts`). Die übrigen holt man durchs Gartentor.
- Ein Kind (`Kid`, ein `Container`) besteht aus Teilen an Gelenken: `body`, `head`, `arm-l/-r`,
  `leg-l/-r`. Rig (Maße, Drehpunkte, Gelenke) und Posen in `src/data/poses.ts`,
  `kid.setPose(name, ms)` blendet weich über (Posen: `stand`, `sit`, `sitLegsForward`, `armsUp`,
  `wave`, `dangle`, `hold`). Position = Fußpunkt, Gelenke steuert nur das Kind selbst.
  Kid bietet weiter an, was früher das Einzelbild konnte: `flipX`/`setFlipX`, `displayHeight`,
  `getBounds()` (ganze Figurfläche, unabhängig von der Pose), `setTint`, `setVisible`, `setScale`, `angle`.
  `handPoint()` und `headTop()` folgen der Pose.
- **Animationen** (`src/objects/kidMotion.ts`): Das Kind bewegt sich passend zu seiner Tätigkeit.
  Die Tätigkeit ergibt sich aus `kid.mode`; Spielgeräte sagen höchstens genauer, was das Kind tut:
  `kid.setActivity('ride-run')`, `kid.setActivity('bounce', { height, salto })`,
  `kid.setActivity('seesaw', { up })` (jedes Bild aufrufen ist in Ordnung). Die Gelenke steuert
  allein das Kind: Grundpose je Tätigkeit (`ACTIVITY_POSE`) + Bewegung (`activityMotion`, aus
  Zeit, zurückgelegtem Weg und Geschwindigkeit). Kurze Gesten: `hop`, `cheer`, `giggle`, `yawn`,
  `brace`, `kick`, `wave` (`GESTURES`), Landen nach dem Loslassen: `land()`.
  Wer ein Kind auf einen Sitz setzt, legt die Hüfte auf den Sitz: `y = sitzY + kid.hipHeight()`
  (folgt der Pose, auch während des Überblendens), für Tweens `kid.sitHeight`.
  Gesichter (`kid-<id>-face-blink/-joy/-yawn`) liegen über dem Kopf; fehlen sie, bleibt das Gesicht gleich.
- Texturen: `kid-<id>-head/-body/-arm/-leg` (Einzelteile, Format in der README) und
  `portrait-<id>` (Kopf fürs Tor), Platzhalter in `src/scenes/placeholders/kids.ts`.
- Kinder kommen nur über `scene.spawnKid()` auf die Wiese und gehen über `GardenGate.sendHome()`.
  Wer ein Kind festhält (`Seat`), muss `unseat()` sauber umsetzen.

## Töne
- Alles, was klingen soll, sendet `scene.events.emit('sound', { kind, pitch?, value?, voice?, x? })`
  (Typ `SoundEvent` in `src/data/sounds.ts`). `x` ist die Weltposition (leichtes Stereo).
- `src/audio/Sound.ts` (`scene.audio`) spielt dazu die Datei oder einen Platzhalter-Ton (WebAudio).
  Ton gibt es erst nach dem ersten Tippen (AudioContext entsteht dann, ohne Knopf).
  Höchstens 8 Töne gleichzeitig. Fehlende oder kaputte Dateien sind nie ein Fehler.
- **Neuen Ton ergänzen:** Eintrag in `SOUNDS` (`src/data/sounds.ts`) mit Platzhalter-`synth`,
  dann das Ereignis senden. Unbekannte `kind`s piepsen leise.
- **Datei ergänzen:** `public/assets/sounds/<kind>.mp3` (auch .ogg/.m4a/.wav), mit Tonhöhe
  `<kind>-<pitch>.mp3` (Xylophon 0–7). Welche Dateien es gibt, ermittelt ein Vite-Plugin beim
  Start/Bauen (`virtual:sound-files`) – nach neuen Dateien den Dev-Server neu starten.
- **Zählen:** `{ kind: 'count', value: n, voice: kidId }`. Gesucht wird
  `sounds/voices/<kidId>/count-<n>.mp3`, dann `sounds/voices/default/count-<n>.mp3`, dann
  deutsche Sprachausgabe (falls das Gerät eine hat), sonst n kurze Töne.
  Echte Kinderstimmen nur mit Okay der Eltern und nicht ins öffentliche Repo (#38).
- Bisherige Töne: `honk`, `drum`, `xylophone` (pitch 0–7), `pop`, `bubble`, `splash`, `click`, `kick`,
  `peekaboo`, `daytime`, `sprinkler-on`/`-off`, `gust`, `weather-<art>`, `count`.

## Speichern
- Die Wiese speichert sich automatisch lokal (`src/save/`, localStorage, kein Netzwerk).
  `AutoSave` vergleicht alle 250 ms den Stand und schreibt 500 ms nach der letzten Änderung,
  spätestens aber 3 s nach der ersten ungespeicherten (falls sich ständig etwas ändert, z. B. Schnee).
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
`honk` (Antippen = Hupe; Ton über `scene.events.emit('sound', { kind: 'honk' })`).
`trampoline`, `seesaw`, `hopper` (Hüpfball), `pool` (Planschbecken): Kinder sitzen über den
Helfer `toys/seats.ts` (`ToySeats`, Seat-Prinzip). `hula`: Reifen kreist um ein Kind (hintere Hälfte hinter,
vordere vor dem Kind, per `setCrop`), hört auf bei `kid.emit('tapped'|'grabbed')`.
`dig` (Schaufel), `fillable` (Eimer füllt sich), `mold` (Sandkuchen), `water` (Gießkanne,
Blumen), `sprinkler` (Partikel-Fontäne). Blumen und Sandkuchen verwaltet `src/objects/Garden.ts`
(`scene.garden`, gespeichert als Weltzustand `garden`, Obergrenzen 30 bzw. 5).
Hook `onReceive(kind, amount)` über `toy.receive()` (z. B. Sand in den Eimer).
`drum`, `xylophone` (Platte aus der Tippstelle), `tent` (Kinder verstecken sich, Modus `hiding`),
`handheld` (Kind hält es in der Hand), `flashlight` (Lichtkegel über die Lichtebene, auf der Tiefe des haltenden Kindes).
`whirlpool`: bis zu 6 Kinder (Modus `bathing`), jedes Kind zählt reihum mit Hüpfer und
Zahlenblase (`sound` `count` mit `value` und `voice`); Antippen = neu zählen, ein 7. Kind landet daneben.
Die Ziffern in der Blase sind die bewusste Ausnahme von „kein Text“ (Issue #37).
Weitere Hooks: `onToyDropped` (Spielzeug auf Spielzeug, z. B. Schubkarre), `onRemove`
(vor dem Wegräumen: Kinder absteigen lassen, Ladung ausschütten).
Bausteine können beim Loslassen `release.handled = true` setzen (eigene Bewegung statt Wurf-Physik).
Wind: `src/world/environment.ts` (`environment.wind`), Spielzeuge reagieren mit `params.windFactor`.

Neuer Baustein: Datei in `src/objects/toys/behaviors/` mit einer `BehaviorFactory`
(Hooks `onTap`, `onDragStart`, `onDragEnd`, `update`), in `behaviors/index.ts` eintragen,
`BehaviorId` in `toys.ts` erweitern. Bewegung läuft über `toy.physics` (`ToyPhysics`:
`vx` links/rechts, `vdepth` in die Tiefe = Bodenlinie `groundY`, `vz` Höhe; Bildränder, Zaun
und Vorderkante sind eine Bande), nicht über eigene Tweens auf x/y. Auf der Wiese losgelassen
geht senkrechtes Wischen zum Teil in die Tiefe (`params.depthShare`), in der Luft losgelassen
landet ein Spielzeug auf der Linie, wo es aufgehoben wurde (`toy.pickupGroundY`).
Rollen/Fliegen mit `params.spin` dreht über `toy.spin` (nur das Bild, um die Mitte; Fußpunkt, Touch-Fläche
und Bounds bleiben ungedreht), `toy.rotation`/`angle` dreht um den Fußpunkt (Wackeln).
Aufpralle: `toy.physics.landListeners`. Szene-Abfragen (z. B. Kinder) über `toy.scene as PlaygroundScene`.

## Zielgruppe
Kleine Kinder: große Touch-Flächen, sofortiges Feedback, nichts, was man kaputt machen
kann, keine Menüs, keine Werbung, keine Netzwerkzugriffe.
Ausnahme Inventare: erlaubt, wenn sie Teil der Spielwelt sind (Spielzeugkiste, Gartentor)
und ganz ohne Text auskommen. Dafür gibt es die Leiste `src/objects/Tray.ts`.
