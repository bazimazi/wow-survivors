import type { ClassId } from "./content";
import type { ClassActor, ClassAnchor } from "./class-combat";
import type { Effect, Vec, Projectile } from "./engine";

const TAU = Math.PI * 2;
const COLORS: Record<ClassId, string> = {
  warrior: "#e4b48b",
  mage: "#8fdfff",
  rogue: "#c6a3f0",
  hunter: "#b9d98a",
  paladin: "#ffdd83",
  priest: "#e5f3ff",
  shaman: "#79c9ff",
  warlock: "#b2e36d",
  druid: "#b8de96",
};

export function drawClassProjectile(
  c: CanvasRenderingContext2D,
  shot: Projectile,
  particles: boolean,
) {
  const id = shot.classId;
  if (!id) return;
  c.save();
  c.translate(shot.x, shot.y);
  c.rotate(Math.atan2(shot.vy, shot.vx));
  c.strokeStyle = shot.color;
  c.fillStyle = shot.color;
  c.lineWidth = 2;
  if (particles) {
    c.shadowColor = shot.color;
    c.shadowBlur = 7;
  }
  if (id === "hunter") {
    c.strokeStyle = "#dbcca0";
    c.beginPath();
    c.moveTo(-19, 0);
    c.lineTo(9, 0);
    c.stroke();
    c.fillStyle = "#eef2d9";
    c.beginPath();
    c.moveTo(15, 0);
    c.lineTo(5, -5);
    c.lineTo(5, 5);
    c.fill();
    c.strokeStyle = "#8cab6a";
    for (const sign of [-1, 1]) {
      c.beginPath();
      c.moveTo(-13, 0);
      c.lineTo(-20, sign * 5);
      c.stroke();
    }
  } else if (
    id === "mage" &&
    !["fireball", "fireblast", "pyroblast"].includes(shot.spellId || "")
  ) {
    c.beginPath();
    c.moveTo(13, 0);
    c.lineTo(-2, -7);
    c.lineTo(-11, 0);
    c.lineTo(-2, 7);
    c.closePath();
    c.fill();
    c.strokeStyle = "#ecfaff";
    c.beginPath();
    c.moveTo(-18, -4);
    c.lineTo(-26, -4);
    c.moveTo(-13, 5);
    c.lineTo(-24, 5);
    c.stroke();
  } else if (id === "mage") {
    c.fillStyle = "#e97732";
    c.beginPath();
    c.moveTo(-26, -6);
    c.quadraticCurveTo(17, -17, 14, 0);
    c.quadraticCurveTo(10, 14, -25, 5);
    c.lineTo(-9, 0);
    c.fill();
    c.fillStyle = "#ffe6a1";
    c.beginPath();
    c.arc(5, 0, 5, 0, TAU);
    c.fill();
  } else if (id === "warlock") {
    c.fillStyle = "#8265b0";
    c.beginPath();
    c.ellipse(-8, 0, 16, 7, 0, 0, TAU);
    c.fill();
    c.fillStyle = "#aee66c";
    c.beginPath();
    c.arc(5, 0, 8, 0, TAU);
    c.fill();
    c.fillStyle = "#2b2840";
    c.fillRect(6, -5, 3, 3);
    c.fillRect(6, 2, 3, 3);
  } else if (id === "priest") {
    c.strokeStyle = "#fff3bb";
    c.beginPath();
    c.moveTo(-24, 0);
    c.lineTo(8, 0);
    c.stroke();
    star(c, 5, 0, 11, 4);
  } else if (id === "shaman") {
    c.beginPath();
    c.moveTo(-28, 0);
    c.lineTo(-12, -5);
    c.lineTo(-17, 5);
    c.lineTo(0, -5);
    c.lineTo(-4, 4);
    c.lineTo(15, 0);
    c.stroke();
  } else if (id === "druid") {
    c.beginPath();
    c.ellipse(3, 0, 11, 5, -0.3, 0, TAU);
    c.fill();
    c.strokeStyle = "#e4f2b8";
    c.beginPath();
    c.moveTo(-8, 2);
    c.lineTo(12, -3);
    c.stroke();
  } else if (id === "paladin") {
    c.fillStyle = "#f6d590";
    c.fillRect(-8, -3, 19, 6);
    c.fillStyle = "#fff1c7";
    c.fillRect(4, -11, 8, 22);
  } else {
    c.fillStyle = "#d9e1f2";
    c.beginPath();
    c.moveTo(16, 0);
    c.lineTo(-7, -5);
    c.lineTo(-7, 5);
    c.fill();
    c.fillStyle = "#806f93";
    c.fillRect(-14, -2, 9, 4);
  }
  c.restore();
}
function circle(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.stroke();
}
function star(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  points = 6,
) {
  c.beginPath();
  for (let i = 0; i <= points * 2; i++) {
    const a = (i * Math.PI) / points,
      d = i % 2 ? r * 0.3 : r;
    c.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  c.stroke();
}
function rune(c: CanvasRenderingContext2D, r: number, n: number, rotation = 0) {
  for (let i = 0; i < n; i++) {
    const a = (i * TAU) / n + rotation;
    c.save();
    c.rotate(a);
    c.strokeRect(r - 4, -4, 8, 8);
    c.restore();
  }
}

/** Nine authored silhouettes, trajectories and marks. Effects use simulation time. */
export function drawClassEffect(
  c: CanvasRenderingContext2D,
  fx: Effect,
  motion: boolean,
  particles: boolean,
) {
  if (!fx.classId) return;
  const progress = motion ? 1 - fx.life / fx.maxLife : 0.55,
    r = fx.radius * (0.4 + progress * 0.6),
    id = fx.classId;
  c.save();
  c.translate(fx.x, fx.y - 16);
  c.strokeStyle = COLORS[id];
  c.fillStyle = COLORS[id];
  c.lineWidth = fx.motif === "signature" ? 3 : 2;
  c.globalAlpha = Math.min(0.8, fx.life / fx.maxLife);
  if (particles) {
    c.shadowColor = COLORS[id];
    c.shadowBlur = 8;
  }
  if (fx.motif === "dash") {
    c.rotate(fx.facing || 0);
    if (id === "mage") {
      c.scale(0.48, 1);
      circle(c, 0, 0, r);
      rune(c, r, 6);
    } else if (id === "rogue" || id === "warlock") {
      for (let i = 0; i < 3; i++) {
        c.globalAlpha *= 0.7;
        c.beginPath();
        c.ellipse(-i * 32, -12, 14, 27, 0, 0, TAU);
        c.fill();
      }
    } else if (id === "priest" || id === "paladin") {
      for (let i = 0; i < 3; i++)
        star(c, -i * 25, (i % 2 ? 1 : -1) * 14, 12, 4);
    } else {
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(-r, -16 + i * 16);
        c.quadraticCurveTo(-r * 0.3, -30 + i * 20, r * 0.3, 0);
        c.stroke();
      }
      if (id === "druid")
        for (let i = 0; i < 3; i++) {
          c.beginPath();
          c.ellipse(-i * 25, 22, 7, 4, -0.5, 0, TAU);
          c.fill();
        }
    }
    c.restore();
    return;
  }
  switch (id) {
    case "warrior":
      c.rotate(fx.facing || 0);
      c.lineWidth = fx.motif === "signature" ? 7 : 4;
      c.beginPath();
      c.arc(0, 0, r, -1.25, 1.25);
      c.stroke();
      c.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(r * 0.65, -15 + i * 15);
        c.lineTo(r * 1.05, -30 + i * 30);
        c.stroke();
      }
      break;
    case "mage":
      rune(c, r, 6, progress * 0.25);
      for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6;
        c.save();
        c.rotate(a);
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(r, 0);
        c.moveTo(r * 0.6, -8);
        c.lineTo(r * 0.75, 0);
        c.lineTo(r * 0.6, 8);
        c.stroke();
        c.restore();
      }
      break;
    case "rogue":
      c.rotate(fx.facing || 0);
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(-r * 0.5, -20 + i * 16);
        c.lineTo(r * 0.8, 10 + i * 10);
        c.stroke();
      }
      break;
    case "hunter":
      c.rotate(fx.facing || 0);
      c.beginPath();
      c.moveTo(-r, 0);
      c.lineTo(r, 0);
      c.lineTo(r - 14, -9);
      c.moveTo(r, 0);
      c.lineTo(r - 14, 9);
      c.stroke();
      if (fx.motif === "signature") {
        c.rotate(-(fx.facing || 0));
        circle(c, 0, 0, r * 0.5);
        c.strokeRect(-8, -8, 16, 16);
      }
      break;
    case "paladin":
      c.beginPath();
      c.moveTo(-r * 0.45, -r * 0.2);
      c.lineTo(r * 0.45, -r * 0.2);
      c.moveTo(0, -r * 0.65);
      c.lineTo(0, r * 0.55);
      c.stroke();
      rune(c, r * 0.7, 8);
      break;
    case "priest":
      c.beginPath();
      c.ellipse(0, -r * 0.3, r * 0.55, r * 0.16, 0, 0, TAU);
      c.stroke();
      for (const sign of [-1, 1]) {
        c.beginPath();
        c.moveTo(0, 0);
        c.quadraticCurveTo(sign * r, -r * 0.5, sign * r * 0.85, r * 0.25);
        c.quadraticCurveTo(sign * r * 0.35, 0, 0, r * 0.3);
        c.stroke();
      }
      break;
    case "shaman":
      for (let i = 0; i < 3; i++) {
        c.save();
        c.rotate((i * TAU) / 3);
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(r * 0.4, -10);
        c.lineTo(r * 0.3, 10);
        c.lineTo(r, 0);
        c.stroke();
        c.restore();
      }
      break;
    case "warlock":
      star(c, 0, 0, r, 5);
      circle(c, 0, 0, r * 0.8);
      for (let i = 0; i < 3; i++) {
        const a = (i * TAU) / 3;
        c.beginPath();
        c.arc(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8, 7, 0, TAU);
        c.fill();
      }
      break;
    case "druid":
      for (let i = 0; i < 5; i++) {
        c.save();
        c.rotate((i * TAU) / 5);
        c.beginPath();
        c.ellipse(r * 0.55, 0, r * 0.3, 7, 0.35, 0, TAU);
        c.stroke();
        c.restore();
      }
      c.beginPath();
      c.arc(0, 0, r * 0.35, -1.2, 1.2);
      c.stroke();
      break;
  }
  c.restore();
}

