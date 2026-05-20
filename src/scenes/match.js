// ── Constants ─────────────────────────────────────────────────────────────────
const W = 800;
const H = 450;
const FLOOR_Y = 370;
const GRAVITY = 0.5;
const JUMP_VEL = -13;
const FW = 48;  // fighter width
const FH = 90;  // fighter height
const GROUND_H = 30;

/** Duration (ms) a fighter stays defenseless after DP reaches 0 */
const DEFENSELESS_DURATION = 3000;
/** Rate at which DP recovers per frame after defenseless period ends */
const DP_RECOVER_RATE = 0.15;
/** How much incoming damage is absorbed by defense when blocking (rest goes to HP) */
const BLOCK_ABSORB = 0.85;
/** Attack hitbox active window (ms) */
const ATTACK_DURATION = 300;
/** Hit-stun duration (ms) */
const HIT_STUN = 400;
/** Attack reach in pixels */
const ATTACK_REACH = 90;

// ── Fighter factory ───────────────────────────────────────────────────────────
function createFighter(mech, startX, facing) {
  return {
    mech,
    x: startX,
    y: FLOOR_Y - FH,
    vx: 0,
    vy: 0,
    facing,          // 1 = right, -1 = left
    onGround: true,

    hp: mech.hp,
    maxHp: mech.hp,
    dp: mech.dp,
    maxDp: mech.dp,

    // state flags
    attacking: false,
    attackTimer: 0,
    blocking: false,
    inHitStun: false,
    hitStunTimer: 0,
    defenseless: false,
    defenselessTimer: 0,
    dead: false,
  };
}

// ── Match Scene ───────────────────────────────────────────────────────────────
export class MatchScene {
  constructor(game, { mode } = {}) {
    this.game = game;
    this.mode = mode;
    this.destroyed = false;

    this.player = createFighter(game.state.playerMech, 120, 1);
    this.cpu    = createFighter(game.state.cpuMech,    W - 120 - FW, -1);
    this.arena  = game.state.arena;

    this.keys = {};
    this.lastTime = 0;

    // overlay text (e.g. "FIGHT!", "KO", "YOU WIN")
    this.overlayText = 'FIGHT!';
    this.overlayTimer = 1500; // ms to show initial text

    this.matchOver = false;
    this.resultText = '';

    // CPU AI state
    this.cpuActionTimer = 0;
    this.cpuAction = 'idle'; // idle | approach | attack | jump | block

    this._onKey = this._onKey.bind(this);
  }

  render(container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'match-wrapper';

    const canvas = document.createElement('canvas');
    canvas.id = 'game-canvas';
    canvas.width = W;
    canvas.height = H;
    wrapper.appendChild(canvas);

    this.overlayEl = document.createElement('div');
    this.overlayEl.className = 'match-overlay';
    this.overlayEl.textContent = this.overlayText;
    wrapper.appendChild(this.overlayEl);

    container.appendChild(wrapper);

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this._scaleCanvas();
    window.addEventListener('resize', this._scaleCanvas.bind(this));
    window.addEventListener('keydown', this._onKey);
    window.addEventListener('keyup', this._onKey);

    requestAnimationFrame(this._loop.bind(this));
  }

  _scaleCanvas() {
    const scale = Math.min(
      window.innerWidth  / W,
      window.innerHeight / H,
    );
    this.canvas.style.width  = `${W * scale}px`;
    this.canvas.style.height = `${H * scale}px`;
  }

  _onKey(e) {
    this.keys[e.code] = e.type === 'keydown';
  }

  // ── Game Loop ──────────────────────────────────────────────────────────────
  _loop(ts) {
    if (this.destroyed) return;

    const dt = Math.min(ts - this.lastTime, 50); // cap at 50 ms
    this.lastTime = ts;

    if (!this.matchOver) {
      this._update(dt);
    }
    this._render();

    requestAnimationFrame(this._loop.bind(this));
  }

  _update(dt) {
    this._updateOverlay(dt);
    if (this.overlayTimer > 0) return; // freeze during intro countdown

    this._handlePlayerInput();
    this._updateCpuAI(dt);

    this._applyPhysics(this.player, dt);
    this._applyPhysics(this.cpu, dt);

    this._checkAttack(this.player, this.cpu, dt);
    this._checkAttack(this.cpu, this.player, dt);

    this._updateTimers(this.player, dt);
    this._updateTimers(this.cpu, dt);
    this._recoverDp(this.player);
    this._recoverDp(this.cpu);

    this._checkWin();
  }

