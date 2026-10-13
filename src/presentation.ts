import type { Vec } from "./engine";

/** Fixed-step simulation stays authoritative; display frames interpolate without writing to actors. */
export class RenderPositions {
  private previous = new WeakMap<object, Vec>();
  alpha = 1;
  capture(actors: Iterable<object & Vec>) {
    for (const actor of actors)
      this.previous.set(actor, { x: actor.x, y: actor.y });
  }
  at(actor: object & Vec): Vec {
    const before = this.previous.get(actor);
    if (
      !before ||
      this.alpha === 1 ||
      Math.hypot(actor.x - before.x, actor.y - before.y) > 100
    )
      return { x: actor.x, y: actor.y };
    return {
      x: before.x + (actor.x - before.x) * this.alpha,
      y: before.y + (actor.y - before.y) * this.alpha,
    };
  }
}

/** Damped following is frame-rate independent and snaps cleanly across room transitions. */
export class FollowCamera {
  private center: Vec | null = null;
  sample(target: Vec, delta: number, held: boolean, enabled: boolean): Vec {
    if (
      !this.center ||
      !enabled ||
      delta <= 0 ||
      Math.hypot(target.x - this.center.x, target.y - this.center.y) > 180
    )
      this.center = { ...target };
    else if (!held) {
      const blend = 1 - Math.exp(-Math.min(delta, 0.1) * 14);
      this.center.x += (target.x - this.center.x) * blend;
      this.center.y += (target.y - this.center.y) * blend;
    }
    return { ...this.center };
  }
}
