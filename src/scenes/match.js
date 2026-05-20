import Phaser from 'phaser';
import { MECHS } from '../data/mechs.js';
import { HUD_LABEL_STYLE, HUD_NAME_STYLE, OVERLAY_STYLE, SMALL_STYLE } from './ui-styles.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const W = 800;
const H = 450;
const FLOOR_Y = 370;
const GRAVITY = 0.5;
const JUMP_VEL = -13;
const FW = 48;
const FH = 90;

const DEFENSELESS_DURATION = 3000;
const DP_RECOVER_RATE = 0.15;
const BLOCK_ABSORB = 0.85;
const ATTACK_DURATION = 300;
const HIT_STUN = 400;
const ATTACK_REACH = 90;

// ── Fighter factory ───────────────────────────────────────────────────────────
function createFighter(mech, startX, facing) {
  return {
    mech,
    x: startX,
    y: FLOOR_Y - FH,
    vx: 0,
    vy: 0,
    facing,
    onGround: true,
    hp: mech.hp,
    maxHp: mech.hp,
    dp: mech.dp,
    maxDp: mech.dp,
    attacking: false,
    attackTimer: 0,
    attackLanded: false,
    blocking: false,
    inHitStun: false,
    hitStunTimer: 0,
    defenseless: false,
    defenselessTimer: 0,
    dead: false,
  };
}

