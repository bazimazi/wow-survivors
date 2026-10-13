import { drawSpellTexture } from "./spell-textures";
import { drawEvolvedArea } from "./evolution-visuals";
import { SPELLS } from "./content";
import type { Area, Effect, Projectile, Vec } from "./engine";

export type SpellLook =
  | "frost"
  | "fire"
  | "arcane"
  | "holy"
  | "shadow"
  | "nature"
  | "storm"
  | "steel"
  | "arrow";
const TAU = Math.PI * 2;
// Reuse soft lights instead of rasterizing hundreds of radial gradients per frame.
const glowCache = new Map<string, HTMLCanvasElement>();
const LIGHT: Record<SpellLook, string> = {
  frost: "#e9fbff",
  fire: "#fff0b5",
  arcane: "#f6ddff",
  holy: "#fff8dc",
  shadow: "#e6ceff",
  nature: "#dcffb1",
  storm: "#effcff",
  steel: "#fff0d9",
  arrow: "#edf5c5",
};

/** Authored by spell identity, so learned cross-class spells keep their own look. */
export function spellLook(id: string): SpellLook {
  if (["shot", "multishot", "aimedshot"].includes(id)) return "arrow";
  if (
    [
      "shadowbolt",
      "pain",
      "mindblast",
      "drainlife",
      "curse",
      "fear",
      "agony",
      "shadowform",
      "soul_link",
      "siphonlife",
    ].includes(id)
  )
    return "shadow";
  if (["holystrike", "holyshield", "shieldslam"].includes(id)) return "holy";
  if (["icebarrier", "frostnova"].includes(id)) return "frost";
  if (["magma", "combustion", "conflagrate"].includes(id)) return "fire";
  if (["hurricane", "manatide"].includes(id)) return "storm";
  if (["moonfire", "starfire", "moonkinform"].includes(id)) return "arcane";
  if (["volley", "feralcharge", "bestialwrath", "premeditation"].includes(id))
    return "steel";
  if (["corruption", "poison", "serpentsting"].includes(id)) return "nature";
  if (["thunderclap", "lightning", "chainlightning", "earthshock"].includes(id))
    return "storm";
  const icon = SPELLS[id]?.icon;
  if (icon === "snow") return "frost";
  if (icon === "flame" || icon === "fire" || id === "totem") return "fire";
  if (icon === "sun" || icon === "shield" || icon === "heart") return "holy";
  if (icon === "leaf" || icon === "drop" || icon === "paw" || icon === "moon")
    return "nature";
  if (icon === "skull") return "shadow";
  if (icon === "lightning") return "storm";
  if (icon === "sword" || icon === "dagger" || icon === "whirl") return "steel";
  return "arcane";
}

function disk(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  c.beginPath();
  c.arc(x, y, Math.max(0.1, r), 0, TAU);
  c.fill();
}
function ring(c: CanvasRenderingContext2D, r: number) {
  c.beginPath();
  c.arc(0, 0, Math.max(0.1, r), 0, TAU);
  c.stroke();
}
export function glow(
  c: CanvasRenderingContext2D,
  r: number,
  color: string,
  alpha: number,
) {
  let sprite = glowCache.get(color);
  if (!sprite) {
    if (glowCache.size >= 32) {
      const key = glowCache.keys().next().value!;
      const old = glowCache.get(key)!;
      old.width = old.height = 0;
      glowCache.delete(key);
    }
    sprite = document.createElement("canvas");
    sprite.width = sprite.height = 64;
    const ctx = sprite.getContext("2d")!;
    const light = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    light.addColorStop(0, color);
    light.addColorStop(1, color + "00");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, 64, 64);
    glowCache.set(color, sprite);
  }
  c.save();
  c.globalAlpha *= alpha;
  c.drawImage(sprite, -r, -r, r * 2, r * 2);
  c.restore();
}
function shard(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  angle: number,
) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.beginPath();
  c.moveTo(size, 0);
  c.lineTo(0, -size * 0.32);
  c.lineTo(-size, 0);
  c.lineTo(0, size * 0.32);
  c.closePath();
  c.fill();
  c.restore();
}
function sigil(
  c: CanvasRenderingContext2D,
  r: number,
  time: number,
  points = 8,
) {
  ring(c, r);
  ring(c, r * 0.87);
  for (let i = 0; i < points; i++) {
    c.save();
    c.rotate((i * TAU) / points + time);
    c.beginPath();
    c.moveTo(r * 0.67, -4);
    c.lineTo(r * 0.77, 0);
    c.lineTo(r * 0.67, 4);
    c.stroke();
    c.restore();
  }
}

