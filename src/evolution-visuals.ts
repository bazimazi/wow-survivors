import { drawSpellTexture } from "./spell-textures";
import type { Area, Pet, Vec } from "./engine";

const TAU = Math.PI * 2;
type C = CanvasRenderingContext2D;
const lightCache = new Map<string, HTMLCanvasElement>();
function light(
  c: C,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number,
) {
  let image = lightCache.get(color);
  if (!image) {
    image = document.createElement("canvas");
    image.width = image.height = 64;
    const ctx = image.getContext("2d")!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.3, `${color}a0`);
    gradient.addColorStop(1, `${color}00`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    if (lightCache.size >= 24) {
      const key = lightCache.keys().next().value!;
      const old = lightCache.get(key)!;
      old.width = old.height = 0;
      lightCache.delete(key);
    }
    lightCache.set(color, image);
  }
  c.save();
  c.globalAlpha *= alpha;
  c.drawImage(image, x - radius, y - radius, radius * 2, radius * 2);
  c.restore();
}

export function drawEvolvedPetAura(
  c: C,
  pet: Pet,
  time: number,
  motion: boolean,
  particles: boolean,
) {
  if (!particles) return;
  const t = motion ? time : 0,
    color =
      pet.spellId === "imp"
        ? "#a3ef63"
        : pet.spellId === "totem"
          ? "#ffb341"
          : "#f4aa62";
  c.save();
  c.translate(pet.x, pet.y);
  light(c, 0, -26, 44, color, 0.25);
  c.strokeStyle = color;
  c.fillStyle = color;
  c.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const phase = (t * 0.65 + i * 0.37) % 1,
      x = Math.sin(i * 2.4 + t * 0.8) * (12 + phase * 17),
      y = -phase * 72;
    c.globalAlpha = Math.sin(phase * Math.PI) * 0.7;
    c.beginPath();
    c.moveTo(x, y + 5);
    c.lineTo(x + 2, y);
    c.stroke();
    ellipse(c, x + 2, y, 1.3, 1.3);
  }
  c.restore();
}
function ellipse(
  c: C,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill = true,
) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, TAU);
  fill ? c.fill() : c.stroke();
}
function polygon(c: C, points: number[]) {
  c.beginPath();
  c.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) c.lineTo(points[i], points[i + 1]);
  c.closePath();
  c.fill();
  c.stroke();
}
function star(c: C, x: number, y: number, r: number) {
  polygon(c, [
    x,
    y - r,
    x + r * 0.25,
    y - r * 0.25,
    x + r,
    y,
    x + r * 0.25,
    y + r * 0.25,
    x,
    y + r,
    x - r * 0.25,
    y + r * 0.25,
    x - r,
    y,
    x - r * 0.25,
    y - r * 0.25,
  ]);
}
function flame(
  c: C,
  x: number,
  y: number,
  height: number,
  t: number,
  fel = false,
) {
  c.save();
  c.translate(x, y);
  c.fillStyle = fel ? "#54c83a" : "#e45a23";
  c.strokeStyle = fel ? "#bbf453" : "#ffb24a";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-height * 0.22, 0);
  c.quadraticCurveTo(
    -height * 0.4,
    -height * 0.4,
    Math.sin(t) * height * 0.14,
    -height,
  );
  c.quadraticCurveTo(
    height * 0.09,
    -height * 0.48,
    height * 0.3,
    -height * 0.25,
  );
  c.quadraticCurveTo(height * 0.4, 3, -height * 0.22, 0);
  c.fill();
  c.stroke();
  c.fillStyle = fel ? "#e4ff9a" : "#fff0b2";
  ellipse(c, 0, -height * 0.2, height * 0.1, height * 0.23);
  c.restore();
}

