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
| Ball antippen | Ball fliegt weg |
| Eimer / Baum antippen | wackelt |
| Irgendwas in den Himmel ziehen und loslassen | fällt zurück auf die Wiese |

## Projektstruktur

```
src/
  config.ts            Auflösung, Boden-Höhe, Konstanten
  data/                Spielgeräte, Gegenstände, Figuren (alles im Code)
  objects/             Verhalten: Kid, Prop, Equipment (Schaukel, Rutsche, …)
  scenes/BootScene     Grafiken laden bzw. Platzhalter erzeugen
  scenes/Playground    die Spielwiese
public/assets/         hier kommen später die echten Grafiken hin
```

## Echte Grafiken einbauen

1. PNG mit transparentem Hintergrund nach `public/assets/` legen.
2. In `BootScene.preload()` unter demselben Key laden, z. B.
   `this.load.image('kid-kind-a', 'assets/kinder/kind-a.png')`.
3. Fertig – der Platzhalter wird dann automatisch übersprungen.

Bei Schaukel und Rutsche hängen Seil- bzw. Rutschpunkte an der Grafik
(siehe `Swing`/`Slide` in `src/objects/Equipment.ts`) und müssen ggf. angepasst werden.
