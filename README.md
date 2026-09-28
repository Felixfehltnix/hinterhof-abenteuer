# Hinterhof-Abenteuer

Ein kleines Spiel für Kinder: Die Kinder aus der Nachbarschaft toben über unsere
Spielwiese im Hinterhof. Figuren und Gegenstände kann man antippen und herumziehen.

## Voraussetzungen

- Node.js 20+
- Für Android: [Android Studio](https://developer.android.com/studio) (bringt SDK und JDK mit)
- Ein Android-Gerät mit aktiviertem USB-Debugging (oder den Emulator)

## Im Browser entwickeln

```bash
npm install
npm run dev
```

Dann die angezeigte URL öffnen. In den DevTools auf Geräte-Emulation (Tablet, Querformat)
umschalten, damit Touch-Eingaben simuliert werden. Durch `--host` ist der Dev-Server auch
im WLAN erreichbar, du kannst also direkt mit dem Tablet-Browser testen.

## Android einrichten (einmalig)

```bash
npm run build
npx cap add android
```

Danach in `android/app/src/main/AndroidManifest.xml` beim `<activity>`-Element
Querformat erzwingen:

```xml
android:screenOrientation="sensorLandscape"
```

Den `android/`-Ordner mit einchecken.

## Android bauen & testen

```bash
npm run android:run     # baut, synchronisiert und startet auf dem angeschlossenen Gerät
npm run android:open    # öffnet das Projekt in Android Studio (z. B. für ein Release-APK)
```

## Was drin ist

| Aktion | Ergebnis |
| --- | --- |
| Kind antippen | Freudensprung |
| Kind auf die Schaukel ziehen | Kind schaukelt, bis man es wieder runterzieht |
| Kind auf die Rutsche ziehen | klettert hoch und rutscht runter |
| Ball antippen | Ball fliegt im Bogen weg und rollt aus |
| Eimer / Baum antippen | wackelt |
| Spielzeug schnell ziehen und loslassen | wird geworfen, prallt an den Bildrändern ab |
| Fußball / Basketball / Wasserball antippen | flacher Schuss / hoher Bogen / schwebt lange |
| Frisbee werfen | gleitet weit und sinkt sanft |
| Ball auf ein Kind fallen lassen | das Kind kickt ihn weg |
| Papierflieger / Bumerang werfen | gleitet mit Looping / fliegt einen Bogen und kommt zurück |
| Drachen ziehen | steigt an der Schnur hoch |
| Luftballon | steigt und schwebt, Antippen: platzt mit Konfetti |
| Drachen oder Ballon und ein Kind zusammenbringen | das Kind hält die Schnur |
| Seifenblasenstab antippen | Blasen steigen auf, Antippen lässt sie platzen |
| Ball in den Basketballkorb werfen | Netz wackelt, Sterne sprühen |
| Ball ins Fußballtor schießen | Netz beult sich, alle Kinder jubeln |
| Ball auf Dosen / Kegel | purzeln um, Antippen stellt sie wieder auf |
| Kind auf Bobbycar / Laufrad / Roller ziehen | sitzt auf; Fahrzeug ziehen = fahren; Kind wegziehen = absteigen |
| Bobbycar antippen | hupt |
| Spielzeug oder Kind in die Schubkarre | wird mitgeschoben |
| Kind aufs Trampolin | hüpft von selbst, Trampolin antippen = Salto |
| Ein / zwei Kinder auf die Wippe | eine Seite geht runter / es wippt |
| Kind auf den Hüpfball | hüpft über die Wiese |
| Hula-Hoop auf ein Kind ziehen | kreist um die Hüfte, Antippen hört auf |
| Kinder / Spielzeug ins Planschbecken | planschen / schwimmen |
| Schaufel im Sandkasten ziehen | buddelt; ein Eimer daneben füllt sich (voll antippen = ausschütten) |
| Förmchen im Sandkasten antippen | Sandkuchen (antippen = zerbröselt) |
| Gießkanne über die Wiese ziehen | Blumen wachsen, Kinder darunter lachen |
| Rasensprenger antippen | Fontäne an/aus, Kinder in der Nähe hüpfen |
| Trommel / Xylophon-Platten antippen | Schallringe / Noten fliegen |
| Kind ins Zelt ziehen, Zelt antippen | Kind verschwindet, guckt heraus, kommt heraus |
| Taschenlampe antippen / aufs Kind ziehen | Licht an und aus / Kind hält sie |
| Über die freie Wiese wischen | die Welt scrollt nach links und rechts (3 Bildschirme breit) |
| Sonne bzw. Mond antippen | nächste Tageszeit: Morgen → Mittag → Abend → Nacht |
| Wolke antippen | nächstes Wetter: Sonne → bewölkt → Regen (danach Regenbogen) → Wind → Schnee |
| Kind bei Regen in eine Pfütze ziehen | es spritzt |
| Bei Schnee auf die Wiese tippen | Schneeball; drei Schneebälle aufeinander = Schneemann |
| Irgendwas in den Himmel ziehen und loslassen | fällt zurück auf die Wiese |
| Spielzeugkiste (unten links) antippen | Leiste mit allen Spielzeugen geht auf |
| Spielzeug aus der Leiste nach oben ziehen | neues Spielzeug auf der Wiese |
| Spielzeug auf Kiste oder Leiste ziehen | wird weggeräumt |
| Gartentor (rechts im Zaun) antippen | Leiste mit allen Kindern geht auf |
| Kind aus der Leiste ziehen | kommt auf die Wiese und hüpft vor Freude |
| Kind aufs Tor ziehen | winkt und geht nach Hause |

Die Wiese merkt sich alles (lokal auf dem Gerät). Zum Zurücksetzen im Browser:
`localStorage.removeItem('hinterhof-abenteuer/wiese')` in der Konsole, auf Android: App-Daten löschen.

## Projektstruktur

```
src/
  config.ts            Auflösung, Boden-Höhe, Konstanten
  data/                Spielgeräte, Spielzeug-Katalog (toys.ts), Figuren (alles im Code)
  objects/             Verhalten: Kid, Equipment (Schaukel, Rutsche, …)
  objects/toys/        Spielzeug, Wurf-Physik und Verhaltensbausteine
  scenes/BootScene     Grafiken laden bzw. Platzhalter erzeugen
  scenes/placeholders/ Platzhalter-Zeichnungen der Spielzeuge
  scenes/Playground    die Spielwiese
public/assets/         hier kommen später die echten Grafiken hin
```

## Echte Grafiken einbauen

1. PNG mit transparentem Hintergrund nach `public/assets/` legen.
2. In `BootScene.preload()` unter demselben Key laden, z. B.
   `this.load.image('kid-kind-a', 'assets/kinder/kind-a.png')`. Für jedes Kind gibt es
   zusätzlich ein Porträt (nur der Kopf) fürs Gartentor: `portrait-kind-a`.
3. Fertig – der Platzhalter wird dann automatisch übersprungen.

Bei Schaukel und Rutsche hängen Seil- bzw. Rutschpunkte an der Grafik
(siehe `Swing`/`Slide` in `src/objects/Equipment.ts`) und müssen ggf. angepasst werden.
