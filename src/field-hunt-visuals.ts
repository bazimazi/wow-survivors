import type { FieldHunt } from "./field-hunt";
import type { Vec } from "./engine";

/** Grounded rune silhouettes stay readable without particles or motion. */
export function drawFieldHunt(
  c: CanvasRenderingContext2D,
  hunt: FieldHunt,
  position: Vec,
  time: number,
  animated: boolean,
) {
  if (hunt.state !== "offered" && hunt.state !== "active") return;
  const t = animated ? time : 0;
  const exposed = hunt.state === "active" && hunt.exposedUntil > time;
  const color = exposed ? "#9eead5" : "#c3a4f2";
  c.save();
  c.translate(position.x, position.y);
  c.scale(1, 0.65);
  c.fillStyle = exposed ? "#9eead519" : "#b28ae91a";
  c.strokeStyle = color;
  c.lineWidth = 2;
  c.beginPath();
  c.arc(0, 0, 55 + Math.sin(t * 3) * 2, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.globalAlpha = 0.55;
  c.beginPath();
  c.arc(0, 0, 67, -t * 0.2, -t * 0.2 + Math.PI * 1.6);
  c.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 + t * 0.12;
    c.save();
    c.translate(Math.cos(a) * 61, Math.sin(a) * 61);
    c.rotate(a + Math.PI / 4);
    c.strokeRect(-3, -3, 6, 6);
    c.restore();
  }
  c.restore();
  if (hunt.state === "offered") {
    c.save();
    c.translate(position.x, position.y - 40 + Math.sin(t * 2) * 4);
    c.strokeStyle = color;
    c.fillStyle = "#241c36e0";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, -16);
    c.lineTo(10, 0);
    c.lineTo(0, 16);
    c.lineTo(-10, 0);
    c.closePath();
    c.fill();
    c.stroke();
    c.font = "600 11px sans-serif";
    c.textAlign = "center";
    c.fillStyle = "#f0ddff";
    c.fillText("OPTIONAL FIELD HUNT", 0, -29);
    c.font = "10px sans-serif";
    c.fillText("F · Awaken champion", 0, 40);
    c.restore();
  }
}