/** Stateless trails use simulation time; pausing freezes every strand. */
export function drawSpellProjectile(
  c: CanvasRenderingContext2D,
  shot: Projectile,
  time: number,
  motion: boolean,
  particles: boolean,
) {
  const evolved = (shot.spellRank || 1) >= 5;
  const look =
      evolved && shot.spellId === "wrath" ? "arcane" : spellLook(shot.spellId!),
    color = evolved && shot.spellId === "shadowbolt" ? "#8cef54" : shot.color,
    t = motion ? time : 0;
  const magical = !["steel", "arrow"].includes(look);
  c.save();
  c.translate(shot.x, shot.y);
  c.rotate(Math.atan2(shot.vy, shot.vx));
  c.lineCap = "round";
  const scale = 1 + Math.max(0, (shot.spellRank || 1) - 1) * 0.055;
  c.scale(scale, scale);
  if (evolved) {
    c.fillStyle = color;
    c.strokeStyle = LIGHT[look];
    c.lineWidth = 1.5;
    if (shot.spellId === "imp") {
      c.fillStyle = "#455840";
      c.strokeStyle = "#ccff8b";
      c.beginPath();
      c.moveTo(17, 0);
      c.lineTo(9, -13);
      c.lineTo(-9, -15);
      c.lineTo(-17, -3);
      c.lineTo(-10, 13);
      c.lineTo(8, 14);
      c.closePath();
      c.fill();
      c.stroke();
      c.strokeStyle = "#c9ff73";
      c.beginPath();
      c.moveTo(-11, -7);
      c.lineTo(3, 0);
      c.lineTo(-5, 10);
      c.stroke();
      c.restore();
      return;
    }
    for (let i = 0; i < 2; i++) {
      const sign = i ? 1 : -1;
      c.beginPath();
      c.moveTo(19, 0);
      c.bezierCurveTo(
        0,
        sign * 22,
        -31,
        sign * (12 + Math.sin(t * 10) * 4),
        -65,
        sign * 5,
      );
      c.stroke();
      shard(c, -28, sign * 13, 8, -sign * 0.3);
    }
    if (look === "frost") {
      shard(c, 3, 0, 40, 0);
      c.fillStyle = LIGHT.frost;
      shard(c, 7, 0, 27, 0);
    } else if (look === "fire") {
      c.fillStyle = "#ff9339";
      disk(c, 0, 0, 18);
      c.fillStyle = "#fff3b3";
      disk(c, 4, 0, 11);
    } else if (look === "shadow" || look === "arcane") {
      c.save();
      c.rotate(t * 3);
      sigil(c, 23, 0, look === "shadow" ? 5 : 8);
      c.restore();
    } else if (look === "holy") {
      shard(c, 0, 0, 27, Math.PI / 2);
      shard(c, 0, 0, 24, 0);
    } else if (look === "steel" || look === "arrow") {
      shard(c, -6, -9, 20, -0.15);
      shard(c, -6, 9, 20, 0.15);
    } else {
      c.save();
      c.scale(1, 0.6);
      ring(c, 27);
      c.restore();
    }
  }
  if (particles && magical) glow(c, 24 + shot.radius, color, 0.35);
  if (particles) {
    for (let i = 5; i >= 1; i--) {
      c.globalAlpha = (1 - i / 6) * 0.5;
      c.fillStyle = color;
      const wave = magical ? Math.sin(t * 18 - i * 1.4) * i * 0.9 : 0;
      shard(
        c,
        -i * 9,
        wave,
        Math.max(2, shot.radius * (1 - i / 7)),
        wave * 0.04,
      );
    }
  }
  c.globalAlpha = 1;
  if (particles && magical) {
    // A continuous tapered wake follows the velocity, rather than detached geometric dots.
    for (let pass = 0; pass < 2; pass++) {
      c.globalAlpha = pass ? 0.62 : 0.17;
      c.strokeStyle = pass ? LIGHT[look] : color;
      c.lineWidth = pass ? 1.6 : evolved ? 10 : 7;
      c.beginPath();
      c.moveTo(evolved ? -78 : -52, 0);
      c.bezierCurveTo(
        -38,
        Math.sin(t * 12) * 6,
        -16,
        Math.sin(t * 12 + 1) * -4,
        5,
        0,
      );
      c.stroke();
    }
  }
  c.globalAlpha = 1;
  c.fillStyle = color;
  c.strokeStyle = LIGHT[look];
  c.lineWidth = 1.5;
  c.save();
  c.scale(1.35, 0.8);
  const painted =
    particles &&
    drawSpellTexture(
      c,
      look,
      0.27 + Math.sin(t * 11) * 0.045,
      evolved ? 25 : 16,
      0.9,
    );
  c.restore();
  if (painted) {
    if (look === "frost") {
      c.fillStyle = LIGHT.frost;
      shard(c, 12, 0, evolved ? 13 : 8, 0);
    }
  } else if (look === "frost") {
    shard(c, 0, 0, 18 + shot.radius, 0);
    c.beginPath();
    c.moveTo(-17, 0);
    c.lineTo(18, 0);
    c.stroke();
    shard(c, -11, -8, 7, -0.35);
    shard(c, -13, 8, 6, 0.35);
  } else if (look === "fire") {
    for (let i = 3; i >= 0; i--) {
      c.fillStyle = [LIGHT.fire, "#ffd05f", "#ff922f", "#d95223"][i];
      c.beginPath();
      c.moveTo(12 - i * 4, 0);
      c.quadraticCurveTo(
        -8 - i * 5,
        -8 - i * 2,
        -23 - i * 6,
        Math.sin(t * 22 + i) * 5,
      );
      c.quadraticCurveTo(-7 - i * 5, 10 + i * 2, 12 - i * 4, 0);
      c.fill();
    }
    c.fillStyle = LIGHT.fire;
    disk(c, 4, 0, shot.radius);
  } else if (look === "storm") {
    c.strokeStyle = color;
    c.lineWidth = 4;
    for (let pass = 0; pass < 2; pass++) {
      c.beginPath();
      c.moveTo(-34, 0);
      for (let i = 1; i <= 6; i++)
        c.lineTo(-34 + i * 8, i === 6 ? 0 : Math.sin(i * 12 + t * 25) * 8);
      c.stroke();
      c.strokeStyle = LIGHT.storm;
      c.lineWidth = 1.5;
    }
  } else if (look === "arrow" || look === "steel") {
    c.strokeStyle = "#c7af83";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-25, 0);
    c.lineTo(9, 0);
    c.stroke();
    c.fillStyle = LIGHT[look];
    shard(c, 10, 0, 9, 0);
    c.strokeStyle = color;
    c.beginPath();
    c.moveTo(-18, -5);
    c.lineTo(-12, 0);
    c.lineTo(-18, 5);
    c.stroke();
  } else if (look === "nature") {
    c.beginPath();
    c.ellipse(0, 0, 13, 7, -0.25, 0, TAU);
    c.fill();
    c.beginPath();
    c.moveTo(-18, 2);
    c.quadraticCurveTo(0, -1, 13, -4);
    c.stroke();
    if (particles) {
      shard(c, -18, -8, 5, t);
      shard(c, -26, 7, 4, -t);
    }
  } else {
    if (["hammer", "hammerwrath"].includes(shot.spellId!)) {
      c.rotate(t * 9);
      c.fillStyle = "#e9bd61";
      c.fillRect(-3, -4, 6, 24);
      c.fillStyle = LIGHT.holy;
      c.fillRect(-13, -11, 26, 12);
      c.strokeStyle = color;
      c.strokeRect(-13, -11, 26, 12);
      c.restore();
      return;
    }
    if (look === "shadow") {
      c.fillStyle = "#463361";
      disk(c, -4, 0, 13);
      c.fillStyle = color;
    }
    disk(c, 2, 0, shot.radius + 3);
    c.save();
    c.scale(1, 0.55);
    c.rotate(t * 5);
    ring(c, 16);
    c.restore();
    c.fillStyle = LIGHT[look];
    shard(c, 4, 0, look === "holy" ? 12 : 7, Math.PI / 2);
  }
  c.restore();
}