/** Evolved ground forms are structural art, also visible with particles disabled. */
export function drawEvolvedArea(
  c: C,
  area: Area,
  time: number,
  motion: boolean,
  particles: boolean,
): boolean {
  if ((area.spellRank || 1) < 5) return false;
  const id = area.spellId,
    t = motion ? time : 0,
    r = area.radius;
  const fade = Math.min(
    1,
    area.life / 0.5,
    (area.maxLife - area.life) / 0.2 + 0.15,
  );
  c.save();
  c.translate(area.x, area.y);
  c.lineCap = "round";
  c.fillStyle = area.color;
  c.strokeStyle = area.color;
  c.globalAlpha = fade * 0.16;
  ellipse(c, 0, 0, r, r);
  c.globalAlpha = fade * 0.34;
  c.lineWidth = 1.5;
  ellipse(c, 0, 0, r, r, false);
  ellipse(c, 0, 0, r * 0.94, r * 0.94, false);
  c.globalAlpha = fade * 0.8;
  if (particles) {
    const color = id === "immolate" ? "#adf16b" : area.color;
    light(c, 0, 0, r * 0.8, color, 0.35);
  }
  if (id === "blizzard") {
    // Frozen Orb: a faceted suspended core, orbital ice bands and a crystal crown.
    c.save();
    c.translate(0, -26);
    if (particles) light(c, 0, 0, 58, "#7cddfa", 0.85);
    c.fillStyle = "#214c75";
    c.strokeStyle = "#b5f2ff";
    c.lineWidth = 2;
    if (
      !drawSpellTexture(c, "frost", 0.26 + Math.sin(t * 1.9) * 0.07, 48, 0.9)
    ) {
      ellipse(c, 0, 0, 32, 32);
      c.fillStyle = "#85dcee";
      polygon(c, [-22, -17, 0, -30, 21, -14, 10, 12, -13, 20]);
      c.fillStyle = "#eaffff";
      polygon(c, [0, -30, 21, -14, 10, 12, -2, 2]);
    }
    c.rotate(t * 0.8);
    c.strokeStyle = "#ddfbff";
    ellipse(c, 0, 0, 49, 16, false);
    c.rotate(1.3);
    ellipse(c, 0, 0, 48, 15, false);
    c.restore();
    for (let i = 0; i < 8; i++) {
      const a = (i * TAU) / 8 + t * 0.16,
        x = Math.cos(a) * r * 0.72,
        y = Math.sin(a) * r * 0.72;
      c.fillStyle = "#71b8dd";
      c.strokeStyle = "#d9faff";
      c.save();
      c.translate(x, y - 10);
      const painted = drawSpellTexture(
        c,
        "frost",
        0.28 + Math.sin(t * 2 + i) * 0.04,
        24,
        0.65,
      );
      c.restore();
      if (!painted)
        polygon(c, [
          x - 9,
          y,
          x - 5,
          y - 15,
          x,
          y - 29 - (i % 3) * 5,
          x + 8,
          y - 12,
          x + 9,
          y,
        ]);
    }
  } else if (id === "moonfire") {
    // Starfall: celestial chart and a shower of large meteors.
    c.strokeStyle = "#b8c9ff";
    c.lineWidth = 1;
    ellipse(c, 0, 0, r * 0.66, r * 0.66, false);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.39996,
        d = r * (0.25 + (i % 3) * 0.22),
        phase = (t * 0.7 + i * 0.37) % 1;
      const x = Math.cos(a) * d,
        y = Math.sin(a) * d;
      c.fillStyle = "#f5eeff";
      c.strokeStyle = "#bba9ff";
      if (particles) light(c, x, y - 45 * (1 - phase), 22, "#b5b9ff", 0.6);
      star(c, x, y - 45 * (1 - phase), 9 + (i % 2) * 4);
      c.beginPath();
      c.moveTo(x + 18, y - 90 * (1 - phase) - 18);
      c.lineTo(x, y - 45 * (1 - phase));
      c.stroke();
      ellipse(c, x, y, 12 * phase + 2, 5 * phase + 1, false);
    }
  } else if (id === "hurricane" || id === "poison") {
    // Typhoon / Venomous Tempest: rising wind funnels, not another expanding ring.
    for (let j = 0; j < 6; j++) {
      const phase = (j / 6 + t * 0.45) % 1,
        width = r * (0.35 + phase * 0.55),
        y = -phase * 55;
      c.strokeStyle =
        id === "poison"
          ? j % 2
            ? "#dfff88"
            : "#63ad46"
          : j % 2
            ? "#d3ffff"
            : "#76b9d2";
      c.lineWidth = 3;
      c.beginPath();
      c.ellipse(
        Math.sin(t * 2 + phase * 5) * 8,
        y,
        width,
        width * 0.28,
        t * 0.08,
        0.2 + phase * 3,
        5.6 + phase * 3,
      );
      c.stroke();
    }
    if (id === "poison") {
      c.fillStyle = "#d8ff8b";
      c.strokeStyle = "#5c9941";
      for (let i = 0; i < 6; i++)
        ellipse(
          c,
          Math.cos(i * 2.4 + t) * r * 0.6,
          Math.sin(i * 2.4 + t) * r * 0.45 - 12,
          5,
          8,
        );
    }
  } else if (id === "corruption" || id === "pain") {
    c.fillStyle = "#252032";
    c.strokeStyle = id === "corruption" ? "#b8f976" : "#c6a0ed";
    ellipse(c, 0, -12, 27, 34);
    c.fillStyle = id === "corruption" ? "#a8d86c" : "#c7a4ef";
    for (let i = 0; i < 7; i++) {
      const a = (i * TAU) / 7 + t * 0.35;
      c.beginPath();
      c.moveTo(Math.cos(a) * 21, Math.sin(a) * 21 - 12);
      c.bezierCurveTo(
        Math.cos(a + 0.6) * r * 0.6,
        Math.sin(a + 0.6) * r * 0.6,
        Math.cos(a - 0.4) * r * 0.8,
        Math.sin(a - 0.4) * r * 0.8,
        Math.cos(a) * r * 0.94,
        Math.sin(a) * r * 0.94,
      );
      c.stroke();
    }
    c.strokeStyle = "#eaffcb";
    c.lineWidth = 2;
    polygon(c, [-9, -31, 4, -18, -5, -11, 10, 3, -2, 15]);
  } else if (id === "consecration") {
    c.strokeStyle = "#ffe3a4";
    c.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      c.save();
      c.rotate((i * TAU) / 8 + t * 0.08);
      polygon(c, [r * 0.52, 0, r * 0.68, -9, r * 0.84, 0, r * 0.68, 9]);
      c.restore();
    }
    c.fillStyle = "#fff1bf";
    c.strokeStyle = "#e9bc61";
    polygon(
      c,
      [
        -7, -44, 7, -44, 7, -24, 24, -24, 24, -12, 7, -12, 7, 18, -7, 18, -7,
        -12, -24, -12, -24, -24, -7, -24,
      ],
    );
    for (let i = 0; i < 5; i++) {
      const a = (i * TAU) / 5 + t * 0.15;
      const x = Math.cos(a) * r * 0.62,
        y = Math.sin(a) * r * 0.62;
      c.globalAlpha = fade * 0.35;
      c.fillStyle = "#ffdf87";
      ellipse(c, x, y - 30, 6, 34);
      c.globalAlpha = fade * 0.8;
      star(c, x, y - 55, 7);
    }
  } else if (["immolate", "magma", "trap", "flamestrike"].includes(id || "")) {
    const fel = id === "immolate";
    c.strokeStyle = fel ? "#bff477" : "#ffbd65";
    c.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = (i * TAU) / 8;
      c.beginPath();
      c.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2);
      c.lineTo(Math.cos(a + 0.14) * r * 0.55, Math.sin(a + 0.14) * r * 0.55);
      c.lineTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9);
      c.stroke();
      flame(
        c,
        Math.cos(a + t * 0.12) * r * 0.69,
        Math.sin(a + t * 0.12) * r * 0.69,
        28 + (Math.sin(t * 5 + i) + 1) * 12,
        t * 9 + i,
        fel,
      );
    }
    flame(c, 0, 0, 64 + Math.sin(t * 6) * 9, t * 7, fel);
  } else if (id === "volley") {
    c.strokeStyle = "#fff1c2";
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4,
        d = r * Math.sqrt((i + 0.5) / 9),
        phase = (t + i * 0.31) % 1,
        x = Math.cos(a) * d,
        y = Math.sin(a) * d;
      c.beginPath();
      c.moveTo(x + 15, y - 85 * (1 - phase));
      c.lineTo(x, y);
      c.stroke();
      c.fillStyle = "#fff0cf";
      polygon(c, [x - 5, y - 8, x, y, x + 5, y - 8]);
    }
  } else {
    // Learned techniques retain their school but gain an animated runic mandala.
    for (let i = 0; i < 8; i++) {
      c.save();
      c.rotate((i * TAU) / 8 + t * 0.25);
      c.lineWidth = 2;
      polygon(c, [r * 0.4, 0, r * 0.6, -12, r * 0.82, 0, r * 0.6, 12]);
      c.restore();
    }
  }
  if (particles) {
    c.fillStyle = "#fff4d5";
    c.strokeStyle = area.color;
    for (let i = 0; i < 8; i++) {
      const a = i * 2.39996 + t * 0.4;
      star(
        c,
        Math.cos(a) * r * 0.86,
        Math.sin(a) * r * 0.86 - 8 * Math.sin(t * 3 + i),
        3,
      );
    }
  }
  c.restore();
  return true;
}