  _updateOverlay(dt) {
    if (this.overlayTimer > 0) {
      this.overlayTimer -= dt;
      if (this.overlayTimer <= 0) {
        this.overlayEl.style.display = 'none';
      }
    }
  }

  // ── Player Input ──────────────────────────────────────────────────────────
  _handlePlayerInput() {
    const p = this.player;
    if (p.dead || p.inHitStun) return;

    // Block (hold S or ArrowDown when not attacking)
    p.blocking = (this.keys['KeyS'] || this.keys['ArrowDown']) && !p.attacking;

    if (!p.attacking) {
      // Horizontal movement
      const spd = p.mech.speed;
      if (this.keys['ArrowLeft']  || this.keys['KeyA']) { p.vx = -spd; p.facing = -1; }
      else if (this.keys['ArrowRight'] || this.keys['KeyD']) { p.vx = spd;  p.facing =  1; }
      else { p.vx = 0; }

      // Jump (W / ArrowUp / Space)
      if ((this.keys['ArrowUp'] || this.keys['KeyW'] || this.keys['Space']) && p.onGround) {
        p.vy = JUMP_VEL;
        p.onGround = false;
      }

      // Attack (Z or J)
      if (this.keys['KeyZ'] || this.keys['KeyJ']) {
        p.attacking = true;
        p.attackTimer = ATTACK_DURATION;
        p.attackLanded = false;
        p.blocking = false;
      }
    }
  }

  // ── CPU AI ────────────────────────────────────────────────────────────────
  _updateCpuAI(dt) {
    const cpu = this.cpu;
    if (cpu.dead || cpu.inHitStun) { cpu.vx = 0; return; }

    this.cpuActionTimer -= dt;
    if (this.cpuActionTimer <= 0) {
      this._pickCpuAction();
    }

    const p = this.player;
    const dist = Math.abs(cpu.x - p.x);

    // Face the player
    cpu.facing = cpu.x > p.x ? -1 : 1;

    // Blocking
    cpu.blocking = this.cpuAction === 'block';

    switch (this.cpuAction) {
      case 'approach':
        cpu.vx = cpu.facing * cpu.mech.speed;
        break;
      case 'attack':
        cpu.vx = 0;
        if (!cpu.attacking && dist < ATTACK_REACH) {
          cpu.attacking = true;
          cpu.attackTimer = ATTACK_DURATION;
          cpu.attackLanded = false;
          cpu.blocking = false;
        }
        break;
      case 'jump':
        cpu.vx = cpu.facing * cpu.mech.speed * 0.5;
        if (cpu.onGround) {
          cpu.vy = JUMP_VEL;
          cpu.onGround = false;
        }
        break;
      case 'retreat':
        cpu.vx = -cpu.facing * cpu.mech.speed;
        break;
      default:
        cpu.vx = 0;
    }
  }

  _pickCpuAction() {
    const dist = Math.abs(this.cpu.x - this.player.x);
    const r = Math.random();

    if (dist > 200) {
      this.cpuAction = r < 0.7 ? 'approach' : 'jump';
      this.cpuActionTimer = 600 + Math.random() * 400;
    } else if (dist < ATTACK_REACH + 10) {
      if (r < 0.55)      { this.cpuAction = 'attack';  this.cpuActionTimer = 500; }
      else if (r < 0.75) { this.cpuAction = 'block';   this.cpuActionTimer = 600 + Math.random() * 400; }
      else if (r < 0.88) { this.cpuAction = 'retreat'; this.cpuActionTimer = 400; }
      else               { this.cpuAction = 'jump';    this.cpuActionTimer = 400; }
    } else {
      if (r < 0.5)       { this.cpuAction = 'approach'; this.cpuActionTimer = 500; }
      else if (r < 0.7)  { this.cpuAction = 'attack';   this.cpuActionTimer = 400; }
      else               { this.cpuAction = 'block';    this.cpuActionTimer = 400; }
    }
  }

  // ── Physics ───────────────────────────────────────────────────────────────
  _applyPhysics(f) {
    if (f.dead) return;

    f.vy += GRAVITY;
    f.x += f.vx;
    f.y += f.vy;

    // Floor
    if (f.y >= FLOOR_Y - FH) {
      f.y = FLOOR_Y - FH;
      f.vy = 0;
      f.onGround = true;
    }

    // Stage boundaries
    const margin = 10;
    if (f.x < margin)       f.x = margin;
    if (f.x > W - FW - margin) f.x = W - FW - margin;
  }