/** Release, expanding wave, then dissipating fragments; no gameplay timing changes. */
export function drawSpellEffect(
  c: CanvasRenderingContext2D,
  fx: Effect,
  motion: boolean,
  particles: boolean,
  detailed = true,
) {
  const look = spellLook(fx.spellId!),
    def = SPELLS[fx.spellId!];
  const age = Math.max(0, Math.min(1, 1 - fx.life / fx.maxLife));
  const p = motion ? age : 0.45,
    fade = Math.min(1, (1 - age) * 2.2);
  const color = fx.color,
    light = LIGHT[look];
  c.save();
  c.translate(fx.x, fx.y);
  c.lineCap = "round";
  c.globalAlpha = fade;
  c.fillStyle = color;
  c.strokeStyle = color;
  c.lineWidth = 2;
  if (fx.kind === "line" && fx.end) {
    const dx = fx.end.x - fx.x,
      dy = fx.end.y - fx.y,
      length = Math.hypot(dx, dy);
    c.rotate(Math.atan2(dy, dx));
    for (let pass = 0; pass < 2; pass++) {
      c.lineWidth = pass
        ? (fx.spellRank || 1) >= 5
          ? 3
          : 1.5
        : (fx.spellRank || 1) >= 5
          ? 13
          : 7;
      c.strokeStyle = pass ? light : color;
      c.globalAlpha = fade * (pass ? 1 : 0.4);
      c.beginPath();
      c.moveTo(0, 0);
      for (let i = 1; i < 9; i++)
        c.lineTo(
          (length * i) / 9,
          look === "storm"
            ? Math.sin(i * 17 + p * 15) * 13
            : Math.sin((i * Math.PI) / 9) * -12,
        );
      c.lineTo(length, 0);
      c.stroke();
    }
    if ((fx.spellRank || 1) >= 5) {
      c.globalAlpha = fade * 0.75;
      c.strokeStyle = light;
      c.lineWidth = 1.5;
      for (let j = 0; j < 2; j++) {
        c.beginPath();
        for (let i = 0; i <= 12; i++) {
          const x = (length * i) / 12,
            y = Math.sin(i * 0.8 + p * 9 + j * Math.PI) * 14;
          i ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.stroke();
      }
    }
    c.translate(length, 0);
    c.globalAlpha = fade;
    if (particles) glow(c, 24, color, 0.5);
    c.fillStyle = light;
    shard(c, 0, 0, 12 * (1 - p * 0.6), Math.PI / 2);
    c.restore();
    return;
  }
  const impact = fx.kind === "burst",
    cast = fx.motif === "cast";
  const radius = Math.max(8, fx.radius),
    r = radius * (0.2 + (1 - (1 - p) ** 3) * 0.8);
  if (particles)
    glow(c, impact ? r * 1.3 : Math.min(r, 90), color, (1 - p) * 0.4);
  const painted =
    detailed &&
    !cast &&
    fx.classId !== "druid" &&
    drawSpellTexture(c, look, p, radius, fade * (impact ? 0.88 : 0.6));
  if (painted) {
    // A restrained wave anchors the painted volume to its damage footprint.
    if (!impact) {
      c.globalAlpha = fade * 0.23;
      c.strokeStyle = light;
      c.lineWidth = 1.5;
      ring(c, r);
    }
  } else if (
    look === "steel" ||
    fx.classId === "druid" ||
    (def?.kind === "melee" && look !== "storm")
  ) {
    c.rotate(fx.facing || 0);
    const sweep = p * 1.9;
    for (let i = 0; i < 3; i++) {
      c.globalAlpha = fade * (1 - i * 0.27);
      c.strokeStyle = i ? color : light;
      c.lineWidth = Math.max(1, (impact ? 3 : 8) - i * 2);
      c.beginPath();
      c.arc(
        0,
        0,
        r * (1 - i * 0.09),
        -1.7 + sweep - i * 0.17,
        -0.15 + sweep - i * 0.17,
      );
      c.stroke();
    }
  } else if (look === "frost") {
    c.globalAlpha = fade * 0.7;
    ring(c, r);
    c.strokeStyle = light;
    c.lineWidth = 1;
    for (let i = 0; i < (impact || cast ? 6 : 12); i++) {
      const a = (i * TAU) / (impact || cast ? 6 : 12);
      c.save();
      c.rotate(a);
      c.beginPath();
      c.moveTo(r * 0.65, 0);
      c.lineTo(r, 0);
      c.moveTo(r * 0.78, -6);
      c.lineTo(r * 0.89, 0);
      c.lineTo(r * 0.78, 6);
      c.stroke();
      c.fillStyle = light;
      shard(c, r, 0, 5 + (1 - p) * 8, 0);
      c.restore();
    }
  } else if (look === "storm") {
    c.globalAlpha = fade * 0.65;
    ring(c, r);
    for (let i = 0; i < (impact ? 4 : 8); i++) {
      c.save();
      c.rotate((i * TAU) / (impact ? 4 : 8));
      c.strokeStyle = i % 2 ? light : color;
      c.lineWidth = i % 2 ? 1.5 : 3;
      c.beginPath();
      c.moveTo(r * 0.2, 0);
      c.lineTo(r * 0.5, -8);
      c.lineTo(r * 0.4, 7);
      c.lineTo(r, 0);
      c.stroke();
      c.restore();
    }
  } else if (look === "holy") {
    c.globalAlpha = fade * 0.55;
    ring(c, r);
    c.strokeStyle = light;
    ring(c, r * 0.88);
    if (!cast && !impact) {
      c.save();
      c.scale(1, 0.6);
      sigil(c, r * 0.7, 0, 8);
      c.restore();
    }
    c.fillStyle = light;
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6;
      shard(
        c,
        Math.cos(a) * r * 0.7,
        Math.sin(a) * r * 0.7 - p * 15,
        5,
        Math.PI / 2,
      );
    }
  } else if (look === "fire") {
    c.strokeStyle = "#ffb64e";
    c.lineWidth = 4;
    c.globalAlpha = fade * 0.65;
    ring(c, r);
    if (particles)
      for (let i = 0; i < 10; i++) {
        const a = (i * TAU) / 10;
        c.fillStyle = i % 2 ? light : color;
        shard(c, Math.cos(a) * r, Math.sin(a) * r - p * 16, 4 + (1 - p) * 9, a);
      }
  } else {
    c.save();
    c.scale(1, impact || cast ? 1 : 0.7);
    c.globalAlpha = fade * 0.65;
    if (impact) {
      c.lineWidth = 1.5;
      ring(c, r * 0.55);
      shard(c, 0, 0, 8 * (1 - p), Math.PI / 2);
    } else sigil(c, r, motion ? p * 0.4 : 0, look === "shadow" ? 5 : 8);
    c.restore();
  }
  if ((fx.spellRank || 1) >= 5) {
    c.globalAlpha = fade * 0.8;
    c.strokeStyle = light;
    c.fillStyle = light;
    c.lineWidth = 2;
    if (impact) {
      c.globalAlpha = fade * (1 - p) * 0.75;
      for (let i = 0; i < 4; i++) {
        const a = (i * TAU) / 4 + (fx.facing || 0);
        shard(c, Math.cos(a) * r * 0.65, Math.sin(a) * r * 0.65, 5, a);
      }
    } else if (fx.spellId === "whirlwind") {
      for (let i = 0; i < 6; i++) {
        c.save();
        c.rotate((i * TAU) / 6 + p * 6);
        c.beginPath();
        c.arc(0, 0, r * 0.8, -0.8, 0.15);
        c.stroke();
        shard(c, r * 0.8, 0, 18, Math.PI / 2);
        c.restore();
      }
    } else if (look === "holy") {
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8 + p * 0.4;
        shard(
          c,
          Math.cos(a) * r * 0.5,
          Math.sin(a) * r * 0.5,
          Math.min(24, r * 0.3),
          a,
        );
      }
      ring(c, r * 0.92);
    } else if (look === "storm") {
      for (let i = 0; i < 6; i++) {
        c.save();
        c.rotate((i * TAU) / 6 + p * 0.8);
        c.beginPath();
        c.moveTo(r * 0.25, -35);
        c.lineTo(r * 0.4, -20);
        c.lineTo(r * 0.3, -18);
        c.lineTo(r * 0.65, 0);
        c.stroke();
        c.restore();
      }
    } else if (look === "arcane" || look === "shadow") {
      c.save();
      c.rotate(p * 2);
      c.scale(1, 0.4);
      ring(c, r);
      c.rotate(1.4);
      ring(c, r);
      c.restore();
      sigil(c, r * 0.62, -p, 8);
    } else if (look === "frost") {
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8;
        shard(
          c,
          Math.cos(a) * r * 0.65,
          Math.sin(a) * r * 0.65,
          Math.min(26, r * 0.25),
          a,
        );
      }
    } else {
      ring(c, r * 0.9);
      c.save();
      c.rotate(-p * 2);
      sigil(c, r * 0.65, 0, 6);
      c.restore();
    }
  }
  if (particles && look !== "fire") {
    for (let i = 0; i < (impact ? 6 : 10); i++) {
      const a = i * 2.39996 + (fx.facing || 0),
        d = r * (0.7 + (i % 3) * 0.13);
      c.globalAlpha = fade * (1 - p) * 0.8;
      c.fillStyle = i % 3 ? color : light;
      shard(c, Math.cos(a) * d, Math.sin(a) * d - p * 12, 2 + (1 - p) * 3, a);
    }
  }
  c.restore();
}

