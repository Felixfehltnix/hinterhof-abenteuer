// Feste Spielauflösung. Phaser skaliert das Ganze auf jedes Tablet/Handy (Querformat).
export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;

// Ab dieser Höhe beginnt die Wiese. Figuren und Gegenstände landen immer darunter.
export const GROUND_TOP = 700;
export const GROUND_MIN_Y = GROUND_TOP + 40;
export const GROUND_MAX_Y = GAME_HEIGHT - 20;

// Ab wie vielen Pixeln Fingerbewegung ein Tippen zum Ziehen wird.
export const DRAG_THRESHOLD = 12;

// Tiefe für Objekte, die gerade gezogen werden (vor allem anderen auf der Wiese,
// aber unter der Tageszeit-Einfärbung, damit sie nachts nicht herausleuchten).
export const DEPTH_DRAGGING = 6_500;

// Einfärbung der ganzen Szene nach Tageszeit/Wetter (Multiplizieren).
export const DEPTH_TINT = 7_000;
// Mond und Sterne leuchten über der Einfärbung.
export const DEPTH_SKY_LIGHTS = 7_100;

// Mindestgröße der Touch-Fläche (px). Kleine Spielzeuge bekommen einen unsichtbaren Rand.
export const MIN_TOUCH_SIZE = 140;

// Leisten (Spielzeugkiste, Gartentor) liegen über der Wiese, aber unter gezogenen Objekten.
export const DEPTH_TRAY = 9_000;

// Lichter (Taschenlampe, Lichterkette) leuchten über der Nacht-Abdunklung (#12).
export const DEPTH_LIGHTS = 7_500;

// Höchstens so viele Spielzeuge und Kinder gleichzeitig auf der Wiese (Tablet-Leistung).
export const MAX_OBJECTS = 40;
