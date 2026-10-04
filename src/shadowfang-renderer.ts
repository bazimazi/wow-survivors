import type { GameEngine } from "./engine";

export function drawShadowfangFloor(
  c: CanvasRenderingContext2D,
  g: GameEngine,
  width: number,
  height: number,
) {
  const b = g.dungeonStage!.bounds,
    stage = g.dungeonStageIndex;
  c.fillStyle = "#111724";
  c.fillRect(
    g.player.x - width / 2 - 8,
    g.player.y - height / 2 - 8,
    width + 16,
    height + 16,
  );
  c.fillStyle = ["#353343", "#32394a", "#342d41", "#2d3146"][stage];
  c.fillRect(-b.x, -b.y, b.x * 2, b.y * 2);
  c.save();
  c.beginPath();
  c.rect(-b.x, -b.y, b.x * 2, b.y * 2);
  c.clip();
  c.strokeStyle = "#85869825";
  c.lineWidth = 2;
  for (let y = -b.y; y < b.y; y += 84)
    for (let x = -b.x; x < b.x; x += 108)
      c.strokeRect(x + (Math.floor(y / 84) % 2 ? 54 : 0) + 3, y + 3, 101, 77);
  if (stage < 3) {
    c.fillStyle = ["#603849", "#334a62", "#4c3459"][stage];
    c.fillRect(-110, -b.y + 90, 220, b.y * 2 - 180);
    c.strokeStyle = "#b3a18766";
    c.lineWidth = 3;
    c.strokeRect(-101, -b.y + 100, 202, b.y * 2 - 200);
    for (let y = -b.y + 130; y < b.y - 110; y += 100) {
      c.beginPath();
      c.moveTo(0, y - 18);
      c.lineTo(22, y);
      c.lineTo(0, y + 18);
      c.lineTo(-22, y);
      c.closePath();
      c.stroke();
    }
  } else {
    for (const radius of [115, 170, 230]) {
      c.strokeStyle = "#a28ec04c";
      c.lineWidth = radius === 170 ? 6 : 2;
      c.beginPath();
      c.arc(0, 0, radius, 0, Math.PI * 2);
      c.stroke();
    }
    for (let i = 0; i < 12; i++) {
      c.save();
      c.rotate((i * Math.PI) / 6);
      c.fillStyle = "#a194be6e";
      c.fillRect(-3, -210, 6, 15);
      c.restore();
    }
    for (const side of [-1, 1]) {
      c.fillStyle = "#4d446166";
      c.strokeStyle = "#b7a0db55";
      c.lineWidth = 3;
      c.beginPath();
      c.ellipse(side * 220, side * 140, 64, 45, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
  }
  // Furnishings are floor decoration; movement uses the rectangular arena bounds.
  for (const side of [-1, 1])
    for (let i = 0; i < 3; i++) {
      const x = side * (b.x - 125),
        y = -b.y + 170 + i * (b.y - 170);
      if (stage === 0) {
        c.fillStyle = "#171e28";
        c.fillRect(x - 65, y - 110, 130, 220);
        c.fillStyle = "#66515b";
        c.fillRect(x - 58, y - 105, 116, 210);
        c.fillStyle = "#a6928155";
        c.fillRect(x - 36, y - 90, 72, 180);
        for (const dy of [-62, 0, 62]) {
          c.fillStyle = "#b7bbbd";
          c.beginPath();
          c.ellipse(x, y + dy, 13, 9, 0, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = "#dfc795";
          c.fillRect(x - 2, y + dy - 24, 4, 12);
        }
      } else if (stage === 1) {
        c.fillStyle = "#1d2433";
        c.beginPath();
        c.ellipse(x, y + 10, 42, 26, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#747c89";
        c.fillRect(x - 22, y - 23, 44, 38);
        c.fillStyle = "#b1b7c0";
        c.fillRect(x - 28, y - 32, 56, 12);
        c.fillStyle = "#486380";
        c.beginPath();
        c.moveTo(x - 17, y - 12);
        c.lineTo(x + 17, y - 12);
        c.lineTo(x, y + 19);
        c.closePath();
        c.fill();
      } else if (stage === 2) {
        c.fillStyle = "#261e2b";
        c.fillRect(x - 50, y - 95, 100, 190);
        for (let shelf = 0; shelf < 4; shelf++) {
          for (let book = 0; book < 7; book++) {
            c.fillStyle = ["#775a66", "#686681", "#877358", "#516972"][
              (book + shelf) % 4
            ];
            c.fillRect(
              x - 40 + book * 12,
              y - 84 + shelf * 46 + (book % 3) * 3,
              8,
              30 - (book % 3) * 3,
            );
          }
          c.fillStyle = "#95816a";
          c.fillRect(x - 43, y - 48 + shelf * 46, 86, 4);
        }
      } else {
        c.fillStyle = "#59637c44";
        c.beginPath();
        c.moveTo(x - 35, y - 100);
        c.lineTo(x + 35, y - 100);
        c.lineTo(x + 95, y + 160);
        c.lineTo(x - 95, y + 160);
        c.closePath();
        c.fill();
        c.strokeStyle = "#8491ab";
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(x - 24, y - 55);
        c.lineTo(x - 24, y - 100);
        c.quadraticCurveTo(x, y - 135, x + 24, y - 100);
        c.lineTo(x + 24, y - 55);
        c.closePath();
        c.stroke();
      }
    }
  c.restore();
  c.strokeStyle = "#171e2c";
  c.lineWidth = 22;
  c.strokeRect(-b.x - 7, -b.y - 7, b.x * 2 + 14, b.y * 2 + 14);
  c.strokeStyle = "#a1a2b277";
  c.lineWidth = 3;
  c.strokeRect(-b.x, -b.y, b.x * 2, b.y * 2);
  for (const side of [-1, 1])
    for (const y of [-b.y + 65, 0, b.y - 65]) {
      const x = side * (b.x - 20),
        glow = c.createRadialGradient(x, y, 2, x, y, 100);
      glow.addColorStop(0, "#a89ce540");
      glow.addColorStop(1, "#a89ce500");
      c.fillStyle = glow;
      c.fillRect(x - 100, y - 100, 200, 200);
      c.fillStyle = "#b4b9dd";
      c.fillRect(x - 3, y - 10, 6, 16);
    }
}
