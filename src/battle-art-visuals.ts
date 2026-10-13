import { ART_CHARGE_TIME, BATTLE_ARTS } from "./battle-arts";
import type { BattleArtState } from "./battle-arts";
import type { ClassId } from "./content";
import type { Effect, Projectile, Vec } from "./engine";
import { glow } from "./spell-visuals";
import { drawSpellTexture } from "./spell-textures";

const TAU = Math.PI * 2;
function ellipse(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  flat = 1,
) {
  c.beginPath();
  c.ellipse(x, y, Math.max(0.1, r), Math.max(0.1, r * flat), 0, 0, TAU);
  c.stroke();
}
function diamond(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  width: number,
) {
  c.beginPath();
  c.moveTo(x + length, y);
  c.lineTo(x, y - width);
  c.lineTo(x - length, y);
  c.lineTo(x, y + width);
  c.closePath();
  c.fill();
}
export function drawArtAim(
  c: CanvasRenderingContext2D,
  state: BattleArtState,
  id: ClassId,
  player: Vec & { facing: number },
  time: number,
  motion: boolean,
  particles: boolean,
) {
  if (!state.charging) return;
  const art = BATTLE_ARTS[id],
    charge = state.charge / ART_CHARGE_TIME;
  const target = state.target(player, art),
    angle = state.angle(player);
  c.save();
  c.strokeStyle = art.color;
  c.fillStyle = art.color;
  c.lineWidth = 1.3;
  c.globalAlpha = 0.23 + charge * 0.22;
  if (art.shape === "blast") {
    ellipse(c, target.x, target.y, art.radius);
    ellipse(c, target.x, target.y, art.radius * 0.82);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + (motion ? time * 0.7 : 0);
      c.beginPath();
      c.moveTo(
        target.x + Math.cos(a) * (art.radius - 8),
        target.y + Math.sin(a) * (art.radius - 8),
      );
      c.lineTo(
        target.x + Math.cos(a) * (art.radius + 10),
        target.y + Math.sin(a) * (art.radius + 10),
      );
      c.stroke();
    }
  } else if (art.shape === "chain") {
    ellipse(c, target.x, target.y, 21);
    c.setLineDash([6, 8]);
    c.beginPath();
    c.moveTo(player.x, player.y);
    c.lineTo(target.x, target.y);
    c.stroke();
    c.setLineDash([]);
  } else {
    c.save();
    c.translate(player.x, player.y);
    c.rotate(angle);
    c.beginPath();
    if (art.shape === "cone" || art.shape === "lunge") {
      c.moveTo(0, 0);
      c.arc(0, 0, art.range, -art.radius, art.radius);
      c.closePath();
    } else {
      const reach = Math.hypot(target.x - player.x, target.y - player.y);
      c.moveTo(25, -art.radius);
      c.lineTo(reach, -3);
      c.lineTo(reach + 9, 0);
      c.lineTo(reach, 3);
      c.lineTo(25, art.radius);
    }
    c.stroke();
    c.globalAlpha *= 0.16;
    c.fill();
    c.restore();
  }
  c.globalAlpha = 0.9;
  c.lineWidth = 3;
  c.beginPath();
  c.ellipse(
    player.x,
    player.y + 5,
    27,
    12,
    0,
    -Math.PI / 2,
    -Math.PI / 2 + TAU * Math.max(0.02, charge),
  );
  c.stroke();
  c.translate(player.x + Math.cos(angle) * 23, player.y - 36);
  if (particles) glow(c, 22 + charge * 24, art.color, 0.35 + charge * 0.4);
  c.fillStyle = charge >= 0.99 ? "#ffffff" : art.color;
  diamond(c, 0, 0, 3 + charge * 6, 2 + charge * 3);
  if (particles)
    for (let i = 0; i < 7; i++) {
      const a = (i * TAU) / 7 + (motion ? time * 3 : 0),
        r = 25 * (1 - charge) + 9;
      c.globalAlpha = 0.5;
      diamond(c, Math.cos(a) * r, Math.sin(a) * r, 2, 1);
    }
  c.restore();
}

export function drawArtProjectile(
  c: CanvasRenderingContext2D,
  shot: Projectile,
  time: number,
  particles: boolean,
) {
  const id = shot.battleArt!,
    art = BATTLE_ARTS[id];
  c.save();
  c.translate(shot.x, shot.y);
  c.rotate(Math.atan2(shot.vy, shot.vx));
  c.strokeStyle = art.color;
  c.fillStyle = art.color;
  c.lineCap = "round";
  if (particles) {
    glow(c, 48, art.color, 0.65);
    c.globalAlpha = 0.5;
  }
  for (let i = 0; i < 3; i++) {
    c.lineWidth = 6 - i * 1.7;
    c.globalAlpha = 0.5 - i * 0.12;
    c.beginPath();
    c.moveTo(6, 0);
    c.bezierCurveTo(
      -35,
      -13 + i * 13,
      -65,
      Math.sin(time * 18 + i) * 10,
      -115 - i * 12,
      0,
    );
    c.stroke();
  }
  c.globalAlpha = 1;
  diamond(c, 3, 0, id === "hunter" ? 34 : 30, id === "hunter" ? 4 : 11);
  c.fillStyle = "#f6ffff";
  diamond(c, 9, -1, 20, 3);
  if (id === "mage" || id === "druid")
    for (let i = 0; i < 3; i++) {
      c.fillStyle = art.color;
      diamond(c, -13 - i * 13, (i % 2 ? 1 : -1) * (12 + i * 2), 10 - i * 2, 3);
    }
  if (shot.charged) {
    c.strokeStyle = "#ffffff";
    c.lineWidth = 1;
    ellipse(c, -5, 0, 20, 0.6);
  }
  c.restore();
}