/** Ground damage keeps its actual gameplay radius legible beneath the spectacle. */
export function drawSpellArea(
  c: CanvasRenderingContext2D,
  area: Area,
  time: number,
  motion: boolean,
  particles: boolean,
) {
  if (drawEvolvedArea(c, area, time, motion, particles)) return;
  const look = spellLook(area.spellId || ""),
    t = motion ? time : 0;
  const fade = Math.min(
    1,
    area.life / 0.5,
    (area.maxLife - area.life) / 0.2 + 0.15,
  );
  c.save();
  c.translate(area.x, area.y);
  c.globalAlpha = fade * 0.13;
  c.fillStyle = area.color;
  disk(c, 0, 0, area.radius);
  c.globalAlpha = fade * 0.5;
  c.strokeStyle = area.color;
  c.lineWidth = 1.5;
  ring(c, area.radius);
  if (look === "holy" || look === "arcane" || look === "shadow") {
    c.globalAlpha = fade * 0.32;
    sigil(c, area.radius * 0.82, t * 0.15, look === "shadow" ? 5 : 8);
  } else {
    c.globalAlpha = fade * 0.28;
    for (let i = 0; i < 3; i++) {
      const phase = (t * 0.45 + i / 3) % 1;
      c.globalAlpha = fade * (1 - phase) * 0.3;
      ring(c, area.radius * (0.2 + phase * 0.8));
    }
  }
  c.globalAlpha = fade * 0.4;
  c.strokeStyle = LIGHT[look];
  c.lineWidth = 1;
  for (let i = 0; i < 4 + Math.min(3, (area.spellRank || 1) - 1); i++) {
    const a = i * 2.39996 + t * 0.1,
      d = area.radius * 0.55;
    const x = Math.cos(a) * d,
      y = Math.sin(a) * d;
    if (look === "frost") {
      c.fillStyle = area.color;
      shard(c, x, y, 9, 1.3);
    } else if (look === "fire") {
      c.beginPath();
      c.moveTo(x - 8, y);
      c.quadraticCurveTo(x - 3, y - 22 - Math.sin(t * 5 + i) * 5, x + 4, y);
      c.stroke();
    } else if (look === "storm") {
      c.beginPath();
      c.ellipse(x, y, 20, 6, t * 0.5, 0, Math.PI * 1.4);
      c.stroke();
    } else {
      c.beginPath();
      c.arc(x, y, 5, 0, TAU);
      c.stroke();
    }
  }
  if (particles)
    for (let i = 0; i < 14; i++) {
      const a = i * 2.39996,
        d = area.radius * Math.sqrt((i + 0.5) / 14);
      const phase = (t * (look === "frost" ? 1.6 : 0.6) + i * 0.37) % 1;
      const x = Math.cos(a) * d,
        y = Math.sin(a) * d;
      c.globalAlpha = fade * Math.sin(phase * Math.PI) * 0.75;
      c.fillStyle = i % 3 ? area.color : LIGHT[look];
      if (area.spellId === "volley") {
        c.strokeStyle = "#d9c69b";
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(x - 9 * (1 - phase), y - 50 * (1 - phase));
        c.lineTo(x, y);
        c.stroke();
        shard(c, x, y - 50 * (1 - phase), 6, 1.35);
      } else if (area.spellId === "moonfire") {
        c.fillStyle = "#e4e5ff";
        shard(c, x, y - (1 - phase) * 70, 8, Math.PI / 2);
        c.strokeStyle = area.color;
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(x, y - (1 - phase) * 70 - 18);
        c.lineTo(x, y - (1 - phase) * 70);
        c.stroke();
      } else if (look === "frost") {
        c.strokeStyle = LIGHT.frost;
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(x - 12 * (1 - phase), y - 60 * (1 - phase));
        c.lineTo(x, y);
        c.stroke();
        shard(c, x, y - 60 * (1 - phase), 7, 1.3);
      } else if (look === "fire") {
        shard(
          c,
          x + Math.sin(t * 4 + i) * 4,
          y - phase * 38,
          6 + (1 - phase) * 5,
          -Math.PI / 2,
        );
      } else if (look === "storm") {
        c.strokeStyle = LIGHT.storm;
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(x, y - 28 * phase);
        c.lineTo(x + 5, y - 16 * phase);
        c.lineTo(x - 3, y - 11 * phase);
        c.lineTo(x, y);
        c.stroke();
      } else if (look === "holy") {
        c.fillRect(x, y - phase * 45, 2, 16 + phase * 18);
      } else if (look === "nature") {
        c.strokeStyle = area.color;
        c.lineWidth = 1;
        c.beginPath();
        c.arc(x, y - phase * 15, 3 + phase * 4, 0, TAU);
        c.stroke();
      } else shard(c, x + Math.sin(t + i) * 8, y - phase * 24, 4, t + i);
    }
  c.restore();
}