  // ── Attack resolution ─────────────────────────────────────────────────────
  _checkAttack(attacker, defender, dt) {
    if (!attacker.attacking || attacker.attackLanded || defender.dead) return;

    const dist = Math.abs(
      (attacker.x + FW / 2) - (defender.x + FW / 2),
    );

    if (dist > ATTACK_REACH) return;

    // Facing check: attacker must be facing defender
    const facingOk = attacker.facing === (attacker.x < defender.x ? 1 : -1);
    if (!facingOk) return;

    attacker.attackLanded = true;

    const rawDmg = attacker.mech.attack;

    if (defender.blocking && !defender.defenseless) {
      // Damage goes to defense points first
      const dpDmg = rawDmg * BLOCK_ABSORB;
      const hpDmg = rawDmg * (1 - BLOCK_ABSORB);
      defender.dp = Math.max(0, defender.dp - dpDmg);
      defender.hp = Math.max(0, defender.hp - hpDmg);

      if (defender.dp <= 0) {
        defender.dp = 0;
        defender.defenseless = true;
        defender.defenselessTimer = DEFENSELESS_DURATION;
      }
    } else {
      // Direct HP damage (defenseless or not blocking)
      defender.hp = Math.max(0, defender.hp - rawDmg);
      // Small knock-back
      const kb = attacker.facing * 6;
      defender.vx = kb;
      defender.inHitStun = true;
      defender.hitStunTimer = HIT_STUN;
    }
  }

  // ── Timers & Recovery ─────────────────────────────────────────────────────
  _updateTimers(f, dt) {
    if (f.attacking) {
      f.attackTimer -= dt;
      if (f.attackTimer <= 0) {
        f.attacking = false;
        f.attackTimer = 0;
      }
    }
    if (f.inHitStun) {
      f.hitStunTimer -= dt;
      if (f.hitStunTimer <= 0) {
        f.inHitStun = false;
        f.hitStunTimer = 0;
      }
    }
    if (f.defenseless) {
      f.defenselessTimer -= dt;
      if (f.defenselessTimer <= 0) {
        f.defenseless = false;
        f.defenselessTimer = 0;
        // DP will recover gradually via _recoverDp
      }
    }
  }

  _recoverDp(f) {
    if (!f.defenseless && f.dp < f.maxDp) {
      f.dp = Math.min(f.maxDp, f.dp + DP_RECOVER_RATE);
    }
  }

  // ── Win Condition ─────────────────────────────────────────────────────────
  _checkWin() {
    if (this.player.hp <= 0) this.player.dead = true;
    if (this.cpu.hp    <= 0) this.cpu.dead    = true;

    if (this.player.dead || this.cpu.dead) {
      this.matchOver = true;
      const playerWon = !this.player.dead;
      this.resultText = playerWon ? 'YOU WIN!' : 'K.O.';

      this.overlayEl.textContent = this.resultText;
      this.overlayEl.style.display = 'block';
      this.overlayTimer = 999999; // keep visible

      // Return-to-menu after 4 s
      setTimeout(() => {
        if (!this.destroyed) this.game.navigate('main-menu');
      }, 4000);
    }
  }