export function drawArtEffect(
  c: CanvasRenderingContext2D,
  fx: Effect,
  motion: boolean,
  particles: boolean,
) {
  const art = BATTLE_ARTS[fx.battleArt!];
  const age = Math.max(0, Math.min(1, 1 - fx.life / fx.maxLife)),
    p = motion ? age : 0.45;
  const fade = (1 - age) ** 1.3;
  c.save();
  c.translate(fx.x, fx.y);
  c.globalAlpha = fade;
  c.strokeStyle = art.color;
  c.fillStyle = art.color;
  c.lineCap = "round";
  if (fx.kind === "line" && fx.end) {
    const dx = fx.end.x - fx.x,
      dy = fx.end.y - fx.y,
      length = Math.hypot(dx, dy);
    c.rotate(Math.atan2(dy, dx));
    for (let layer = 0; layer < 3; layer++) {
      c.lineWidth = [26, 9, 2][layer] * (1 - p * 0.7);
      c.strokeStyle = layer === 2 ? "#fff9e3" : art.color;
      c.globalAlpha = fade * [0.16, 0.6, 1][layer];
      c.beginPath();
      c.moveTo(0, -20);
      for (let j = 1; j < 13; j++)
        c.lineTo(
          (length * j) / 12,
          art.shape === "chain" ? Math.sin(j * 17 + p * 21) * 13 : -20,
        );
      c.stroke();
    }
    c.translate(length, -20);
    if (particles) glow(c, 45, art.color, fade);
  } else if (art.shape === "blast") {
    const r = art.radius * (0.45 + 0.55 * (1 - (1 - p) ** 3));
    if (particles) glow(c, r * 1.3, art.color, fade * 0.65);
    drawSpellTexture(
      c,
      fx.battleArt === "paladin" ? "holy" : "shadow",
      p,
      art.radius,
      fade,
    );
    c.lineWidth = 5 * (1 - p) + 1;
    ellipse(c, 0, 0, r, 0.62);
    c.lineWidth = 1;
    ellipse(c, 0, 0, r * 1.1, 0.62);
    const beam = c.createLinearGradient(0, -190, 0, 0);
    beam.addColorStop(0, art.color + "00");
    beam.addColorStop(1, art.color + "b0");
    c.fillStyle = beam;
    c.globalAlpha = fade * (1 - p);
    c.beginPath();
    c.moveTo(-10, -190);
    c.lineTo(10, -190);
    c.lineTo(30, 0);
    c.lineTo(-30, 0);
    c.closePath();
    c.fill();
    c.fillStyle = "#fff5df";
    c.globalAlpha = fade;
    for (let i = 0; i < 10; i++) {
      const a = (i * TAU) / 10;
      diamond(
        c,
        Math.cos(a) * r * 0.75,
        Math.sin(a) * r * 0.4 - p * 35,
        4,
        9 * (1 - p),
      );
    }
  } else if (art.shape === "cone" || art.shape === "lunge") {
    c.rotate(fx.facing || 0);
    for (let layer = 0; layer < 3; layer++) {
      const r = art.range * (0.65 + 0.32 * p) - layer * 8,
        start = -art.radius + p * 0.65;
      c.globalAlpha = fade * (1 - layer * 0.24);
      c.fillStyle = layer ? art.color : "#fff6d7";
      c.beginPath();
      c.arc(0, 0, r, start, start + 1.15);
      c.arc(0, 0, r - (12 - layer * 3) * (1 - p), start + 1.15, start, true);
      c.closePath();
      c.fill();
    }
  } else {
    // Release flash at the hand; the missile carries the main volume downrange.
    c.translate(Math.cos(fx.facing || 0) * 23, -32);
    if (particles) glow(c, 40, art.color, fade * 0.65);
    c.lineWidth = 2;
    ellipse(c, 0, 0, 8 + p * 24, 0.8);
  }
  c.restore();
}

/** Short retained paths make travel visible. Weak ownership bounds lifetime to the missile. */
export class SpellTrails {
  private paths = new WeakMap<object, (Vec & { time: number })[]>();
  draw(
    c: CanvasRenderingContext2D,
    owner: Projectile,
    point: Vec,
    time: number,
    enabled: boolean,
  ) {
    if (!enabled || owner.enemy || !owner.spellId) return;
    let path = this.paths.get(owner);
    if (!path) {
      path = [];
      this.paths.set(owner, path);
    }
    if (!path.length || time - path[path.length - 1].time >= 0.018) {
      path.push({ ...point, time });
      if (path.length > 9) path.shift();
    }
    if (path.length < 2) return;
    c.save();
    c.strokeStyle = owner.color;
    c.lineCap = "round";
    for (let i = 1; i < path.length; i++) {
      c.globalAlpha = (i / path.length) * 0.38;
      c.lineWidth = (i / path.length) * (owner.battleArt ? 12 : 5);
      c.beginPath();
      c.moveTo(path[i - 1].x, path[i - 1].y);
      c.lineTo(path[i].x, path[i].y);
      c.stroke();
    }
    c.restore();
  }
}
