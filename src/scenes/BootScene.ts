import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, GROUND_TOP } from '../config';
import { PERGOLAS, type BackTreeKind, type BushKind, type HouseKind } from '../data/backdrop';
import { CHARACTERS } from '../data/characters';
import { FOOD_IDS, STAGES } from '../data/grill';
import { BOTTLE_SIZE, drawBottle, drawFood, drawGrillBackground, drawGrillFront, drawOrderCard, drawPlate, foodSize, GRILL } from './placeholders/grill';
import { COSTUMES, costumeKey, SLOTS } from '../data/costumes';
import { COSTUME_ART, layerLayout } from './placeholders/costumes';
import { BOX, boxDoorOutline, drawDressBox, drawDressBoxInside, drawDressRoom, drawHanger, drawItemGlow } from './placeholders/dressup';
import { TOYS } from '../data/toys';
import { drawKidFace, drawKidPart, drawPortrait, partSize, PORTRAIT_SIZE } from './placeholders/kids';
import { BACK_TREE_SIZE, BIG_TREE, BUSH_SIZE, drawBackTree, drawBigTree, drawBush, drawFence, drawFenceSnow, drawMeadow, drawPergola, drawPergolaSnow, drawSmoke, drawWindowGlow, FENCE_TILE_HEIGHT, FENCE_TILE_TOP, HOUSE_SPECS, houseKey, MEADOW_TILE_HEIGHT, pergolaArea, TILE_COUNT, WINDOW_GLOW_SIZE } from './placeholders/backdrop';
import {
  drawFairyLights,
  drawGate,
  drawGrill,
  drawPergola as drawGardenPergola,
  drawPergolaSnow as drawGardenPergolaSnow,
  drawRailing,
  drawShed,
  drawShedSnow,
  drawSoftGlow,
  drawTrunk,
  drawVineCurtain,
  GATE_SIZE,
  GRILL_SIZE,
  LIGHTS_AREA,
  PERGOLA_AREA,
  RAILING_SIZE,
  SHED_AREA,
  TRUNK_SIZE,
  VINE_CURTAIN_SIZE,
} from './placeholders/garden';
import {
  archOutline,
  drawPlayhouseBack,
  drawPlayhouseFront,
  drawPlayhouseSlide,
  HOUSE_AREA,
  PH,
  rungSlots,
  SLIDE_AREA,
} from './placeholders/playhouse';
import { drawWhirlpool, TOY_PLACEHOLDERS } from './placeholders/toys';