export function drawClassAnchor(
  c: CanvasRenderingContext2D,
  a: ClassAnchor,
  time: number,
  motion: boolean,
) {
  const color = {
    earth: "#bdac7c",
    fire: "#ffa45b",
    storm: "#8cd9ff",
    holy: "#ffe19a",
    sanctuary: "#e3efff",
    trap: "#a6dfff",
    prayer: "#e3efff",
  }[a.kind];
  const trap = a.kind === "trap",
    totem = ["earth", "fire", "storm"].includes(a.kind),
    r = trap ? 90 : 165;
  c.save();
  c.translate(a.x, a.y);
  c.globalAlpha = Math.min(1, (a.until - time) / 0.8);
  c.fillStyle = color + "12";
  c.strokeStyle = color + "77";
  c.lineWidth = 2;
  circle(c, 0, 0, r);
  c.beginPath();
  c.arc(0, 0, r, 0, TAU);
  c.fill();
  if (!totem) {
    c.save();
    c.scale(1, 0.52);
    rune(c, r * 0.65, trap ? 4 : 8);
    c.restore();
  }
  if (totem) {
    c.fillStyle = "#15242d";
    c.fillRect(-11, -42, 22, 42);
    c.fillStyle = color;
    c.fillRect(-15, -37, 30, 8);
    c.fillRect(-9, -20, 18, 5);
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-16, -42);
    c.lineTo(0, -52);
    c.lineTo(16, -42);
    c.stroke();
    if (a.kind === "fire")
      star(c, 0, -58, 8 + (motion ? Math.sin(time * 4) * 2 : 0), 4);
    if (a.kind === "storm") {
      c.beginPath();
      c.moveTo(-5, -57);
      c.lineTo(3, -68);
      c.lineTo(-1, -59);
      c.lineTo(7, -59);
      c.lineTo(0, -48);
      c.stroke();
    }
    if (a.kind === "earth") c.strokeRect(-6, -62, 12, 12);
  } else if (trap) {
    c.strokeRect(-14, -8, 28, 16);
    star(c, 0, 0, 21, 4);
  } else {
    c.lineWidth = 3;
    star(c, 0, 0, 23, a.kind === "holy" ? 4 : 6);
  }
  c.restore();
}

