import { drawSpellTexture } from "./spell-textures";
import type { Vec, Area } from "./engine";
import { glow, spellLook } from "./spell-visuals";

const TAU = Math.PI * 2;
const hash = (x: number, y: number) => {
  let n = Math.imul(x ^ 731, 1597334677) ^ Math.imul(y ^ 193, 3812015801);
  return (Math.imul(n ^ (n >>> 16), 2246822507) >>> 0) / 4294967295;
};

/** World-anchored wind and light: camera motion never drags the atmosphere with the HUD. */
export function drawWorldAtmosphere(
  c: CanvasRenderingContext2D,
  center: Vec,
  width: number,
  height: number,
  zone: string,
  time: number,
  motion: boolean,
  particles: boolean,
  dungeon: boolean,
) {
  if (!particles) return;
  const t = motion ? time : 0,
    night = ["tirisfal", "duskwood", "shadowfang"].includes(zone),
    fire = zone === "ragefire";
  const color = fire
    ? "#e58c48"
    : night
      ? "#7ca0b1"
      : zone === "westfall"
        ? "#e1c884"
        : "#d2d3a1";
  c.save();
  const left = Math.floor((center.x - width / 2 - 180) / 280),
    top = Math.floor((center.y - height / 2 - 180) / 280);
  for (let row = top; row < top + Math.ceil(height / 280) + 3; row++)
    for (
      let column = left;
      column < left + Math.ceil(width / 280) + 3;
      column++
    ) {
      const seed = hash(column, row);
      if (seed < 0.38) continue;
      const x = column * 280 + seed * 180,
        y = row * 280 + hash(row, column) * 200;
      c.save();
      c.translate(x + Math.sin(t * 0.15 + seed * TAU) * 18, y);
      c.scale(1.6, 0.48);
      glow(
        c,
        night ? 130 : 90,
        color,
        (night ? 0.08 : 0.045) * (dungeon ? 0.5 : 1),
      );
      c.restore();
      if (motion && !dungeon) {
        const phase = (t * 0.065 + seed) % 1,
          dx = (phase - 0.5) * 130,
          dy = Math.sin(phase * TAU) * 15;
        c.save();
        c.translate(x + dx, y + dy - 20);
        c.rotate(Math.sin(t * 0.9 + seed) * 0.6);
        c.globalAlpha = Math.sin(phase * Math.PI) * 0.24;
        c.fillStyle = color;
        if (night) {
          c.beginPath();
          c.arc(0, 0, 1.5, 0, TAU);
          c.fill();
        } else {
          c.beginPath();
          c.ellipse(0, 0, 3, 1.2, 0, 0, TAU);
          c.fill();
        }
        c.restore();
      }
    }
  c.restore();
}

export function drawCampfireLife(
  c: CanvasRenderingContext2D,
  time: number,
  motion: boolean,
  particles: boolean,
) {
  if (!motion) return;
  c.save();
  c.translate(0, 96);
  if (particles) {
    c.save();
    c.scale(1, 0.5);
    glow(c, 80 + Math.sin(time * 7) * 3, "#ffb75d", 0.13);
    c.restore();
  }
  for (let i = 0; i < 5; i++) {
    const phase = (time * (0.45 + i * 0.03) + i * 0.23) % 1;
    c.globalAlpha = Math.sin(phase * Math.PI) * (particles ? 0.16 : 0.09);
    c.fillStyle = "#b5b8a2";
    c.beginPath();
    c.ellipse(
      Math.sin(time + i) * 5 + phase * 8,
      -12 - phase * 72,
      3 + phase * 15,
      4 + phase * 11,
      -0.4,
      0,
      TAU,
    );
    c.fill();
    if (particles) {
      c.fillStyle = "#ffe0a0";
      c.globalAlpha = (1 - phase) * 0.65;
      c.fillRect(Math.sin(i * 2.4 + time) * 11, -phase * 57 - 11, 1.5, 2.5);
    }
  }
  c.restore();
}