/** Rank five replaces the summon model; no reliance on decorative particles. */
export function drawEvolvedPet(
  c: C,
  pet: Pet,
  owner: Vec,
  time: number,
  motion: boolean,
  particles: boolean,
): void {
  const t = motion ? time : 0,
    bob = Math.sin(t * 3) * 2,
    facing = pet.x > owner.x ? -1 : 1;
  c.save();
  c.translate(pet.x, pet.y);
  c.scale(facing, 1);
  c.fillStyle = "#080e12a0";
  ellipse(c, 0, 5, pet.spellId === "beast" ? 29 : 25, 8);
  c.translate(0, bob);
  c.lineJoin = "round";
  c.lineWidth = 2;
  if (pet.spellId === "imp") {
    // Infernal: broad basalt shoulders, heavy fists and glowing fissures.
    flame(c, 0, -29, 42, t * 7, true);
    c.fillStyle = "#354236";
    c.strokeStyle = "#9ed963";
    polygon(
      c,
      [-17, -40, -25, -29, -20, -7, -13, 1, 13, 1, 22, -9, 25, -31, 15, -42],
    );
    c.fillStyle = "#49574a";
    polygon(c, [-21, -35, -34, -37, -43, -23, -37, -11, -25, -16]);
    polygon(c, [21, -35, 35, -36, 43, -21, 36, -10, 25, -16]);
    c.fillStyle = "#26352c";
    polygon(c, [-34, -20, -46, -11, -44, 4, -29, 7, -25, -5]);
    polygon(c, [34, -19, 45, -10, 44, 4, 29, 7, 25, -5]);
    polygon(c, [-16, -5, -20, 13, -5, 15, -1, -3]);
    polygon(c, [5, -4, 4, 14, 22, 13, 17, -6]);
    c.fillStyle = "#647361";
    polygon(c, [-12, -56, 9, -58, 17, -44, 8, -33, -10, -35, -17, -46]);
    c.strokeStyle = "#caff83";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-17, -30);
    c.lineTo(-4, -23);
    c.lineTo(-10, -13);
    c.lineTo(1, -5);
    c.moveTo(16, -33);
    c.lineTo(7, -20);
    c.lineTo(14, -9);
    c.stroke();
    c.fillStyle = "#e0ff9b";
    polygon(c, [-11, -47, -2, -44, -5, -41, -11, -43]);
    polygon(c, [3, -44, 12, -48, 12, -43, 6, -41]);
    if (particles) {
      flame(c, -36, 2, 22, t * 8 + 1, true);
      flame(c, 35, 2, 22, t * 8 + 3, true);
    }
  } else if (pet.spellId === "totem") {
    // Fire Elemental: floating humanoid flame body instead of a wooden totem.
    flame(c, 0, 8, 80, t * 7);
    flame(c, -23, -7, 41, t * 8 + 2);
    flame(c, 23, -7, 41, t * 8 + 4);
    c.fillStyle = "#ffd05a";
    c.strokeStyle = "#fff0b0";
    polygon(c, [-10, -50, -15, -28, -6, -12, 0, 6, 9, -13, 15, -31, 9, -53]);
    c.fillStyle = "#a33c22";
    polygon(c, [-11, -62, 0, -71, 12, -60, 7, -46, -8, -47]);
    c.fillStyle = "#ffffd6";
    c.fillRect(-8, -59, 5, 3);
    c.fillRect(4, -59, 5, 3);
    if (particles) {
      flame(c, -33, 0, 25, t * 8 + 1);
      flame(c, 33, 0, 25, t * 8 + 3);
    }
  } else {
    // Bestial Wrath: massive armored spirit wolf with a bristling mane.
    c.fillStyle = "#71323b";
    c.strokeStyle = "#edb286";
    polygon(c, [-25, -18, -38, -36, -32, -9, -23, 1, -18, -5]);
    c.fillStyle = "#b77662";
    polygon(
      c,
      [-26, -24, -14, -36, 12, -34, 27, -24, 19, -5, -17, -6, -28, -15],
    );
    c.fillStyle = "#e4b792";
    polygon(c, [8, -33, 20, -49, 28, -44, 33, -27, 42, -22, 39, -13, 21, -15]);
    c.fillStyle = "#582e39";
    polygon(c, [16, -41, 14, -56, 25, -46]);
    polygon(c, [27, -43, 28, -56, 33, -40]);
    for (let i = 0; i < 4; i++) {
      const x = -20 + i * 12;
      c.fillStyle = i % 2 ? "#945451" : "#d59776";
      polygon(c, [x, -10, x - 4, 9, x + 5, 10, x + 8, -8]);
    }
    c.fillStyle = "#fff0bd";
    polygon(c, [-15, -35, -19, -48, -7, -40, -5, -51, 3, -40, 7, -46, 13, -34]);
    c.fillStyle = "#ffefad";
    ellipse(c, 28, -33, 3, 2);
    c.fillStyle = "#342531";
    ellipse(c, 41, -22, 3, 3);
    if (particles) {
      c.strokeStyle = "#ffca7f";
      c.lineWidth = 2;
      ellipse(c, 0, -18, 39, 29, false);
    }
  }
  c.restore();
}
