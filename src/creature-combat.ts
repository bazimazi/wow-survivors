import type { Enemy, EnemyAction } from "./engine";
import { combatFrame, COMBAT_DURATION } from "./combat-animation";
import type { CombatPose, CombatStyle } from "./combat-animation";

export const CREATURE_RECOVERY = 0.28;

/** Presentation mapping of the existing attacks; no encounter rules live here. */
export function creatureCombatStyle(action: EnemyAction): CombatStyle {
  if (action.kind === "contact") return "strike";
  const type = action.actor.type;
  if (action.kind === "projectile") return type === "defias" ? "shoot" : "cast";
  const alternate = action.pattern === 1;
  if (type === "defias")
    return action.zoneId === "deadmines"
      ? alternate
        ? "cast"
        : "strike"
      : "shoot";
  if (type === "golem") return alternate ? "cast" : "shoot";
  if (type === "taragaman") return alternate ? "strike" : "cast";
  if (type === "springvale") return alternate ? "cast" : "strike";
  if (type === "stitches" || type === "fenrus")
    return alternate ? "shoot" : "strike";
  if (type === "bazzalan") return alternate ? "cast" : "strike";
  if (["gnoll", "smite", "oggleflint"].includes(type)) return "strike";
  return "cast";
}

interface Gesture {
  start: number;
  time: number;
  warning: number;
  telegraph: boolean;
  style: CombatStyle;
  pose: CombatPose;
}

/** Weak state follows the real warning clock; thaw cannot replay an expired attack. */
export class CreatureCombatAnimator {
  private actors = new WeakMap<Enemy, Gesture>();
  clear(actor: Enemy) {
    this.actors.delete(actor);
  }
  trigger(action: EnemyAction): boolean {
    const { actor, time, facing, warning } = action;
    if (
      actor.dead ||
      actor.frozenUntil > time ||
      ![time, facing, warning].every(Number.isFinite) ||
      warning < 0
    )
      return false;
    const telegraph = action.kind === "telegraph";
    const previous = this.actors.get(actor);
    if (
      previous &&
      time >= previous.time &&
      time - previous.start < this.duration(previous) &&
      (!telegraph || previous.telegraph)
    )
      return false;
    const style = creatureCombatStyle(action);
    this.actors.set(actor, {
      start: time,
      time,
      warning: telegraph ? warning : 0,
      telegraph,
      style,
      pose: {
        frame: combatFrame(style, telegraph && warning === 0 ? 2 : 0),
        mirror: Math.cos(facing) < -0.2,
        style,
        progress: 0,
      },
    });
    return true;
  }
  private duration(gesture: Gesture) {
    return gesture.telegraph
      ? gesture.warning + CREATURE_RECOVERY
      : COMBAT_DURATION;
  }
  sample(
    actor: Enemy,
    time: number,
    { enabled = true, frozen = false } = {},
  ): CombatPose | null {
    const gesture = this.actors.get(actor);
    if (!gesture) return null;
    if (
      !enabled ||
      actor.dead ||
      !Number.isFinite(time) ||
      time < gesture.time
    ) {
      this.clear(actor);
      return null;
    }
    gesture.time = time;
    if (frozen) return gesture.pose;
    const age = time - gesture.start,
      duration = this.duration(gesture);
    if (age >= duration) {
      this.clear(actor);
      return null;
    }
    const stage = gesture.telegraph
      ? age < gesture.warning
        ? Math.min(1, Math.floor((age / gesture.warning) * 2))
        : Math.min(
            5,
            2 + Math.floor(((age - gesture.warning) / CREATURE_RECOVERY) * 4),
          )
      : Math.min(5, Math.floor((age / COMBAT_DURATION) * 6));
    gesture.pose = {
      ...gesture.pose,
      frame: combatFrame(gesture.style, stage),
      progress: age / duration,
    };
    return gesture.pose;
  }
}