/** Atmospheric volumes stay inside the damage footprint; glyphs and hazard edges remain visible. */
export function drawAreaAtmosphere(
  c: CanvasRenderingContext2D,
  area: Area,
  time: number,
  motion: boolean,
  particles: boolean,
) {
  if (!particles) return;
  const look = spellLook(area.spellId || ""),
    t = motion ? time : 0,
    r = area.radius;
  const opacity = Math.min(
    1,
    area.life / 0.5,
    (area.maxLife - area.life) / 0.3 + 0.15,
  );
  c.save();
  c.translate(area.x, area.y);
  c.beginPath();
  c.arc(0, 0, r, 0, TAU);
  c.clip();
  for (let i = 0; i < 5; i++) {
    const a = i * 2.39996 + t * 0.08,
      d = r * (0.27 + (i % 3) * 0.16),
      x = Math.cos(a) * d,
      y = Math.sin(a) * d;
    c.save();
    c.translate(x, y);
    c.scale(1.4, 0.65);
    drawSpellTexture(
      c,
      look,
      motion ? (t * 0.65 + i * 0.21) % 1 : 0.5,
      r * 0.28,
      opacity * 0.2,
    );
    glow(
      c,
      r * 0.42,
      look === "frost" ? "#a6dcf0" : area.color,
      opacity * (look === "shadow" ? 0.14 : 0.1),
    );
    c.restore();
  }
  if (["frost", "fire", "holy", "storm"].includes(look))
    for (let i = 0; i < 6; i++) {
      const phase = (t * 0.7 + i * 0.27) % 1,
        a = i * 2.39996,
        x = Math.cos(a) * r * 0.64,
        y = Math.sin(a) * r * 0.64;
      c.globalAlpha = Math.sin(phase * Math.PI) * opacity * 0.17;
      c.strokeStyle =
        look === "holy" ? "#fff0bb" : look === "fire" ? "#ffd199" : "#d9f7ff";
      c.lineWidth = look === "fire" ? 5 : 2;
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(
        x + Math.sin(t * 3 + i) * 7,
        y - phase * 20,
        x + Math.sin(i) * 5,
        y - 28 - phase * 24,
      );
      c.stroke();
    }
  c.restore();
}

/** Five overlapping strips move the leafy crown while keeping the tree's base planted. */
export function drawWindProp(
  c: CanvasRenderingContext2D,
  image: HTMLImageElement,
  crop: { x: number; y: number; width: number; height: number },
  size: number,
  time: number,
  phase: number,
) {
  c.save();
  c.imageSmoothingEnabled = true;
  for (let i = 0; i < 5; i++) {
    const top = i / 5,
      weight = (1 - top) ** 2;
    const sway = Math.sin(time * 1.35 + phase + i * 0.17) * 2.4 * weight;
    c.drawImage(
      image,
      crop.x,
      crop.y + crop.height * top,
      crop.width,
      crop.height / 5,
      -size / 2 + sway,
      -size * 0.95 + size * top,
      size,
      size / 5 + 0.65,
    );
  }
  c.restore();
}

/** Airborne spell elements cross the actors; ground glyphs stay beneath their feet. */
export function drawAreaRain(
  c: CanvasRenderingContext2D,
  area: Area,
  time: number,
  motion: boolean,
  particles: boolean,
) {
  if (!particles) return;
  const look = spellLook(area.spellId || "");
  if (
    !["frost", "fire", "arcane", "holy", "storm"].includes(look) &&
    area.spellId !== "volley"
  )
    return;
  const evolved = (area.spellRank || 1) >= 5;
  const count = evolved ? 9 : 5,
    t = motion ? time : 0;
  const opacity = Math.min(
    1,
    area.life / 0.5,
    (area.maxLife - area.life) / 0.25 + 0.15,
  );
  const falling = ["blizzard", "flamestrike", "moonfire", "volley"].includes(
    area.spellId || "",
  );
  c.save();
  c.translate(area.x, area.y);
  c.lineCap = "round";
  for (let i = 0; i < count; i++) {
    const a = i * 2.39996,
      d = area.radius * Math.sqrt((i + 0.5) / count) * 0.8;
    const phase = motion
      ? (t * (look === "frost" ? 1.65 : 1.1) + i * 0.37) % 1
      : 0.55;
    const height = (evolved ? 112 : 72) * (falling ? 1 - phase : phase);
    c.save();
    c.translate(Math.cos(a) * d, Math.sin(a) * d);
    c.globalAlpha = Math.sin(phase * Math.PI) * opacity * 0.7;
    c.strokeStyle =
      look === "holy" ? "#fff1be" : look === "frost" ? "#d5f5ff" : area.color;
    c.lineWidth = evolved ? 2 : 1;
    if (look === "holy") {
      c.save();
      c.translate(0, -height * 0.5);
      c.scale(0.22, 1);
      glow(c, 50, "#ffe1a1", 0.32);
      c.restore();
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(0, -height);
      c.stroke();
    } else if (look === "storm") {
      c.beginPath();
      c.moveTo(0, -height);
      c.lineTo(-5, -height * 0.65);
      c.lineTo(4, -height * 0.55);
      c.lineTo(0, 0);
      c.stroke();
    } else {
      const dx = falling ? (1 - phase) * 19 : Math.sin(t * 3 + i) * 5;
      c.beginPath();
      c.moveTo(dx + (falling ? 7 : -2), -height - 14);
      c.quadraticCurveTo(dx, -height - 6, dx, -height);
      c.stroke();
      c.translate(dx, -height);
      if (
        !drawSpellTexture(c, look, 0.24 + phase * 0.06, evolved ? 12 : 8, 0.7)
      ) {
        c.fillStyle = area.color;
        c.beginPath();
        c.ellipse(0, 0, 2.5, 5, 0, 0, TAU);
        c.fill();
      }
    }
    c.restore();
  }
  c.restore();
}
