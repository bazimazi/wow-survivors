import { CLASS_MAP } from "./content";
import type { ClassId } from "./content";
import { heroCrop, createAnimationFrame } from "./animation-canvas";
import { IDLE_FRAME, IDLE_PERIOD } from "./painted-rig";

/** A high-resolution hero preview; the feet stay planted during the breathing cycle. */
export class CampStage {
  private atlas = new Image();
  private elapsed = 0;
  private canvas: HTMLCanvasElement | null = null;
  private hero: ClassId = "warrior";
  private cutout: HTMLCanvasElement | null = null;
  private ready = false;
  private skin: HTMLCanvasElement | null = null;
  constructor() {
    this.atlas.onload = () => {
      this.ready = true;
      this.cutout = null;
    };
    this.atlas.src = "/art/hero-sprites.png";
  }
  mount(canvas: HTMLCanvasElement | null, hero: ClassId) {
    if (hero !== this.hero) this.cutout = null;
    this.canvas = canvas;
    this.hero = hero;
  }
  draw(delta: number, animated: boolean) {
    const canvas = this.canvas;
    if (!canvas?.isConnected || !this.ready) return;
    if (animated && !document.hidden) this.elapsed += delta;
    const width = canvas.clientWidth,
      height = canvas.clientHeight;
    if (!width || !height) return;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    if (
      canvas.width !== Math.round(width * ratio) ||
      canvas.height !== Math.round(height * ratio)
    ) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    const c = canvas.getContext("2d")!;
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    c.clearRect(0, 0, width, height);
    if (!this.cutout) {
      const crop = heroCrop(
        CLASS_MAP[this.hero].portrait,
        this.atlas.naturalWidth,
        this.atlas.naturalHeight,
      );
      this.cutout = document.createElement("canvas");
      this.cutout.width = Math.ceil(crop.width);
      this.cutout.height = Math.ceil(crop.height);
      const b = this.cutout.getContext("2d")!;
      b.drawImage(
        this.atlas,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        this.cutout.width,
        this.cutout.height,
      );
      if (crop.cutout) {
        const m = crop.cutout;
        b.clearRect(
          m.x * this.cutout.width,
          m.y * this.cutout.height,
          m.width * this.cutout.width,
          m.height * this.cutout.height,
        );
      }
    }
    const size = Math.min(width * 0.84, height * 0.98);
    const baseline = height - 5;
    c.save();
    c.globalAlpha = 0.55;
    c.fillStyle = "#000";
    c.beginPath();
    c.ellipse(
      width / 2,
      baseline - 2,
      size * 0.24,
      size * 0.035,
      0,
      0,
      Math.PI * 2,
    );
    c.fill();
    c.restore();
    c.save();
    c.translate(width / 2, baseline);
    if (animated) {
      const phase = ((this.elapsed / IDLE_PERIOD) % 1) * 8;
      this.skin = createAnimationFrame(
        this.atlas,
        heroCrop(
          CLASS_MAP[this.hero].portrait,
          this.atlas.naturalWidth,
          this.atlas.naturalHeight,
        ),
        ["mage", "priest", "warlock", "druid"].includes(this.hero)
          ? "robe"
          : "biped",
        IDLE_FRAME + Math.floor(phase),
        undefined,
        this.hero,
        false,
        {
          nextFrame: IDLE_FRAME + ((Math.floor(phase) + 1) % 8),
          mix: phase % 1,
          gaitMix: 0,
          strideWeight: 0,
          restFrame: -1,
          restNext: -1,
          restMix: 0,
        },
        this.skin ?? undefined,
        384,
      );
      c.drawImage(
        this.skin,
        -size * 0.625,
        -size * 1.125,
        size * 1.25,
        size * 1.25,
      );
    } else c.drawImage(this.cutout, -size / 2, -size, size, size);
    c.restore();
    if (animated) {
      c.save();
      c.globalCompositeOperation = "screen";
      const color = CLASS_MAP[this.hero].color;
      for (let i = 0; i < 5; i++) {
        const phase = (this.elapsed * 0.22 + i * 0.2) % 1;
        c.globalAlpha = Math.sin(phase * Math.PI) * 0.5;
        c.fillStyle = color;
        c.beginPath();
        c.arc(
          width / 2 + Math.sin(i * 3.7 + this.elapsed * 0.8) * size * 0.35,
          baseline - size * 0.3 - phase * size * 0.65,
          1.3,
          0,
          Math.PI * 2,
        );
        c.fill();
      }
      c.restore();
    }
  }
}