  // ── Rendering ─────────────────────────────────────────────────────────────
  _render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, W, H);

    this._drawBackground(ctx);
    this._drawFighter(ctx, this.player);
    this._drawFighter(ctx, this.cpu);
    this._drawHud(ctx);
  }

  _drawBackground(ctx) {
    const arena = this.arena;

    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
    grad.addColorStop(0, arena.bgTop);
    grad.addColorStop(1, arena.bgBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, FLOOR_Y);

    // Ground
    ctx.fillStyle = arena.groundColor;
    ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);

    // Ground edge highlight
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, FLOOR_Y, W, 2);
  }

  _drawFighter(ctx, f) {
    const { x, y, mech, facing, defenseless, blocking, attacking, dead } = f;
    const cx = x + FW / 2;

    ctx.save();

    // Defenseless: pulsing dim effect
    if (defenseless) {
      const pulse = 0.4 + 0.3 * Math.sin(Date.now() / 120);
      ctx.globalAlpha = pulse;
    } else if (dead) {
      ctx.globalAlpha = 0.35;
    }

    // Blocking: slight blue tint overlay (drawn after)
    const color = mech.color;
    const dark  = this._darken(color, 0.45);

    // --- Shadow ---
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, FLOOR_Y + 6, FW * 0.55, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mirror horizontally if facing left
    ctx.translate(cx, y + FH / 2);
    ctx.scale(facing, 1);
    const hw = FW / 2;
    const hh = FH / 2;

    // Legs
    ctx.fillStyle = dark;
    ctx.fillRect(-hw + 3,  hh - 26, 16, 26);
    ctx.fillRect( hw - 19, hh - 26, 16, 26);

    // Body
    ctx.fillStyle = color;
    ctx.fillRect(-hw + 2, -hh + 20, FW - 4, FH - 46);

    // Chest detail
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(-hw + 8, -hh + 26, FW - 16, 10);

    // Arms
    ctx.fillStyle = dark;
    ctx.fillRect(-hw - 7, -hh + 20, 10, 26); // left arm
    ctx.fillRect( hw - 3, -hh + 20, 10, 26); // right arm

    // Attack arm extension
    if (attacking) {
      ctx.fillStyle = color;
      ctx.fillRect(hw + 5, -hh + 26, 20, 8); // punch extension
    }

    // Head
    ctx.fillStyle = color;
    ctx.fillRect(-hw + 8, -hh, FW - 16, 22);

    // Visor
    ctx.fillStyle = '#001824';
    ctx.fillRect(-hw + 12, -hh + 7, FW - 24, 8);
    ctx.fillStyle = 'rgba(0,200,255,0.55)';
    ctx.fillRect(-hw + 12, -hh + 7, FW - 24, 8);

    // Blocking shield overlay
    if (blocking) {
      ctx.fillStyle = 'rgba(50,120,255,0.30)';
      ctx.fillRect(-hw - 2, -hh, FW + 4, FH);
    }

    ctx.restore();
  }

  _drawHud(ctx) {
    this._drawHudPanel(ctx, this.player, 10,      10, 'left');
    this._drawHudPanel(ctx, this.cpu,    W - 260, 10, 'right');
  }

  _drawHudPanel(ctx, fighter, panelX, panelY, side) {
    const PW = 250;
    const { hp, maxHp, dp, maxDp, mech, defenseless } = fighter;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(panelX, panelY, PW, 56);

    // Mech name
    ctx.fillStyle = '#ccd6f6';
    ctx.font = 'bold 12px Courier New, monospace';
    ctx.textAlign = side === 'left' ? 'left' : 'right';
    const nameX = side === 'left' ? panelX + 8 : panelX + PW - 8;
    ctx.fillText(mech.name.toUpperCase(), nameX, panelY + 14);

    const barX  = panelX + 8;
    const barW  = PW - 16;

    // HP bar
    const hpRatio = hp / maxHp;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(barX, panelY + 20, barW, 12);
    ctx.fillStyle = hpRatio > 0.3 ? '#2ecc71' : '#e74c3c';
    ctx.fillRect(barX, panelY + 20, barW * hpRatio, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(barX, panelY + 20, barW, 6); // gloss

    // HP label
    ctx.fillStyle = '#aaa';
    ctx.font = '9px Courier New, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`HP`, barX, panelY + 19);

    // DP bar
    const dpRatio = dp / maxDp;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(barX, panelY + 38, barW, 10);

    // When defenseless: red empty bar + animated border
    if (defenseless) {
      ctx.fillStyle = 'rgba(200,0,0,0.35)';
      ctx.fillRect(barX, panelY + 38, barW, 10);
      ctx.strokeStyle = `rgba(255,60,60,${0.5 + 0.5 * Math.sin(Date.now() / 150)})`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(barX, panelY + 38, barW, 10);
    } else {
      ctx.fillStyle = '#3498db';
      ctx.fillRect(barX, panelY + 38, barW * dpRatio, 10);
    }

    ctx.fillStyle = '#aaa';
    ctx.font = '9px Courier New, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`DP${defenseless ? ' — DEFENSELESS' : ''}`, barX, panelY + 37);
  }

  /** Darkens a hex colour by `amount` (0-1). */
  _darken(hex, amount) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, ((n >> 16) & 0xff) * (1 - amount)) | 0;
    const g = Math.max(0, ((n >> 8)  & 0xff) * (1 - amount)) | 0;
    const b = Math.max(0, ( n        & 0xff) * (1 - amount)) | 0;
    return `rgb(${r},${g},${b})`;
  }

  destroy() {
    this.destroyed = true;
    window.removeEventListener('keydown', this._onKey);
    window.removeEventListener('keyup', this._onKey);
  }
}