export function drawClassMark(
  c: CanvasRenderingContext2D,
  id: ClassId,
  p: ClassActor,
  target: Vec,
  curse = false,
) {
  c.save();
  c.translate(target.x, target.y - 62);
  c.strokeStyle = COLORS[id];
  c.fillStyle = COLORS[id];
  c.lineWidth = 2;
  if (id === "hunter") {
    circle(c, 0, 0, 13);
    c.beginPath();
    c.moveTo(-19, 0);
    c.lineTo(19, 0);
    c.moveTo(0, -19);
    c.lineTo(0, 19);
    c.stroke();
  } else if (id === "rogue")
    for (let i = 0; i < 5; i++) {
      c.globalAlpha = i < p.kit.points ? 1 : 0.25;
      c.beginPath();
      c.arc(-24 + i * 12, 0, 4, 0, TAU);
      c.fill();
    }
  else if (curse) {
    star(c, 0, 0, 12, 5);
  }
  c.restore();
}

/** Class-specific body choreography layered over the authored sprite poses. */
export function classChoreography(
  c: CanvasRenderingContext2D,
  id: ClassId,
  p: ClassActor,
  time: number,
  enabled: boolean,
) {
  if (!enabled) return;
  const age = time - p.kit.motionAt;
  if (age < 0 || age > 0.55) return;
  const beat = Math.sin((age / 0.55) * Math.PI),
    direction = Math.cos(p.kit.motionFacing) >= 0 ? 1 : -1;
  switch (id) {
    case "warrior":
      c.translate(direction * beat * 8, 0);
      c.rotate(direction * beat * 0.08);
      break;
    case "rogue":
      c.translate(direction * beat * 12, beat * 3);
      c.scale(1 + beat * 0.08, 1 - beat * 0.07);
      break;
    case "hunter":
      c.translate(-direction * beat * 4, 0);
      c.rotate(-direction * beat * 0.035);
      break;
    case "mage":
      c.translate(0, -beat * 5);
      break;
    case "priest":
      c.translate(0, -beat * 3);
      c.scale(1 + beat * 0.025, 1 + beat * 0.025);
      break;
    case "shaman":
      c.translate(direction * beat * 3, -beat * 2);
      c.rotate(direction * beat * 0.045);
      break;
    case "warlock":
      c.scale(1 - beat * 0.03, 1 + beat * 0.04);
      break;
    case "paladin":
      c.translate(0, -beat * 2);
      c.rotate(direction * beat * 0.025);
      break;
    case "druid":
      c.translate(p.kit.form === "cat" ? direction * beat * 9 : 0, -beat * 3);
      break;
  }
}

