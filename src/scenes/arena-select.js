import Phaser from 'phaser';
import { ARENAS } from '../data/arenas.js';
import { MECHS } from '../data/mechs.js';
import { TITLE_STYLE, HEADING_STYLE, BUTTON_STYLE, SMALL_STYLE } from './ui-styles.js';

const CARD_W = 180;
const CARD_H = 110;
const COLS = 2;
const GAP = 20;

export class ArenaSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ArenaSelect' });
  }

  init(data) {
    this.mode = data.mode ?? 'quick-match';
    this.playerMech = data.playerMech;
    this.selectedId = null;
  }

  create() {
    const { width } = this.scale;
    const cx = width / 2;

    this.add.text(cx, 28, 'ONE MUST FALL', { ...TITLE_STYLE, fontSize: '26px' }).setOrigin(0.5);
    this.add.text(cx, 62, 'SELECT ARENA', HEADING_STYLE).setOrigin(0.5);

    this.add.text(cx, 88, `YOUR MECH:  ${this.playerMech.name.toUpperCase()}`, {
      ...SMALL_STYLE, color: '#ffc84a', letterSpacing: 2,
    }).setOrigin(0.5);

    // Grid layout
    const totalW = COLS * CARD_W + (COLS - 1) * GAP;
    const startX = (width - totalW) / 2 + CARD_W / 2;
    const startY = 115;

    this._cardBorders = [];
    this._cardBgs = [];

    ARENAS.forEach((arena, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = startX + col * (CARD_W + GAP);
      const y = startY + row * (CARD_H + GAP) + CARD_H / 2;
      this._createArenaCard(arena, x, y);
    });

    this._fightBtn = this._addButton(cx + 90, 388, 'FIGHT!  ►', () => this._onFight());
    this._fightBtn.setAlpha(0.35);
    this._addButton(cx - 90, 388, '◄  BACK', () => this.scene.start('MechSelect', { mode: this.mode }));

    this.add.text(cx, 410, 'CPU WILL SELECT AN OPPONENT AUTOMATICALLY', {
      ...SMALL_STYLE, letterSpacing: 1,
    }).setOrigin(0.5);
  }

  _createArenaCard(arena, x, y) {
    const border = this.add.rectangle(x, y, CARD_W, CARD_H).setStrokeStyle(1, 0x2a2a4a);
    const bg = this.add.rectangle(x, y, CARD_W - 2, CARD_H - 2, 0x12121e)
      .setInteractive({ useHandCursor: true });

    // Arena preview — gradient sky + ground
    this._drawArenaPreview(x, y - 14, arena);

    this.add.text(x, y + 42, arena.name.toUpperCase(), {
      ...SMALL_STYLE, fontSize: '9px', color: '#ccd6f6', letterSpacing: 1,
    }).setOrigin(0.5);

    bg.on('pointerover', () => {
      if (this.selectedId !== arena.id) border.setStrokeStyle(1, 0x00c8ff);
    });
    bg.on('pointerout', () => {
      if (this.selectedId !== arena.id) border.setStrokeStyle(1, 0x2a2a4a);
    });
    bg.on('pointerup', () => {
      this.selectedId = arena.id;
      this._cardBorders.forEach((b, idx) => {
        b.setStrokeStyle(1, idx === arena.id ? 0xffc84a : 0x2a2a4a);
        this._cardBgs[idx].setFillColor(idx === arena.id ? 0x1a1a08 : 0x12121e);
      });
      this._fightBtn.setAlpha(1);
    });

    this._cardBorders.push(border);
    this._cardBgs.push(bg);
  }

  _drawArenaPreview(cx, cy, arena) {
    const gfx = this.add.graphics();
    const hw = (CARD_W - 4) / 2;
    const x0 = cx - hw;
    const y0 = cy - 28;

    // Sky
    gfx.fillGradientStyle(
      Phaser.Display.Color.HexStringToColor(arena.bgTop).color,
      Phaser.Display.Color.HexStringToColor(arena.bgTop).color,
      Phaser.Display.Color.HexStringToColor(arena.bgBottom).color,
      Phaser.Display.Color.HexStringToColor(arena.bgBottom).color,
    );
    gfx.fillRect(x0, y0, CARD_W - 4, 60);

    // Ground
    gfx.fillStyle(Phaser.Display.Color.HexStringToColor(arena.groundColor).color);
    gfx.fillRect(x0, y0 + 50, CARD_W - 4, 10);

    // Fighter silhouettes
    gfx.fillStyle(0x000000, 0.45);
    gfx.fillRect(x0 + 14, y0 + 26, 14, 24);  // left
    gfx.fillRect(x0 + 14, y0 + 18, 8, 10);
    gfx.fillRect(x0 + CARD_W - 32, y0 + 26, 14, 24); // right
    gfx.fillRect(x0 + CARD_W - 26, y0 + 18, 8, 10);
  }

  _onFight() {
    if (this.selectedId === null) return;
    const remaining = MECHS.filter((m) => m.id !== this.playerMech.id);
    const cpuMech = remaining[Math.floor(Math.random() * remaining.length)];

    this.scene.start('Match', {
      mode: this.mode,
      playerMech: this.playerMech,
      cpuMech,
      arena: ARENAS[this.selectedId],
    });
  }

  _addButton(x, y, label, cb) {
    const bw = 150;
    const bh = 34;
    this.add.rectangle(x, y, bw, bh).setStrokeStyle(1, 0x2a2a4a);
    const bg  = this.add.rectangle(x, y, bw - 2, bh - 2, 0x12121e);
    const txt = this.add.text(x, y, label, { ...BUTTON_STYLE, fontSize: '13px' }).setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover',  () => { bg.setFillColor(0x2a2a4a); txt.setColor('#00c8ff'); });
    bg.on('pointerout',   () => { bg.setFillColor(0x12121e); txt.setColor('#ccd6f6'); });
    bg.on('pointerup', cb);
    return txt;
  }
}
