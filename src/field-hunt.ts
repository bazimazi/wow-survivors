import type { Vec } from "./engine";

export const HUNT_FIRST = 40;
export const HUNT_INTERVAL = 95;
export const HUNT_OFFER_TIME = 25;
export const HUNT_DURATION = 40;
export const HUNT_EXPOSURE = 5;
export const HUNT_NAMES: Record<string, string> = {
  elwynn: "Briarheart the Unbroken",
  westfall: "The Dustbound Marauder",
  tirisfal: "The Hollow Sentinel",
  duskwood: "The Moonless Hunter",
  plaguelands: "The Ashen Oathkeeper",
};

/** A voluntary, simulation-clock encounter. No real-time timers or save changes. */
export class FieldHunt {
  state: "idle" | "offered" | "active" | "complete" | "expired" = "idle";
  x = 0;
  y = 0;
  expiresAt = 0;
  exposedUntil = 0;
  enemyId = -1;
  completed = 0;
  attackIndex = 0;
  private slot = -1;

  update(
    time: number,
    duration: number,
    player: Vec,
    bounds: Vec,
    boss: boolean,
  ) {
    if (boss || time >= duration) {
      if (this.state === "offered" || this.state === "active") {
        this.state = "idle";
        return "expired";
      }
      this.state = "idle";
      return null;
    }
    if (this.state !== "idle" && time >= this.expiresAt) {
      const pending = this.state === "offered" || this.state === "active";
      this.state = pending ? "expired" : "idle";
      this.expiresAt = time + 4;
      if (pending) return "expired";
    }
    const slot = Math.floor((time - HUNT_FIRST) / HUNT_INTERVAL);
    if (slot < 0 || slot <= this.slot || time > duration - 55) return null;
    this.slot = slot;
    if (this.state === "active" || this.state === "offered") return null;
    const angle = slot * 2.399963 + Math.PI * 0.25;
    this.x = Math.max(
      -bounds.x + 150,
      Math.min(bounds.x - 150, player.x + Math.cos(angle) * 340),
    );
    this.y = Math.max(
      -bounds.y + 150,
      Math.min(bounds.y - 150, player.y + Math.sin(angle) * 340),
    );
    this.state = "offered";
    this.enemyId = -1;
    this.exposedUntil = 0;
    this.attackIndex = 0;
    this.expiresAt = time + HUNT_OFFER_TIME;
    return "offered";
  }

  begin(enemyId: number, time: number) {
    if (this.state !== "offered" || time >= this.expiresAt) return false;
    this.enemyId = enemyId;
    this.state = "active";
    this.expiresAt = time + HUNT_DURATION;
    return true;
  }

  damageMultiplier(enemyId: number, time: number, charged: boolean) {
    if (this.state !== "active" || this.enemyId !== enemyId) return 1;
    if (charged) this.exposedUntil = time + HUNT_EXPOSURE;
    return this.exposedUntil > time ? 1.65 : 0.35;
  }

  defeat(enemyId: number, time: number) {
    if (this.state !== "active" || this.enemyId !== enemyId) return false;
    this.completed++;
    this.state = "complete";
    this.expiresAt = time + 6;
    return true;
  }
}