// ── Match Scene ───────────────────────────────────────────────────────────────
export class MatchScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Match' });
  }

  init(data) {
    this.playerMech = data.playerMech;
    this.cpuMech    = data.cpuMech;
    this.arena      = data.arena;
  }

  create() {
    this.playerState = createFighter(this.playerMech, 120, 1);
    this.cpuState    = createFighter(this.cpuMech, W - 120 - FW, -1);

    this.matchOver    = false;
    this.overlayTimer = 1500;
    this.cpuActionTimer = 0;
    this.cpuAction    = 'idle';

    // Graphics layers
    this.bgGfx      = this.add.graphics().setDepth(0);
    this.fighterGfx = this.add.graphics().setDepth(1);
    this.hudGfx     = this.add.graphics().setDepth(5);

    // HUD text objects
    this.pNameTxt = this.add.text(18, 12, this.playerMech.name.toUpperCase(), HUD_NAME_STYLE).setDepth(6);
    this.cNameTxt = this.add.text(W - 18, 12, this.cpuMech.name.toUpperCase(), HUD_NAME_STYLE)
      .setOrigin(1, 0).setDepth(6);

    this.pHpTxt  = this.add.text(18, 22, 'HP', HUD_LABEL_STYLE).setDepth(6);
    this.cHpTxt  = this.add.text(W - 18, 22, 'HP', HUD_LABEL_STYLE).setOrigin(1, 0).setDepth(6);
    this.pDpTxt  = this.add.text(18, 40, 'DP', HUD_LABEL_STYLE).setDepth(6);
    this.cDpTxt  = this.add.text(W - 18, 40, 'DP', HUD_LABEL_STYLE).setOrigin(1, 0).setDepth(6);

    // Overlay text (FIGHT!, KO, YOU WIN)
    this.overlayTxt = this.add.text(W / 2, H / 2, 'FIGHT!', OVERLAY_STYLE)
      .setOrigin(0.5).setDepth(10);

    // Controls hint
    this.add.text(W / 2, H - 12,
      'ARROWS/WASD: move   SPACE/W: jump   Z/J: attack   S/↓: block',
      { ...SMALL_STYLE, letterSpacing: 1 },
    ).setOrigin(0.5).setDepth(6);

    // Keyboard input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd    = this.input.keyboard.addKeys({ up: 'W', left: 'A', right: 'D', down: 'S' });
    this.atkZ    = this.input.keyboard.addKey('Z');
    this.atkJ    = this.input.keyboard.addKey('J');
    this.spaceKey = this.input.keyboard.addKey('SPACE');
  }

  update(time, delta) {
    if (this.overlayTimer > 0) {
      this.overlayTimer -= delta;
      if (this.overlayTimer <= 0) this.overlayTxt.setVisible(false);
    }

    if (!this.matchOver && this.overlayTimer <= 0) {
      this._handleInput();
      this._updateCpuAI(delta);
      this._applyPhysics(this.playerState);
      this._applyPhysics(this.cpuState);
      this._checkAttack(this.playerState, this.cpuState);
      this._checkAttack(this.cpuState, this.playerState);
      this._updateTimers(this.playerState, delta);
      this._updateTimers(this.cpuState, delta);
      this._recoverDp(this.playerState);
      this._recoverDp(this.cpuState);
      this._checkWin();
    }

    this._render(time);
  }

  // ── Input ──────────────────────────────────────────────────────────────────
  _handleInput() {
    const p = this.playerState;
    if (p.dead || p.inHitStun) return;

    const blockDown = this.cursors.down.isDown || this.wasd.down.isDown;
    p.blocking = blockDown && !p.attacking;

    if (!p.attacking) {
      const spd = p.mech.speed;
      if (this.cursors.left.isDown || this.wasd.left.isDown)       { p.vx = -spd; p.facing = -1; }
      else if (this.cursors.right.isDown || this.wasd.right.isDown) { p.vx = spd;  p.facing =  1; }
      else { p.vx = 0; }

      const jumpPressed = this.cursors.up.isDown || this.wasd.up.isDown || this.spaceKey.isDown;
      if (jumpPressed && p.onGround) {
        p.vy = JUMP_VEL;
        p.onGround = false;
      }

      if (Phaser.Input.Keyboard.JustDown(this.atkZ) || Phaser.Input.Keyboard.JustDown(this.atkJ)) {
        p.attacking    = true;
        p.attackTimer  = ATTACK_DURATION;
        p.attackLanded = false;
        p.blocking     = false;
      }
    }
  }

  // ── CPU AI ─────────────────────────────────────────────────────────────────
  _updateCpuAI(delta) {
    const cpu = this.cpuState;
    if (cpu.dead || cpu.inHitStun) { cpu.vx = 0; return; }

    this.cpuActionTimer -= delta;
    if (this.cpuActionTimer <= 0) this._pickCpuAction();

    const dist = Math.abs(cpu.x - this.playerState.x);
    cpu.facing = cpu.x > this.playerState.x ? -1 : 1;
    cpu.blocking = this.cpuAction === 'block';

    switch (this.cpuAction) {
      case 'approach': cpu.vx = cpu.facing * cpu.mech.speed; break;
      case 'attack':
        cpu.vx = 0;
        if (!cpu.attacking && dist < ATTACK_REACH) {
          cpu.attacking    = true;
          cpu.attackTimer  = ATTACK_DURATION;
          cpu.attackLanded = false;
          cpu.blocking     = false;
        }
        break;
      case 'jump':
        cpu.vx = cpu.facing * cpu.mech.speed * 0.5;
        if (cpu.onGround) { cpu.vy = JUMP_VEL; cpu.onGround = false; }
        break;
      case 'retreat': cpu.vx = -cpu.facing * cpu.mech.speed; break;
      default: cpu.vx = 0;
    }
  }

  _pickCpuAction() {
    const dist = Math.abs(this.cpuState.x - this.playerState.x);
    const r = Math.random();

    if (dist > 200) {
      this.cpuAction = r < 0.7 ? 'approach' : 'jump';
      this.cpuActionTimer = 600 + Math.random() * 400;
    } else if (dist < ATTACK_REACH + 10) {
      if      (r < 0.55) { this.cpuAction = 'attack';  this.cpuActionTimer = 500; }
      else if (r < 0.75) { this.cpuAction = 'block';   this.cpuActionTimer = 600 + Math.random() * 400; }
      else if (r < 0.88) { this.cpuAction = 'retreat'; this.cpuActionTimer = 400; }
      else               { this.cpuAction = 'jump';    this.cpuActionTimer = 400; }
    } else {
      if      (r < 0.5)  { this.cpuAction = 'approach'; this.cpuActionTimer = 500; }
      else if (r < 0.7)  { this.cpuAction = 'attack';   this.cpuActionTimer = 400; }
      else               { this.cpuAction = 'block';    this.cpuActionTimer = 400; }
    }
  }

  // ── Physics ────────────────────────────────────────────────────────────────
  _applyPhysics(f) {
    if (f.dead) return;
    f.vy += GRAVITY;
    f.x  += f.vx;
    f.y  += f.vy;

    if (f.y >= FLOOR_Y - FH) { f.y = FLOOR_Y - FH; f.vy = 0; f.onGround = true; }
    if (f.x < 10)            f.x = 10;
    if (f.x > W - FW - 10)  f.x = W - FW - 10;
  }

  // ── Combat ─────────────────────────────────────────────────────────────────
  _checkAttack(attacker, defender) {
    if (!attacker.attacking || attacker.attackLanded || defender.dead) return;
    const dist = Math.abs((attacker.x + FW / 2) - (defender.x + FW / 2));
    if (dist > ATTACK_REACH) return;
    const facingOk = attacker.facing === (attacker.x < defender.x ? 1 : -1);
    if (!facingOk) return;

    attacker.attackLanded = true;
    const rawDmg = attacker.mech.attack;

    if (defender.blocking && !defender.defenseless) {
      defender.dp = Math.max(0, defender.dp - rawDmg * BLOCK_ABSORB);
      defender.hp = Math.max(0, defender.hp - rawDmg * (1 - BLOCK_ABSORB));
      if (defender.dp <= 0) {
        defender.dp = 0;
        defender.defenseless     = true;
        defender.defenselessTimer = DEFENSELESS_DURATION;
      }
    } else {
      defender.hp = Math.max(0, defender.hp - rawDmg);
      defender.vx = attacker.facing * 6;
      defender.inHitStun  = true;
      defender.hitStunTimer = HIT_STUN;
    }
  }

  // ── Timers & DP recovery ───────────────────────────────────────────────────
  _updateTimers(f, dt) {
    if (f.attacking) {
      f.attackTimer -= dt;
      if (f.attackTimer <= 0) { f.attacking = false; f.attackTimer = 0; }
    }
    if (f.inHitStun) {
      f.hitStunTimer -= dt;
      if (f.hitStunTimer <= 0) { f.inHitStun = false; f.hitStunTimer = 0; }
    }
    if (f.defenseless) {
      f.defenselessTimer -= dt;
      if (f.defenselessTimer <= 0) { f.defenseless = false; f.defenselessTimer = 0; }
    }
  }

  _recoverDp(f) {
    if (!f.defenseless && f.dp < f.maxDp) f.dp = Math.min(f.maxDp, f.dp + DP_RECOVER_RATE);
  }

  // ── Win condition ──────────────────────────────────────────────────────────
  _checkWin() {
    if (this.playerState.hp <= 0) this.playerState.dead = true;
    if (this.cpuState.hp    <= 0) this.cpuState.dead    = true;

    if (this.playerState.dead || this.cpuState.dead) {
      this.matchOver = true;
      const playerWon = !this.playerState.dead;
      const msg = playerWon ? 'YOU WIN!' : 'K.O.';
      this.overlayTxt.setText(msg).setVisible(true);

      this.time.delayedCall(4000, () => this.scene.start('MainMenu'));
    }
  }

  // ── Rendering ──────────────────────────────────────────────────────────────
  _render(time) {
    this._drawBackground();
    this.fighterGfx.clear();
    this._drawFighter(this.fighterGfx, this.playerState, time);
    this._drawFighter(this.fighterGfx, this.cpuState,    time);
    this._drawHud(time);
  }

  _drawBackground() {
    const a = this.arena;
    const g = this.bgGfx;
    g.clear();

    g.fillGradientStyle(
      Phaser.Display.Color.HexStringToColor(a.bgTop).color,
      Phaser.Display.Color.HexStringToColor(a.bgTop).color,
      Phaser.Display.Color.HexStringToColor(a.bgBottom).color,
      Phaser.Display.Color.HexStringToColor(a.bgBottom).color,
    );
    g.fillRect(0, 0, W, FLOOR_Y);

    g.fillStyle(Phaser.Display.Color.HexStringToColor(a.groundColor).color);
    g.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);

    // Ground edge highlight
    g.fillStyle(0xffffff, 0.06);
    g.fillRect(0, FLOOR_Y, W, 2);
  }

  _drawFighter(g, f, time) {
    const { x, y, mech, facing, defenseless, blocking, attacking, dead, inHitStun } = f;
    const cx = x + FW / 2;

    let alpha = 1;
    if (dead)        alpha = 0.3;
    else if (defenseless) alpha = 0.4 + 0.35 * Math.sin(time / 120);

    g.setAlpha(alpha);

    const c    = Phaser.Display.Color.HexStringToColor(mech.color).color;
    const dark = Phaser.Display.Color.ValueToColor(c);
    dark.darken(40);
    const dc = dark.color;

    // Shadow
    g.fillStyle(0x000000, 0.28);
    g.fillEllipse(cx, FLOOR_Y + 6, FW * 1.1, 14);

    // Transform: mirror for left-facing
    const sx = facing === -1 ? -1 : 1;

    // Helper to draw a rect relative to cx, y+FH/2 with x-flip
    const fr = (rx, ry, rw, rh, col, a_ = 1) => {
      g.fillStyle(col, a_);
      g.fillRect(cx + sx * rx, y + FH / 2 + ry, sx > 0 ? rw : -rw, rh);
    };

    const hw = FW / 2;
    const hh = FH / 2;

    // Legs
    fr(-hw + 3,  hh - 26, 16, 26, dc);
    fr( hw - 19, hh - 26, 16, 26, dc);

    // Body
    fr(-hw + 2, -hh + 20, FW - 4, FH - 46, c);

    // Chest detail
    fr(-hw + 8, -hh + 26, FW - 16, 10, 0xffffff, 0.10);

    // Arms
    fr(-hw - 7, -hh + 20, 10, 26, dc);
    fr( hw - 3, -hh + 20, 10, 26, dc);

    // Attack arm extension
    if (attacking) {
      fr(hw + 5, -hh + 26, 20, 8, c);
    }

    // Head
    fr(-hw + 8, -hh, FW - 16, 22, c);

    // Visor
    fr(-hw + 12, -hh + 7, FW - 24, 8, 0x001824);
    fr(-hw + 12, -hh + 7, FW - 24, 8, 0x00c8ff, 0.55);

    // Block shield overlay
    if (blocking) {
      fr(-hw - 2, -hh, FW + 4, FH, 0x3278ff, 0.28);
    }

    // Hit flash
    if (inHitStun) {
      fr(-hw, -hh, FW, FH, 0xff4040, 0.35);
    }

    g.setAlpha(1); // reset for next draw call
  }

  _drawHud(time) {
    const g = this.hudGfx;
    g.clear();
    this._drawHudPanel(g, this.playerState, 10,       10, 'left',  time);
    this._drawHudPanel(g, this.cpuState,    W - 260,  10, 'right', time);
  }

  _drawHudPanel(g, fighter, px, py, side, time) {
    const PW = 250;
    const { hp, maxHp, dp, maxDp, mech, defenseless } = fighter;

    // Panel background
    g.fillStyle(0x000000, 0.6);
    g.fillRect(px, py, PW, 56);

    const barX = px + 8;
    const barW = PW - 16;

    // HP bar background
    g.fillStyle(0x1a1a1a);
    g.fillRect(barX, py + 22, barW, 12);

    // HP bar fill
    const hpRatio = hp / maxHp;
    g.fillStyle(hpRatio > 0.3 ? 0x2ecc71 : 0xe74c3c);
    g.fillRect(barX, py + 22, barW * hpRatio, 12);

    // HP gloss
    g.fillStyle(0xffffff, 0.08);
    g.fillRect(barX, py + 22, barW, 6);

    // DP bar background
    g.fillStyle(0x1a1a1a);
    g.fillRect(barX, py + 40, barW, 10);

    if (defenseless) {
      // Pulsing red when defenseless
      g.fillStyle(0xcc0000, 0.3 + 0.2 * Math.sin(time / 150));
      g.fillRect(barX, py + 40, barW, 10);
      g.lineStyle(1.5, 0xff3c3c, 0.5 + 0.5 * Math.sin(time / 150));
      g.strokeRect(barX, py + 40, barW, 10);
    } else {
      g.fillStyle(0x3498db);
      g.fillRect(barX, py + 40, barW * (dp / maxDp), 10);
    }

    // Update text objects
    if (side === 'left') {
      this.pHpTxt.setText(`HP`);
      this.pDpTxt.setText(defenseless ? 'DP — DEFENSELESS' : 'DP');
    } else {
      this.cHpTxt.setText(`HP`);
      this.cDpTxt.setText(defenseless ? 'DP — DEFENSELESS' : 'DP');
    }
  }
}
