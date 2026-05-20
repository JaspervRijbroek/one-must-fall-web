import Phaser from 'phaser';
import { MECHS } from '../data/mechs.js';
import { TITLE_STYLE, HEADING_STYLE, BUTTON_STYLE, SMALL_STYLE } from './ui-styles.js';

const CARD_W = 100;
const CARD_H = 120;
const COLS = 5;
const GAP = 12;

export class MechSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MechSelect' });
  }

  init(data) {
    this.mode = data.mode ?? 'quick-match';
    this.selectedId = null;
  }

  preload() {
    // Generate a coloured texture for each mech avatar
    MECHS.forEach((mech) => {
      const key = `mech-avatar-${mech.id}`;
      if (this.textures.exists(key)) return;
      const gfx = this.make.graphics({ x: 0, y: 0, add: false });
      this._drawMechShape(gfx, mech.color, 0, 0);
      gfx.generateTexture(key, 58, 76);
      gfx.destroy();
    });
  }

  create() {
    const { width } = this.scale;
    const cx = width / 2;

    this.add.text(cx, 28, 'ONE MUST FALL', { ...TITLE_STYLE, fontSize: '26px' }).setOrigin(0.5);
    this.add.text(cx, 62, 'SELECT YOUR MECH', HEADING_STYLE).setOrigin(0.5);

    // Grid layout
    const totalW = COLS * CARD_W + (COLS - 1) * GAP;
    const startX = (width - totalW) / 2 + CARD_W / 2;
    const startY = 110;

    this._cardBorders = [];
    this._cardBgs = [];

    MECHS.forEach((mech, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = startX + col * (CARD_W + GAP);
      const y = startY + row * (CARD_H + GAP) + CARD_H / 2;
      this._createMechCard(mech, x, y);
    });

    // Buttons
    this._selectBtn = this._addButton(cx + 80, 416, 'SELECT  ►', true, () => this._onSelect());
    this._selectBtn.setAlpha(0.35); // disabled until a mech is chosen
    this._addButton(cx - 80, 416, '◄  BACK', true, () => this.scene.start('MainMenu'));

    this.add.text(cx, 438, 'CLICK A MECH CARD TO CHOOSE', {
      ...SMALL_STYLE, letterSpacing: 2,
    }).setOrigin(0.5);
  }

  _createMechCard(mech, x, y) {
    const border = this.add.rectangle(x, y, CARD_W, CARD_H).setStrokeStyle(1, 0x2a2a4a);
    const bg = this.add.rectangle(x, y, CARD_W - 2, CARD_H - 2, 0x12121e)
      .setInteractive({ useHandCursor: true });

    this.add.image(x, y - 18, `mech-avatar-${mech.id}`).setDisplaySize(44, 58);

    this.add.text(x, y + 32, mech.name.toUpperCase(), {
      ...SMALL_STYLE, fontSize: '9px', letterSpacing: 1, color: '#ccd6f6',
    }).setOrigin(0.5);

    this.add.text(x - CARD_W / 2 + 4, y + 44, `HP ${mech.hp}  DP ${mech.dp}`, {
      ...SMALL_STYLE, fontSize: '8px',
    });
    this.add.text(x - CARD_W / 2 + 4, y + 54, `SPD ${mech.speed}  ATK ${mech.attack}`, {
      ...SMALL_STYLE, fontSize: '8px',
    });

    bg.on('pointerover', () => {
      if (this.selectedId !== mech.id) border.setStrokeStyle(1, 0x00c8ff);
    });
    bg.on('pointerout', () => {
      if (this.selectedId !== mech.id) border.setStrokeStyle(1, 0x2a2a4a);
    });
    bg.on('pointerup', () => {
      this.selectedId = mech.id;
      this._cardBorders.forEach((b, idx) => {
        b.setStrokeStyle(1, idx === mech.id ? 0xffc84a : 0x2a2a4a);
        this._cardBgs[idx].setFillColor(idx === mech.id ? 0x1f1f08 : 0x12121e);
      });
      this._selectBtn.setAlpha(1);
    });

    this._cardBorders.push(border);
    this._cardBgs.push(bg);
  }

  _onSelect() {
    if (this.selectedId === null) return;
    this.scene.start('ArenaSelect', { mode: this.mode, playerMech: MECHS[this.selectedId] });
  }

  _addButton(x, y, label, enabled, cb) {
    const bw = 150;
    const bh = 34;
    this.add.rectangle(x, y, bw, bh).setStrokeStyle(1, 0x2a2a4a);
    const bg  = this.add.rectangle(x, y, bw - 2, bh - 2, 0x12121e);
    const txt = this.add.text(x, y, label, { ...BUTTON_STYLE, fontSize: '13px' }).setOrigin(0.5);

    if (!enabled) return txt;

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover',  () => { bg.setFillColor(0x2a2a4a); txt.setColor('#00c8ff'); });
    bg.on('pointerout',   () => { bg.setFillColor(0x12121e); txt.setColor('#ccd6f6'); });
    bg.on('pointerup', cb);
    return txt;
  }

  /** Draws a simplified mech shape using Phaser Graphics at offset (ox, oy). */
  _drawMechShape(gfx, hexColor, ox, oy) {
    const c = Phaser.Display.Color.HexStringToColor(hexColor).color;
    const dark = Phaser.Display.Color.ValueToColor(c);
    dark.darken(40);

    // Legs
    gfx.fillStyle(dark.color);
    gfx.fillRect(ox + 5,  oy + 54, 18, 22);
    gfx.fillRect(ox + 35, oy + 54, 18, 22);

    // Body
    gfx.fillStyle(c);
    gfx.fillRect(ox + 4, oy + 22, 50, 34);

    // Chest detail
    gfx.fillStyle(0xffffff, 0.1);
    gfx.fillRect(ox + 10, oy + 28, 38, 10);

    // Arms
    gfx.fillStyle(dark.color);
    gfx.fillRect(ox - 8,  oy + 22, 14, 24);
    gfx.fillRect(ox + 52, oy + 22, 14, 24);

    // Head
    gfx.fillStyle(c);
    gfx.fillRect(ox + 14, oy + 2, 30, 20);

    // Visor
    gfx.fillStyle(0x001824);
    gfx.fillRect(ox + 18, oy + 8, 22, 8);
    gfx.fillStyle(0x00c8ff, 0.6);
    gfx.fillRect(ox + 18, oy + 8, 22, 8);
  }
}
