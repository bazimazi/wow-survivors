import type { Enemy, GameEngine } from "./engine";
import { drawShadowfangFloor } from "./shadowfang-renderer";
import { WALK_KEYS } from "./animation";
import type { ActorPose } from "./animation";
import { combatKey } from "./combat-animation";

export function drawDungeonFloor(
  c: CanvasRenderingContext2D,
  g: GameEngine,
  width: number,
  height: number,
) {
  if (g.zone.id === "shadowfang") {
    drawShadowfangFloor(c, g, width, height);
    return;
  }
  if (g.zone.id === "ragefire") {
    drawRagefireFloor(c, g, width, height);
    return;
  }
  const stage = g.dungeonStage!,
    b = stage.bounds,
    deck = g.dungeonStageIndex > 0;
  c.fillStyle = deck ? "#152c34" : "#181e22";
  c.fillRect(
    g.player.x - width / 2 - 8,
    g.player.y - height / 2 - 8,
    width + 16,
    height + 16,
  );
  c.fillStyle = deck ? "#5d4b36" : "#33373a";
  c.fillRect(-b.x, -b.y, b.x * 2, b.y * 2);
  c.save();
  c.beginPath();
  c.rect(-b.x, -b.y, b.x * 2, b.y * 2);
  c.clip();
  if (deck) {
    for (let y = -b.y; y <= b.y; y += 36) {
      c.fillStyle = Math.floor(y / 36) % 2 ? "#64533d" : "#594833";
      c.fillRect(-b.x, y, b.x * 2, 33);
      c.strokeStyle = "#aa8a5733";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-b.x, y + 1);
      c.lineTo(b.x, y + 1);
      c.stroke();
      for (
        let x = -b.x + (Math.floor(y / 36) % 2 ? 90 : 0);
        x <= b.x;
        x += 180
      ) {
        c.fillStyle = "#332d27";
        c.fillRect(x, y, 2, 34);
        c.fillRect(x - 5, y + 5, 2, 2);
        c.fillRect(x - 5, y + 27, 2, 2);
      }
    }
    for (const side of [-1, 1]) {
      c.fillStyle = "#302f2c";
      c.fillRect(side * (b.x - 155) - 55, -100, 110, 150);
      c.strokeStyle = "#aa875855";
      c.lineWidth = 4;
      c.strokeRect(side * (b.x - 155) - 55, -100, 110, 150);
      for (let x = 0; x < 5; x++) {
        c.fillStyle = "#687077";
        c.fillRect(side * (b.x - 155) - 45 + x * 20, -93, 5, 136);
      }
    }
    if (g.dungeonStageIndex === 2) {
      c.fillStyle = "#332e27";
      c.fillRect(-26, -b.y + 100, 52, 120);
      c.strokeStyle = "#b09a64";
      c.lineWidth = 4;
      c.strokeRect(-26, -b.y + 100, 52, 120);
      c.fillStyle = "#674936";
      c.beginPath();
      c.ellipse(0, -b.y + 160, 22, 30, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#812f34";
      c.fillRect(-100, b.y - 110, 200, 90);
      c.strokeStyle = "#c8a16966";
      c.strokeRect(-100, b.y - 110, 200, 90);
    }
  } else {
    c.strokeStyle = "#6971732a";
    c.lineWidth = 2;
    for (let x = -b.x; x <= b.x; x += 96)
      for (let y = -b.y; y <= b.y; y += 84) {
        c.strokeRect(x + 3, y + 3, 89, 77);
      }
    c.fillStyle = "#4e4133";
    for (let y = -b.y; y <= b.y; y += 50) c.fillRect(-80, y, 160, 9);
    c.strokeStyle = "#8e9390";
    c.lineWidth = 7;
    for (const x of [-56, 56]) {
      c.beginPath();
      c.moveTo(x, -b.y);
      c.lineTo(x, b.y);
      c.stroke();
    }
    for (const side of [-1, 1]) {
      const x = side * (b.x - 150),
        y = -b.y + 180;
      c.fillStyle = "#252b2d";
      c.fillRect(x - 72, y - 70, 144, 145);
      c.strokeStyle = "#8a7650";
      c.lineWidth = 5;
      c.strokeRect(x - 72, y - 70, 144, 145);
      c.fillStyle = "#a66d36";
      c.fillRect(x - 47, y - 28, 94, 20);
      c.fillRect(x - 32, y + 6, 64, 23);
      c.fillStyle = "#313d40";
      c.beginPath();
      c.arc(x, y + 57, 26, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#b0975f";
      c.lineWidth = 3;
      c.stroke();
    }
  }
  c.restore();
  c.lineWidth = deck ? 14 : 30;
  c.strokeStyle = deck ? "#8e714a" : "#626464";
  c.strokeRect(-b.x - 8, -b.y - 8, b.x * 2 + 16, b.y * 2 + 16);
  c.lineWidth = 2;
  c.strokeStyle = "#d9b77999";
  c.strokeRect(-b.x, -b.y, b.x * 2, b.y * 2);
  for (const side of [-1, 1])
    for (const y of [-b.y + 60, 0, b.y - 60]) {
      const x = side * (b.x - 18);
      const glow = c.createRadialGradient(x, y, 4, x, y, 130);
      glow.addColorStop(0, "#efb76833");
      glow.addColorStop(1, "#efb76800");
      c.fillStyle = glow;
      c.fillRect(x - 130, y - 130, 260, 260);
      c.fillStyle = "#292a25";
      c.fillRect(x - 9, y - 12, 18, 26);
      c.fillStyle = "#e1b267";
      c.fillRect(x - 5, y - 8, 10, 18);
      c.fillStyle = "#f5d9a0";
      c.fillRect(x - 2, y - 5, 4, 10);
    }
}

function drawRagefireFloor(
  c: CanvasRenderingContext2D,
  g: GameEngine,
  width: number,
  height: number,
) {
  const b = g.dungeonStage!.bounds,
    stage = g.dungeonStageIndex;
  c.fillStyle = "#50251b";
  c.fillRect(
    g.player.x - width / 2 - 8,
    g.player.y - height / 2 - 8,
    width + 16,
    height + 16,
  );
  c.strokeStyle = "#c65525";
  c.lineWidth = 55;
  c.strokeRect(-b.x - 22, -b.y - 22, b.x * 2 + 44, b.y * 2 + 44);
  c.strokeStyle = "#ed9b4577";
  c.lineWidth = 9;
  c.strokeRect(-b.x - 32, -b.y - 32, b.x * 2 + 64, b.y * 2 + 64);
  c.fillStyle = ["#393132", "#343039", "#342b3b", "#3c2c31"][stage];
  c.fillRect(-b.x, -b.y, b.x * 2, b.y * 2);
  c.save();
  c.beginPath();
  c.rect(-b.x, -b.y, b.x * 2, b.y * 2);
  c.clip();
  // Stable geometry: decoration does not imply a separate damaging floor.
  c.strokeStyle = "#1a182360";
  c.lineWidth = 3;
  for (let x = -b.x; x < b.x; x += 120)
    for (let y = -b.y; y < b.y; y += 95) {
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 82, y + 20);
      c.lineTo(x + 108, y + 70);
      c.lineTo(x + 24, y + 92);
      c.stroke();
    }
  if (stage === 1 || stage === 2) {
    c.fillStyle = stage === 1 ? "#45404b" : "#292337";
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + Math.PI / 8;
      c.lineTo(Math.cos(a) * 225, Math.sin(a) * 225);
    }
    c.closePath();
    c.fill();
    c.strokeStyle = stage === 1 ? "#81726e77" : "#af78b955";
    c.lineWidth = 4;
    c.stroke();
    if (stage === 2) {
      c.strokeStyle = "#af78b943";
      c.lineWidth = 3;
      for (const r of [150, 185]) {
        c.beginPath();
        c.arc(0, 0, r, 0, Math.PI * 2);
        c.stroke();
      }
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI * 4) / 5 - Math.PI / 2;
        c.lineTo(Math.cos(a) * 135, Math.sin(a) * 135);
      }
      c.stroke();
    }
  }
  if (stage === 3) {
    for (let i = 0; i < 5; i++) {
      c.fillStyle = i % 2 ? "#514046" : "#46383f";
      c.fillRect(-180 + i * 7, -b.y + 75 + i * 22, 360 - i * 14, 20);
    }
    c.fillStyle = "#69333988";
    c.fillRect(-125, b.y - 185, 250, 130);
    c.strokeStyle = "#bd835466";
    c.strokeRect(-125, b.y - 185, 250, 130);
  }
  for (const side of [-1, 1])
    for (let i = 0; i < 4; i++) {
      const x = side * (b.x - 75),
        y = -b.y + 90 + (i * (b.y * 2 - 180)) / 3;
      c.fillStyle = "#211d29";
      c.beginPath();
      c.ellipse(x, y + 12, 42, 27, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = stage === 0 ? "#62504b" : "#4e424f";
      c.beginPath();
      c.moveTo(x - 32, y + 5);
      c.lineTo(x - 24, y - 28);
      c.lineTo(x + 5, y - 45);
      c.lineTo(x + 27, y - 20);
      c.lineTo(x + 32, y + 8);
      c.closePath();
      c.fill();
      c.strokeStyle = "#a4856b66";
      c.lineWidth = 2;
      c.stroke();
      if (stage > 0) {
        c.fillStyle = stage === 2 ? "#b887c8" : "#e99047";
        c.fillRect(x - 4, y - 26, 8, 17);
      }
    }
  c.restore();
  c.strokeStyle = "#211e26";
  c.lineWidth = 22;
  c.strokeRect(-b.x - 8, -b.y - 8, b.x * 2 + 16, b.y * 2 + 16);
  c.strokeStyle = "#b6875b99";
  c.lineWidth = 2;
  c.strokeRect(-b.x, -b.y, b.x * 2, b.y * 2);
}