export function drawCatForm(
  c: CanvasRenderingContext2D,
  p: ClassActor,
  time: number,
  motion: boolean,
) {
  c.save();
  if (Math.cos(p.facing) < 0) c.scale(-1, 1);
  const stride = motion ? Math.sin(time * 12) * 3 : 0;
  c.fillStyle = "#687cac";
  c.beginPath();
  c.ellipse(0, -20, 30, 15, -0.12, 0, TAU);
  c.fill();
  c.beginPath();
  c.ellipse(28, -28, 13, 12, 0, 0, TAU);
  c.fill();
  c.beginPath();
  c.moveTo(19, -35);
  c.lineTo(21, -48);
  c.lineTo(28, -38);
  c.lineTo(34, -45);
  c.lineTo(38, -32);
  c.fill();
  c.strokeStyle = "#687cac";
  c.lineWidth = 7;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(-25, -23);
  c.quadraticCurveTo(-47, -36, -46, -15);
  c.stroke();
  for (const [x, sign] of [
    [-18, 1],
    [18, -1],
  ]) {
    c.beginPath();
    c.moveTo(x, -15);
    c.lineTo(x + stride * sign, 0);
    c.stroke();
  }
  c.fillStyle = "#9effcf";
  c.fillRect(31, -31, 5, 3);
  c.strokeStyle = "#b3bdeb";
  c.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    c.moveTo(-15 + i * 13, -30);
    c.lineTo(-18 + i * 13, -19);
    c.stroke();
  }
  c.restore();
}