export function drawSpellOrbit(
  c: CanvasRenderingContext2D,
  id: string,
  pos: Vec,
  center: Vec,
  time: number,
  motion: boolean,
  particles: boolean,
  rank = 1,
) {
  const color = SPELLS[id].color,
    angle = Math.atan2(pos.y - center.y, pos.x - center.x);
  c.save();
  c.translate(center.x, center.y);
  c.strokeStyle = color;
  if (particles) {
    const r = Math.hypot(pos.x - center.x, pos.y - center.y);
    for (let i = 0; i < 3; i++) {
      c.globalAlpha = 0.35 - i * 0.09;
      c.lineWidth = 3 - i * 0.7;
      c.beginPath();
      c.arc(0, 0, r, angle - 0.6 - i * 0.12, angle - i * 0.12);
      c.stroke();
    }
  }
  c.globalAlpha = 1;
  c.translate(pos.x - center.x, pos.y - center.y);
  c.rotate(motion ? time * 6 : angle);
  if (rank >= 5) {
    c.scale(1.35, 1.35);
    c.strokeStyle = "#fff1c1";
    c.lineWidth = 1.5;
    if (id === "thorns") {
      c.fillStyle = "#775238";
      c.fillRect(-4, -3, 8, 19);
      c.fillStyle = "#87be78";
      shard(c, 0, -9, 19, Math.PI / 2);
      shard(c, -9, -3, 12, -0.7);
      shard(c, 9, -3, 12, 0.7);
      c.fillStyle = "#ecffd2";
      disk(c, -4, -6, 2);
      disk(c, 4, -6, 2);
      c.restore();
      return;
    }
    shard(c, -10, 0, 17, Math.PI / 2);
    shard(c, 10, 0, 17, Math.PI / 2);
  }
  if (id === "thorns") {
    c.fillStyle = color;
    shard(c, 0, 0, 14, 0);
    shard(c, -4, -6, 9, -0.7);
    shard(c, -4, 6, 9, 0.7);
    c.strokeStyle = "#dcffb1";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(-12, 0);
    c.lineTo(14, 0);
    c.stroke();
    c.restore();
    return;
  }
  c.fillStyle = color;
  shard(c, 0, 0, 17, Math.PI / 2);
  c.fillStyle = "#fff4d3";
  shard(c, 0, 0, 12, Math.PI / 2);
  c.fillStyle = "#ad8753";
  c.fillRect(-7, 6, 14, 3);
  c.restore();
}