export function drawSmite(
  c: CanvasRenderingContext2D,
  e: Enemy,
  pose: ActorPose,
) {
  c.save();
  c.translate(e.x, e.y);
  if (pose.mirror) c.scale(-1, 1);
  c.scale(2.1, 2.1);
  const action = combatKey(pose.frame);
  if (action) {
    c.translate(action.lean * 1.5, -action.raise);
    c.rotate(action.reach * 0.035);
  }
  const step = (WALK_KEYS[pose.frame]?.left || 0) * 2;
  c.fillStyle = "#312925";
  c.fillRect(-11, -5, 8, 13 + step);
  c.fillRect(4, -5, 8, 13 - step);
  c.fillStyle = e.flash > 0 ? "#e5d2b0" : "#64483a";
  c.beginPath();
  c.ellipse(0, -24, 20, 24, 0, 0, Math.PI * 2);
  c.fill();
  c.fillRect(-25, -35, 10, 26);
  c.fillRect(15, -35, 10, 26);
  c.fillStyle = "#88614a";
  c.beginPath();
  c.ellipse(0, -53, 15, 16, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#baa77d";
  for (const side of [-1, 1]) {
    c.beginPath();
    c.moveTo(side * 10, -62);
    c.quadraticCurveTo(side * 24, -71, side * 21, -82);
    c.quadraticCurveTo(side * 36, -66, side * 15, -56);
    c.fill();
  }
  c.fillStyle = "#a17b59";
  c.beginPath();
  c.ellipse(0, -44, 13, 7, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#201e19";
  c.fillRect(-8, -56, 4, 3);
  c.fillRect(4, -56, 4, 3);
  c.fillRect(-5, -46, 3, 2);
  c.fillRect(3, -46, 3, 2);
  c.fillStyle = "#4b5354";
  c.fillRect(-22, -35, 16, 8);
  c.fillRect(7, -35, 16, 8);
  c.fillStyle = "#946f45";
  c.fillRect(-18, -16, 36, 5);
  c.fillStyle = "#c1a976";
  c.fillRect(-4, -18, 8, 9);
  c.fillStyle = "#75573a";
  c.fillRect(23, -49, 4, 50);
  c.fillStyle = "#78817c";
  c.fillRect(13, -59, 25, 17);
  c.fillStyle = "#c3b58d";
  c.fillRect(13, -59, 25, 3);
  c.restore();
}
