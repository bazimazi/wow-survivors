import type { DamageText } from "./engine";

interface CombatLabel {
  x: number;
  y: number;
  value: string;
  color: string;
  born: number;
  duration: number;
  critical: boolean;
  amount: number | null;
  lane: number;
}

/** Damage packets share a label; neighboring hits fan out instead of piling onto one digit. */
export class CombatLabels {
  private seen = new WeakSet<DamageText>();
  readonly labels: CombatLabel[] = [];
  private clock = -1;
  observe(texts: readonly DamageText[], time: number) {
    if (time < this.clock) {
      this.labels.length = 0;
      this.seen = new WeakSet();
    }
    this.clock = time;
    for (let i = this.labels.length - 1; i >= 0; i--)
      if (time - this.labels[i].born > this.labels[i].duration)
        this.labels.splice(i, 1);
    for (const text of texts) {
      if (this.seen.has(text)) continue;
      this.seen.add(text);
      const numeric = /^(\d+)(!)?$/.exec(text.value),
        critical = !!numeric?.[2],
        amount = numeric ? Number(numeric[1]) : null;
      const packet =
        amount !== null &&
        this.labels.find(
          (label) =>
            label.amount !== null &&
            label.critical === critical &&
            label.color === text.color &&
            time - label.born < 0.09 &&
            Math.hypot(label.x - text.x, label.y - text.y) < 24,
        );
      if (packet) {
        packet.amount! += amount!;
        packet.value = `${packet.amount}${critical ? "!" : ""}`;
        continue;
      }
      const nearby = this.labels.filter(
        (label) =>
          time - label.born < 0.42 &&
          Math.hypot(label.x - text.x, label.y - text.y) < 65,
      );
      const lane =
        [0, -1, 1, -2, 2].find(
          (candidate) => !nearby.some((label) => label.lane === candidate),
        ) ?? (this.labels.length % 5) - 2;
      if (this.labels.length >= 64) {
        const ordinary = this.labels.findIndex(
          (label) => !label.critical && label.amount !== null,
        );
        this.labels.splice(ordinary >= 0 ? ordinary : 0, 1);
      }
      this.labels.push({
        x: text.x,
        y: text.y,
        value: text.value,
        color: text.color,
        born: time,
        duration:
          amount === null ? Math.max(0.4, text.life) : critical ? 0.78 : 0.6,
        critical,
        amount,
        lane,
      });
    }
  }
  draw(
    c: CanvasRenderingContext2D,
    time: number,
    motion: boolean,
    large: boolean,
  ) {
    c.save();
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.lineJoin = "round";
    const occupied: {
      left: number;
      right: number;
      top: number;
      bottom: number;
    }[] = [];
    for (const label of this.labels) {
      const age = Math.max(0, time - label.born),
        p = Math.min(1, age / label.duration);
      if (p >= 1) continue;
      const rise = motion ? (1 - (1 - p) ** 2) * (label.critical ? 35 : 27) : 0;
      const drift = motion ? label.lane * (8 + p * 6) : label.lane * 8;
      const pop = label.critical && motion ? 1 + Math.exp(-age * 17) * 0.32 : 1;
      const size = large ? 18 : label.critical ? 17 : 12;
      c.font = `${label.critical ? 800 : 600} ${size}px ${label.critical ? "serif" : "sans-serif"}`;
      const x = label.x + drift;
      let y = label.y - rise - Math.abs(label.lane) * 9;
      const width = c.measureText(label.value).width * pop + 6;
      const height = size * pop + 5;
      // Actual glyph widths keep crowded critical hits legible, including large-text mode.
      for (let attempt = 0; attempt < occupied.length + 1; attempt++) {
        const collision = occupied.find(
          (rect) =>
            x + width / 2 > rect.left &&
            x - width / 2 < rect.right &&
            y + height / 2 > rect.top &&
            y - height / 2 < rect.bottom,
        );
        if (!collision) break;
        y = collision.top - height / 2 - 2;
      }
      occupied.push({
        left: x - width / 2,
        right: x + width / 2,
        top: y - height / 2,
        bottom: y + height / 2,
      });
      c.save();
      c.translate(x, y);
      c.globalAlpha = Math.min(1, (1 - p) * 4);
      c.scale(pop, pop);
      c.strokeStyle = "#091016ee";
      c.lineWidth = label.critical ? 3.5 : 2.5;
      c.strokeText(label.value, 0, 0);
      c.fillStyle = label.color;
      c.fillText(label.value, 0, 0);
      c.restore();
    }
    c.restore();
  }
}