// Erzeugt Platzhalter-Grafiken per Code, damit das Spiel ohne Asset-Dateien läuft.
// Sobald echte Grafiken da sind: PNGs nach public/assets/ legen, hier in preload()
// mit this.load.image(key, 'assets/…png') laden und die passende make…-Funktion löschen.
// Die Texture-Keys bleiben gleich, der Rest des Codes merkt davon nichts.

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    // Hier später: this.load.image('kid-kind-a-head', 'assets/kinder/kind-a/head.png'); usw.
    // (Format der Einzelteile: README, Abschnitt „Echte Figuren“)
  }

  create(): void {
    CHARACTERS.forEach((c) => {
      // Gesichter (Blinzeln, Lachen, Gähnen) passen nur zum Platzhalter-Kopf. Für einen echten Kopf
      // müssen sie mitgeliefert werden – sonst bleibt das Gesicht einfach unverändert.
      const placeholderHead = !this.textures.exists(`kid-${c.id}-head`);
      for (const part of ['head', 'body', 'arm', 'leg'] as const) {
        const { width, height } = partSize(c, part);
        this.makeTexture(`kid-${c.id}-${part}`, width, height, (g) => drawKidPart(g, c, part));
      }
      if (placeholderHead) {
        const { width, height } = partSize(c, 'head');
        for (const face of ['blink', 'joy', 'yawn', 'yuck'] as const) {
          this.makeTexture(`kid-${c.id}-face-${face}`, width, height, (g) => drawKidFace(g, c, face));
        }
      }
      this.makeTexture(`portrait-${c.id}`, PORTRAIT_SIZE, PORTRAIT_SIZE, (g) => drawPortrait(g, c));
    });

    this.makeTexture('gate', 200, 150, (g) => {
      // Pfosten
      g.fillStyle(0x8d6e63);
      g.fillRoundedRect(0, 0, 22, 150, 6);
      g.fillRoundedRect(178, 0, 22, 150, 6);
      // Durchgang (dahinter sieht man den Weg)
      g.fillStyle(0xd7ccc8);
      g.fillRect(22, 20, 156, 130);
      g.fillStyle(0xbcaaa4);
      g.fillRect(60, 60, 80, 90);
    });

    this.makeTexture('gate-door', 156, 124, (g) => {
      g.fillStyle(0xe9c46a);
      for (let x = 0; x < 156; x += 26) g.fillRoundedRect(x + 2, 0, 22, 124, { tl: 11, tr: 11, bl: 0, br: 0 });
      g.fillStyle(0xd4a373);
      g.fillRect(0, 30, 156, 14);
      g.fillRect(0, 88, 156, 14);
      // Herz
      g.fillStyle(0xef476f);
      g.fillCircle(70, 62, 10);
      g.fillCircle(86, 62, 10);
      g.fillTriangle(61, 66, 95, 66, 78, 84);
    });

    this.makePlayhouse();

    this.makeTexture('swing-frame', 360, 420, (g) => {
      g.lineStyle(16, 0x6d4c41);
      g.lineBetween(20, 420, 60, 22);
      g.lineBetween(100, 420, 60, 22);
      g.lineBetween(260, 420, 300, 22);
      g.lineBetween(340, 420, 300, 22);
      g.lineStyle(20, 0x5d4037);
      g.lineBetween(40, 20, 320, 20);
    });

    this.makeTexture('sandbox', 360, 120, (g) => {
      g.fillStyle(0x8d6e63);
      g.fillRoundedRect(0, 20, 360, 100, 14);
      g.fillStyle(0xf6d186);
      g.fillRoundedRect(16, 34, 328, 72, 10);
      g.fillStyle(0xe9c46a);
      g.fillCircle(120, 70, 22);
      g.fillCircle(240, 60, 16);
    });

    this.makeTexture('tree', BIG_TREE.width, BIG_TREE.height, drawBigTree);
    this.makeBackdrop();

    this.makeTexture('toybox', 210, 140, (g) => {
      g.fillStyle(0xc0392b);
      g.fillRoundedRect(0, 0, 210, 140, 16);
      g.fillStyle(0xe74c3c);
      g.fillRoundedRect(10, 10, 190, 120, 12);
      g.fillStyle(0xffd166);
      g.fillRect(0, 60, 210, 20);
      // Stern vorne drauf
      g.fillStyle(0xffffff);
      g.fillPoints(starPoints(105, 70, 34, 15), true);
    });

    this.makeTexture('toybox-lid', 220, 36, (g) => {
      g.fillStyle(0xa93226);
      g.fillRoundedRect(0, 0, 220, 36, 12);
      g.fillStyle(0xffd166);
      g.fillRoundedRect(95, 22, 30, 14, 4);
    });

    this.makeTexture('bubble', 60, 60, (g) => {
      g.fillStyle(0xffffff, 0.18);
      g.fillCircle(30, 30, 28);
      g.lineStyle(3, 0xffffff, 0.85);
      g.strokeCircle(30, 30, 27);
      g.fillStyle(0xffffff, 0.9);
      g.fillEllipse(20, 18, 12, 8);
    });

    this.makeTexture('star', 28, 28, (g) => {
      g.fillStyle(0xffd166);
      g.fillPoints(starPoints(14, 14, 13, 6), true);
    });

    this.makeTexture('can', 40, 56, (g) => {
      g.fillStyle(0xadb5bd);
      g.fillRoundedRect(0, 0, 40, 56, 6);
      g.fillStyle(0xe63946);
      g.fillRect(0, 12, 40, 32);
      g.fillStyle(0xffffff);
      g.fillCircle(20, 28, 8);
    });

    this.makeTexture('pin', 30, 72, (g) => {
      g.fillStyle(0xffffff);
      g.fillEllipse(15, 50, 28, 42);
      g.fillCircle(15, 14, 11);
      g.fillRect(10, 18, 10, 18);
      g.fillStyle(0xe63946);
      g.fillRect(9, 24, 12, 4);
      g.fillRect(9, 31, 12, 4);
    });

    this.makeTexture('hoop-net', 96, 60, (g) => {
      g.lineStyle(3, 0xffffff, 0.95);
      for (let i = 0; i <= 6; i++) {
        g.lineBetween(4 + i * 14.6, 0, 20 + i * 9.3, 60);
      }
      for (let y = 15; y <= 60; y += 15) {
        const inset = (y / 60) * 16;
        g.lineBetween(4 + inset, y, 92 - inset, y);
      }
    });

    this.makeTexture('wheel', 44, 44, (g) => {
      g.fillStyle(0x2b2d42);
      g.fillCircle(22, 22, 22);
      g.fillStyle(0xadb5bd);
      g.fillCircle(22, 22, 10);
      g.lineStyle(4, 0xadb5bd);
      g.lineBetween(22, 4, 22, 40);
      g.lineBetween(4, 22, 40, 22);
    });

    this.makeTexture('wheel-yellow', 44, 44, (g) => {
      g.fillStyle(0xffc300);
      g.fillCircle(22, 22, 22);
      g.fillStyle(0xffe066);
      g.fillCircle(22, 22, 11);
      g.fillStyle(0xd49a00);
      g.fillCircle(22, 22, 4);
    });

    this.makeTexture('seesaw-beam', 330, 22, (g) => {
      g.fillStyle(0xe76f51);
      g.fillRoundedRect(0, 0, 330, 22, 10);
      g.fillStyle(0x2b2d42);
      g.fillRoundedRect(22, -2, 12, 10, 4);
      g.fillRoundedRect(296, -2, 12, 10, 4);
    });

    // Vorderer Rand des Planschbeckens mit halbdurchsichtigem Wasser: liegt über Kindern
    // und Spielzeug im Becken, damit sie „im Wasser“ sitzen.
    this.makeTexture('pool-front', 320, 100, (g) => {
      const half = (cx: number, cy: number, rx: number, ry: number, reverse = false) => {
        const pts: Phaser.Math.Vector2[] = [];
        for (let i = 0; i <= 24; i++) {
          const a = (i / 24) * Math.PI;
          pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry));
        }
        return reverse ? pts.reverse() : pts;
      };
      g.fillStyle(0x8ecae6, 0.6);
      g.fillPoints(half(160, 46, 138, 35), true);
      g.fillStyle(0x4d96ff);
      g.fillPoints([...half(160, 50, 158, 48), ...half(160, 46, 138, 35, true)], true);
    });

    // Vorderer Rand des Whirlpools (über den Kindern, Wasser halbdurchsichtig)
    // Vorderer Teil des Whirlpools (liegt über den Kindern), gleiche Fläche wie die Whirlpool-Grafik
    this.makeTexture('whirlpool-front', 380, 230, (g) => drawWhirlpool(g, true));

    this.makeTexture('drop', 10, 14, (g) => {
      g.fillStyle(0x4cc9f0);
      g.fillCircle(5, 9, 5);
      g.fillTriangle(1, 8, 9, 8, 5, 0);
    });

    this.makeTexture('bucket-sand', 72, 26, (g) => {
      g.fillStyle(0xe9c46a);
      g.fillEllipse(36, 18, 72, 16);
      g.fillEllipse(36, 12, 50, 24);
    });

    this.makeTexture('sandcake', 72, 44, (g) => {
      g.fillStyle(0xd4a373);
      g.fillPoints(
        [new Phaser.Math.Vector2(14, 0), new Phaser.Math.Vector2(58, 0), new Phaser.Math.Vector2(70, 40), new Phaser.Math.Vector2(2, 40)],
        true,
      );
      g.fillStyle(0xe9c46a);
      for (let i = 0; i < 6; i++) g.fillCircle(8 + i * 11.2, 38, 7);
      g.fillStyle(0xf4d9a4);
      g.fillEllipse(36, 3, 40, 8);
    });

    const flowerColors = [0xff70a6, 0xffd166, 0x9b5de5, 0xff9770];
    flowerColors.forEach((color, i) =>
      this.makeTexture(`flower-${i}`, 40, 60, (g) => {
        g.lineStyle(4, 0x2d6a4f);
        g.lineBetween(20, 24, 20, 60);
        g.fillStyle(0x40916c);
        g.fillEllipse(28, 46, 14, 7);
        g.fillStyle(color);
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2;
          g.fillCircle(20 + Math.cos(a) * 9, 18 + Math.sin(a) * 9, 7);
        }
        g.fillStyle(0xffffff);
        g.fillCircle(20, 18, 5);
      }),
    );

    this.makeTexture('note', 30, 42, (g) => {
      g.fillStyle(0xffffff);
      g.fillEllipse(10, 34, 20, 14);
      g.fillRect(16, 4, 5, 32);
      g.fillTriangle(21, 4, 30, 12, 21, 18);
    });

    // Lichtkegel der Taschenlampe (wird additiv über die Szene geblendet)
    this.makeTexture('lightcone', 340, 200, (g) => {
      for (let i = 10; i >= 1; i--) {
        const r = i / 10;
        g.fillStyle(0xfff3b0, 0.06);
        g.fillTriangle(0, 100, 340 * r, 100 - 100 * r, 340 * r, 100 + 100 * r);
      }
    });

    this.makeTexture('sun', 180, 180, (g) => {
      g.fillStyle(0xffffff, 0.25);
      g.fillCircle(90, 90, 90);
      g.fillStyle(0xffffff);
      g.fillCircle(90, 90, 70);
    });

    this.makeTexture('moon', 150, 150, (g) => {
      g.fillStyle(0xfff8dc, 0.18);
      g.fillCircle(75, 75, 75);
      g.fillStyle(0xfff3c4);
      g.fillCircle(75, 75, 55);
      g.fillStyle(0xe9dca4);
      g.fillCircle(55, 62, 11);
      g.fillCircle(88, 92, 8);
      g.fillCircle(92, 55, 6);
    });

    this.makeTexture('cloud', 240, 120, (g) => {
      g.fillStyle(0xf4faff);
      g.fillCircle(60, 70, 45);
      g.fillCircle(115, 50, 55);
      g.fillCircle(175, 70, 45);
      g.fillRect(60, 70, 115, 45);
    });

    // Kleiner Funkelstern (Sterne nachts, Tau morgens)
    this.makeTexture('twinkle', 20, 20, (g) => {
      g.fillStyle(0xffffff);
      g.fillPoints(starPoints(10, 10, 10, 3.5), true);
    });

    // Leuchten einer Glühbirne (weiß, wird eingefärbt, über die Lichtebene gezeichnet)
    this.makeTexture('bulb', 36, 36, (g) => {
      g.fillStyle(0xffffff, 0.25);
      g.fillCircle(18, 18, 18);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(18, 18, 7);
    });

    this.makeTexture('raindrop', 4, 22, (g) => {
      g.fillStyle(0xcfe8ff);
      g.fillRoundedRect(0, 0, 4, 22, 2);
    });

    this.makeTexture('puddle', 220, 64, (g) => {
      g.fillStyle(0x6fa8dc, 0.85);
      g.fillEllipse(110, 32, 220, 64);
      g.fillStyle(0xa9d6f5, 0.9);
      g.fillEllipse(96, 26, 150, 34);
      g.fillStyle(0xffffff, 0.6);
      g.fillEllipse(70, 20, 50, 8);
    });

    this.makeTexture('rainbow', 1000, 500, (g) => {
      const colors = [0xff595e, 0xff924c, 0xffca3a, 0x8ac926, 0x1982c4, 0x4267ac, 0x6a4c93];
      colors.forEach((c, i) => {
        g.lineStyle(26, c, 0.8);
        g.beginPath();
        g.arc(500, 500, 480 - i * 26, Math.PI, 0, false);
        g.strokePath();
      });
    });

    this.makeTexture('leaf', 26, 16, (g) => {
      g.fillStyle(0xffffff);
      g.fillEllipse(13, 8, 26, 14);
      g.lineStyle(2, 0xdddddd);
      g.lineBetween(2, 8, 24, 8);
    });

    this.makeTexture('snowflake', 14, 14, (g) => {
      g.fillStyle(0xffffff, 0.35);
      g.fillCircle(7, 7, 7);
      g.fillStyle(0xffffff);
      g.fillCircle(7, 7, 4);
    });

    // Mütze (weiß, wird in der Pulli-Farbe des Kindes eingefärbt)
    this.makeTexture('beanie', 100, 62, (g) => {
      g.fillStyle(0xffffff);
      g.slice(50, 58, 46, Math.PI, 0, false);
      g.fillPath();
      g.fillRoundedRect(2, 46, 96, 16, 7);
      g.fillCircle(50, 10, 10);
      g.fillStyle(0xdddddd);
      for (let x = 10; x < 95; x += 12) g.fillRect(x, 48, 4, 12);
    });

    TOYS.forEach((t) => this.makeTexture(t.id, t.width, t.height, TOY_PLACEHOLDERS[t.id]));

    this.scene.start('Playground');
  }

  /**
   * Kletter-Spielhaus (#65): Rückseite, Vorderseite mit ausgestanzten Löchern, Bogen und Sprossen
   * (Kinder und Bälle drinnen sieht man hindurch), Rutsche.
   */
  private makePlayhouse(): void {
    const { x, y, w, h } = HOUSE_AREA;
    this.makeTexture('playhouse-back', w, h, drawPlayhouseBack);
    this.makeTexture('playhouse-slide', SLIDE_AREA.w, SLIDE_AREA.h, drawPlayhouseSlide);
    if (this.textures.exists('playhouse-front')) return; // echte Grafik (mit durchsichtigen Löchern)
    this.makeTexture('playhouse-front-solid', w, h, drawPlayhouseFront);
    const canvas = this.textures.createCanvas('playhouse-front', w, h);
    if (!canvas) return;
    const ctx = canvas.context;
    ctx.drawImage(this.textures.get('playhouse-front-solid').getSourceImage() as CanvasImageSource, 0, 0);
    ctx.globalCompositeOperation = 'destination-out';
    for (const hole of [PH.bigHole, ...PH.holes]) {
      ctx.beginPath();
      ctx.arc(hole.x - x, hole.y - y, hole.r, 0, Math.PI * 2);
      ctx.fill();
    }
    const cut = (pts: Phaser.Math.Vector2[]) => {
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x - x, p.y - y) : ctx.moveTo(p.x - x, p.y - y)));
      ctx.closePath();
      ctx.fill();
    };
    cut(archOutline());
    rungSlots().forEach(cut);
    ctx.globalCompositeOperation = 'source-over';
    canvas.refresh();
    this.textures.remove('playhouse-front-solid');
  }

  /** Grill-Spiel (#66): Hintergrund, Grill, Grillgut in 5 Garstufen, Teller, Flaschen, Karte. */
  private makeGrill(): void {
    this.makeTexture('grill-bg', GAME_WIDTH, GAME_HEIGHT, drawGrillBackground);
    this.makeTexture('grill-front', GAME_WIDTH, GAME_HEIGHT, drawGrillFront);
    for (const id of [...FOOD_IDS, 'buncut'] as const) {
      const { width, height } = foodSize(id);
      for (let stage = 0; stage < STAGES; stage++) this.makeTexture(`food-${id}-${stage}`, width, height, (g) => drawFood(g, id, stage));
    }
    this.makeTexture('grill-plate', GRILL.plate.w, GRILL.plate.h, drawPlate);
    this.makeTexture('grill-bottle-ketchup', BOTTLE_SIZE.width, BOTTLE_SIZE.height, (g) => drawBottle(g, 0xd62828, 0xffffff));
    this.makeTexture('grill-bottle-mustard', BOTTLE_SIZE.width, BOTTLE_SIZE.height, (g) => drawBottle(g, 0xf2c230, 0x8a5a00));
    this.makeTexture('grill-card', GRILL.card.w, GRILL.card.h, drawOrderCard);
  }

  /** Ankleidekiste (#70): Kiste, Innenraum, Bügel und alle Verkleidungs-Teile. */
  private makeDressUp(): void {
    this.makeTexture('dressbox-inside', BOX.width, BOX.height, drawDressBoxInside);
    // Vorderseite mit ausgestanzter Tür: dahinter sieht man das Innere (und das Kind, das hineingeht)
    if (!this.textures.exists('dressbox')) {
      this.makeTexture('dressbox-solid', BOX.width, BOX.height, drawDressBox);
      const canvas = this.textures.createCanvas('dressbox', BOX.width, BOX.height);
      if (canvas) {
        const ctx = canvas.context;
        ctx.drawImage(this.textures.get('dressbox-solid').getSourceImage() as CanvasImageSource, 0, 0);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        boxDoorOutline().forEach((p, i) => (i ? ctx.lineTo(p.x + BOX.footX, p.y + BOX.footY) : ctx.moveTo(p.x + BOX.footX, p.y + BOX.footY)));
        ctx.closePath();
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        canvas.refresh();
      }
      this.textures.remove('dressbox-solid');
    }
    this.makeTexture('dressup-room', GAME_WIDTH, GAME_HEIGHT, drawDressRoom);
    this.makeTexture('dressup-hanger', 80, 46, drawHanger);
    this.makeTexture('dressup-glow', 120, 120, drawItemGlow);
    for (const costume of COSTUMES) {
      for (const slot of SLOTS) {
        for (const art of COSTUME_ART[costume][slot]) {
          const { width, height } = layerLayout(art);
          this.makeTexture(costumeKey(costume, slot, art.layer), width, height, (g) => {
            g.translateCanvas(art.pad[0], art.pad[1]);
            art.draw(g);
          });
        }
      }
    }
  }

  /** Hintergrund wie der echte Hinterhof (#63): Häuser, Bäume, Büsche, Zaun- und Wiesen-Kacheln. */
  private makeBackdrop(): void {
    for (const [kind, spec] of Object.entries(HOUSE_SPECS) as [HouseKind, (typeof HOUSE_SPECS)[HouseKind]][]) {
      const key = houseKey(kind);
      this.makeTexture(key, spec.width, spec.height, spec.draw);
      this.makeTexture(`${key}-snow`, spec.width, spec.height, spec.drawSnow);
    }
    for (const kind of ['fir', 'tree'] as BackTreeKind[]) {
      const { width, height } = BACK_TREE_SIZE[kind];
      this.makeTexture(`bg-${kind}`, width, height, (g) => drawBackTree(g, kind));
    }
    for (const kind of ['green', 'dark', 'red', 'orange'] as BushKind[]) {
      this.makeTexture(`bush-${kind}`, BUSH_SIZE.width, BUSH_SIZE.height, (g) => drawBush(g, kind));
    }
    for (let i = 0; i < TILE_COUNT; i++) {
      const ox = i * GAME_WIDTH;
      this.makeTexture(`fence-${i}`, GAME_WIDTH, FENCE_TILE_HEIGHT, (g) => drawFence(g, ox, FENCE_TILE_TOP));
      this.makeTexture(`fence-snow-${i}`, GAME_WIDTH, FENCE_TILE_HEIGHT, (g) => drawFenceSnow(g, ox, FENCE_TILE_TOP));
      this.makeTexture(`meadow-${i}`, GAME_WIDTH, MEADOW_TILE_HEIGHT, (g) => drawMeadow(g, ox, GROUND_TOP));
    }
    PERGOLAS.forEach((_, i) => {
      const { w, h } = pergolaArea(i);
      this.makeTexture(`pergola-${i}`, w, h, (g) => drawPergola(g, i));
      this.makeTexture(`pergola-snow-${i}`, w, h, (g) => drawPergolaSnow(g, i));
    });
    // Felix' Garten (#64)
    this.makeTexture('felix-pergola', PERGOLA_AREA.w, PERGOLA_AREA.h, drawGardenPergola);
    this.makeTexture('felix-pergola-snow', PERGOLA_AREA.w, PERGOLA_AREA.h, drawGardenPergolaSnow);
    this.makeTexture('felix-vine', VINE_CURTAIN_SIZE.width, VINE_CURTAIN_SIZE.height, drawVineCurtain);
    this.makeTexture('felix-grill', GRILL_SIZE.width, GRILL_SIZE.height, drawGrill);
    this.makeTexture('felix-railing', RAILING_SIZE.width, RAILING_SIZE.height, drawRailing);
    this.makeTexture('felix-shed', SHED_AREA.w, SHED_AREA.h, drawShed);
    this.makeTexture('felix-shed-snow', SHED_AREA.w, SHED_AREA.h, drawShedSnow);
    this.makeTexture('felix-trunk', TRUNK_SIZE.width, TRUNK_SIZE.height, drawTrunk);
    this.makeTexture('felix-gate', GATE_SIZE.width, GATE_SIZE.height, drawGate);
    this.makeTexture('felix-lights', LIGHTS_AREA.w, LIGHTS_AREA.h, drawFairyLights);
    this.makeTexture('glow-soft', 128, 128, drawSoftGlow);
    this.makeDressUp();
    this.makeGrill();
    this.makeTexture('window-glow', WINDOW_GLOW_SIZE.width, WINDOW_GLOW_SIZE.height, drawWindowGlow);
    this.makeTexture('smoke', 48, 48, drawSmoke);
  }

  private makeTexture(
    key: string,
    width: number,
    height: number,
    draw: (g: Phaser.GameObjects.Graphics) => void,
  ): void {
    if (this.textures.exists(key)) return; // echte Grafik wurde in preload() geladen
    const g = this.add.graphics();
    draw(g);
    g.generateTexture(key, width, height);
    g.destroy();
  }
}

function starPoints(cx: number, cy: number, outer: number, inner: number): Phaser.Math.Vector2[] {
  const points: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  return points;
}
