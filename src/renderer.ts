import { RESOURCE_TIERS } from "./resources";
import { MATERIALS, SPELLS } from "./content";
import type { ClassDef } from "./content";
import type {
  Enemy,
  Vec,
  Hazard,
  CombatAction,
  EnemyAction,
  DeathAction,
} from "./engine";
import type { Landmark } from "./expedition";
import { GameEngine, WORLD_SIZE } from "./engine";
import { drawDungeonFloor, drawSmite } from "./dungeon-renderer";
import { CREATURE_ART } from "./creature-animation";
import {
  ActorAnimator,
  FrameCache,
  QueuedFrameCache,
  WALK_KEYS,
} from "./animation";
import type { ActorPose, AnimationRig } from "./animation";
import {
  createAnimationFrame,
  heroCrop,
  backHeroCrop,
  creatureCrop,
  FRAME_CONTENT,
  FRAME_PADDING,
  FRAME_SIZE,
} from "./animation-canvas";
import type { SpriteCrop } from "./animation-canvas";
import { CombatAnimator, combatKey, combatStyle } from "./combat-animation";
import { CreatureCombatAnimator } from "./creature-combat";
import { DeathAnimator, deathVisual } from "./death-animation";
import type { DeathScene, DeathVisual } from "./death-animation";

type DeathSnapshot =
  | { kind: "enemy"; actor: Enemy }
  | { kind: "player"; actor: GameEngine["player"]; bear: boolean };

interface SpriteMotion {
  pose: ActorPose;
  rig: AnimationRig;
  creature?: boolean;
  priority?: boolean;
}

const hash = (x: number, y: number) => {
  let n =
    Math.imul(x ^ 0x9e3779b9, 1597334677) ^
    Math.imul(y ^ 0x85ebca6b, 3812015801);
  n = Math.imul(n ^ (n >>> 16), 2246822507);
  return (n >>> 0) / 4294967295;
};
export class GameRenderer {
  ctx: CanvasRenderingContext2D;
  width = 1280;
  height = 720;
  scale = 1;
  particles = true;
  shake = true;
  animation = true;
  private animator = new ActorAnimator();
  private combatAnimator = new CombatAnimator();
  private creatureCombatAnimator = new CreatureCombatAnimator();
  private deathAnimator = new DeathAnimator<DeathSnapshot>();
  private frameCache = new FrameCache<HTMLCanvasElement>(192, 2, (frame) => {
    frame.width = frame.height = 0;
  });
  private creatureCache = new QueuedFrameCache<HTMLCanvasElement>(
    128,
    1,
    (frame) => {
      frame.width = frame.height = 0;
    },
  );
  private reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  private worldAtlas = new Image();
  private heroAtlas = new Image();
  private heroBackAtlas = new Image();
  private companionAtlas = new Image();
  private travelAtlas = new Image();
  private ragefireAtlas = new Image();
  private shadowfangAtlas = new Image();
  private duskwoodAtlas = new Image();
  private creatureAtlases = {
    world: this.worldAtlas,
    ragefire: this.ragefireAtlas,
    shadowfang: this.shadowfangAtlas,
    duskwood: this.duskwoodAtlas,
  };
  private ground: CanvasPattern | null = null;
  constructor(
    public canvas: HTMLCanvasElement,
    public game: GameEngine,
  ) {
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.worldAtlas.src = "/art/world-sprites.png";
    this.heroAtlas.src = "/art/hero-sprites.png";
    this.heroBackAtlas.src = "/art/hero-backs.png";
    this.companionAtlas.src = "/art/companions.png";
    this.travelAtlas.src = "/art/travel-sprites.png";
    this.ragefireAtlas.src = "/art/ragefire-sprites.png";
    this.shadowfangAtlas.src = "/art/shadowfang-sprites.png";
    this.duskwoodAtlas.src = "/art/duskwood-sprites.png";
    this.prepareGround();
    this.resize();
  }
  async ready(): Promise<boolean> {
    await Promise.allSettled([
      this.worldAtlas.decode(),
      this.heroAtlas.decode(),
      this.heroBackAtlas.decode(),
      this.companionAtlas.decode(),
      this.travelAtlas.decode(),
      this.ragefireAtlas.decode(),
      this.shadowfangAtlas.decode(),
      this.duskwoodAtlas.decode(),
    ]);
    return (
      this.worldAtlas.naturalWidth > 0 &&
      this.heroAtlas.naturalWidth > 0 &&
      this.companionAtlas.naturalWidth > 0 &&
      this.travelAtlas.naturalWidth > 0 &&
      this.ragefireAtlas.naturalWidth > 0 &&
      this.shadowfangAtlas.naturalWidth > 0 &&
      this.duskwoodAtlas.naturalWidth > 0
    );
  }
  private prepareGround() {
    const tile = document.createElement("canvas");
    tile.width = tile.height = 512;
    const c = tile.getContext("2d")!,
      colors = this.game.zone.palette;
    c.fillStyle = colors[0];
    c.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1600; i++) {
      const x = Math.floor(hash(i, 71) * 256) * 2,
        y = Math.floor(hash(i, 93) * 256) * 2;
      c.globalAlpha = 0.06 + hash(i, 48) * 0.12;
      c.fillStyle = i % 2 ? colors[1] : colors[2];
      c.fillRect(x, y, 4 + hash(i, 62) * 15, 2 + hash(i, 25) * 9);
    }
    c.globalAlpha = 0.3;
    c.fillStyle = colors[3];
    for (let i = 0; i < 270; i++) {
      const x = Math.floor(hash(i, 17) * 256) * 2,
        y = Math.floor(hash(i, 39) * 256) * 2;
      c.fillRect(x, y, 2, 3 + (i % 4));
      if (i % 3 === 0) c.fillRect(x + 4, y + 2, 2, 4);
    }
    c.globalAlpha = 0.22;
    c.fillStyle = colors[4];
    for (let i = 0; i < 27; i++)
      c.fillRect(hash(i, 64) * 510, hash(i, 54) * 510, 3, 2);
    this.ground = this.ctx.createPattern(tile, "repeat");
  }
  private sprite(
    atlas: HTMLImageElement,
    index: number,
    columns: number,
    x: number,
    y: number,
    size: number,
    mirror = false,
    motion?: SpriteMotion,
  ): boolean {
    if (!atlas.complete || !atlas.naturalWidth) return false;
    const c = this.ctx,
      cellWidth = atlas.naturalWidth / columns;
    const creatureAtlas =
      atlas === this.worldAtlas
        ? "world"
        : atlas === this.ragefireAtlas
          ? "ragefire"
          : atlas === this.shadowfangAtlas
            ? "shadowfang"
            : atlas === this.duskwoodAtlas
              ? "duskwood"
              : null;
    const crop = creatureAtlas
      ? creatureCrop(
          creatureAtlas,
          index,
          atlas.naturalWidth,
          atlas.naturalHeight,
        )
      : atlas === this.heroBackAtlas
        ? backHeroCrop(index, atlas.naturalWidth, atlas.naturalHeight)
        : atlas === this.heroAtlas
          ? heroCrop(index, atlas.naturalWidth, atlas.naturalHeight)
          : {
              x: (index % columns) * cellWidth,
              y: (Math.floor(index / columns) * atlas.naturalHeight) / 2,
              width: cellWidth,
              height: atlas.naturalHeight / 2,
            };
    const measured =
      creatureAtlas === "shadowfang" || creatureAtlas === "duskwood";
    const drawWidth = measured ? (size * crop.width) / cellWidth : size,
      drawHeight = measured ? (size * crop.height) / cellWidth : size;
    c.save();
    c.translate(Math.round(x), Math.round(y));
    if (mirror) c.scale(-1, 1);
    c.imageSmoothingEnabled = true;
    this.drawCrop(
      atlas,
      crop,
      drawWidth,
      drawHeight,
      -drawHeight * 0.95,
      motion,
    );
    c.restore();
    return true;
  }
  private get motionEnabled() {
    return this.animation && !this.reducedMotion.matches;
  }
  private get suspended() {
    const g = this.game;
    return (
      g.paused || g.choosing || !!g.shrineChoice || g.checkpoint || g.ended
    );
  }
  onAction(action: CombatAction) {
    if (!this.motionEnabled) {
      this.combatAnimator.clear(action.actor);
      return;
    }
    this.combatAnimator.trigger(
      action.actor,
      combatStyle(action),
      action.time,
      action.facing,
      action.ability ? 1 : 0,
    );
  }
  onEnemyAction(action: EnemyAction) {
    if (!this.motionEnabled) this.creatureCombatAnimator.clear(action.actor);
    else this.creatureCombatAnimator.trigger(action);
  }
  onDeath(action: DeathAction) {
    if (![action.time, action.actor.x, action.actor.y].every(Number.isFinite))
      return;
    const g = this.game;
    this.deathAnimator.advance(0, {
      time: g.time,
      stage: g.dungeonStageIndex,
      enabled: this.motionEnabled,
    });
    if (action.kind === "enemy") {
      this.creatureCombatAnimator.clear(action.actor);
      const mirror = this.pose(
        action.actor,
        44,
        action.actor.x > g.player.x,
        true,
      ).mirror;
      this.deathAnimator.trigger(
        action.actor,
        {
          kind: "enemy",
          actor: {
            ...action.actor,
            dots: undefined,
            flash: 0,
            frozenUntil: 0,
            guard: false,
          },
        },
        { mirror, priority: action.actor.boss, enabled: this.motionEnabled },
      );
    } else {
      this.combatAnimator.clear(action.actor);
      this.deathAnimator.trigger(
        action.actor,
        { kind: "player", actor: { ...action.actor }, bear: action.bear },
        {
          mirror: Math.cos(action.actor.facing) < -0.2,
          hero: true,
          enabled: this.motionEnabled,
        },
      );
    }
  }
  private deathRig(data: DeathSnapshot): AnimationRig {
    return data.kind === "enemy"
      ? CREATURE_ART[data.actor.type]?.rig || "heavy"
      : data.bear
        ? "quadruped"
        : ["mage", "priest", "warlock", "druid"].includes(this.game.classDef.id)
          ? "robe"
          : "biped";
  }
  private death(entry: DeathScene<DeathSnapshot>) {
    const { data } = entry,
      c = this.ctx;
    const visual = deathVisual(
      entry.age,
      this.deathRig(data),
      entry.mirror,
      data.kind === "player",
    );
    c.save();
    c.globalAlpha *= visual.alpha;
    const size =
      data.kind === "enemy"
        ? data.actor.boss
          ? 2.1
          : data.actor.elite
            ? 1.5
            : 1
        : data.bear
          ? 1.5
          : 1;
    this.shadow(data.actor.x, data.actor.y, 19 * size);
    c.translate(data.actor.x, data.actor.y);
    c.translate(0, visual.drop);
    c.rotate(visual.rotation);
    c.scale(visual.scaleX, visual.scaleY);
    c.translate(-data.actor.x, -data.actor.y);
    if (data.kind === "enemy") this.enemy(data.actor, visual);
    else this.player(visual, data.actor, data.bear);
    c.restore();
  }
  private creaturePose(e: Enemy, stride: number): ActorPose {
    const frozen = e.frozenUntil > this.game.time;
    const walk = this.pose(
      e,
      stride,
      e.x > this.game.player.x,
      frozen,
      (e.id % 8) / 8,
    );
    const action = this.creatureCombatAnimator.sample(e, this.game.time, {
      enabled: this.motionEnabled,
      frozen: frozen || this.suspended,
    });
    return action
      ? { ...walk, frame: action.frame, mirror: action.mirror }
      : walk;
  }
  private characterPose(
    actor: object & Vec,
    stride = 44,
    mirror = false,
  ): ActorPose {
    const walk = this.pose(actor, stride, mirror);
    if (this.game.travelling) this.combatAnimator.clear(actor);
    const action = this.combatAnimator.sample(actor, this.game.time, {
      enabled: this.motionEnabled,
      frozen: this.suspended,
    });
    return action
      ? { ...walk, frame: action.frame, mirror: action.mirror }
      : walk;
  }
  private pose(
    actor: object & Vec,
    stride = 44,
    mirror = false,
    frozen = false,
    phaseOffset = 0,
  ) {
    const g = this.game;
    return this.animator.sample(actor, actor, g.time, {
      enabled: this.motionEnabled,
      frozen: frozen || this.suspended,
      stride,
      mirror,
      phaseOffset,
    });
  }
  private drawCrop(
    atlas: HTMLImageElement,
    crop: SpriteCrop,
    width: number,
    height: number,
    top: number,
    motion?: SpriteMotion,
  ) {
    let frame: HTMLCanvasElement | null = null;
    if (motion && motion.pose.frame >= 0) {
      const key = `${atlas.src}:${crop.x}:${crop.y}:${crop.width}:${crop.height}:${motion.rig}:${motion.pose.frame}`,
        create = () =>
          createAnimationFrame(atlas, crop, motion.rig, motion.pose.frame);
      frame = motion.creature
        ? this.creatureCache.get(key, create, motion.priority)
        : this.frameCache.get(key, create);
    }
    if (frame) {
      this.ctx.drawImage(
        frame,
        -width / 2 - (width * FRAME_PADDING) / FRAME_CONTENT,
        top - (height * FRAME_PADDING) / FRAME_CONTENT,
        (width * FRAME_SIZE) / FRAME_CONTENT,
        (height * FRAME_SIZE) / FRAME_CONTENT,
      );
    } else {
      const cutout = crop.cutout;
      if (cutout) {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(-width / 2, top, width, height);
        this.ctx.rect(
          -width / 2 + cutout.x * width,
          top + cutout.y * height,
          cutout.width * width,
          cutout.height * height,
        );
        this.ctx.clip("evenodd");
      }
      this.ctx.drawImage(
        atlas,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        -width / 2,
        top,
        width,
        height,
      );
      if (cutout) this.ctx.restore();
    }
  }
  resize() {
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
    this.game.setViewport(this.width, this.height);
  }
  render(delta = 0) {
    const state = this.game;
    this.deathAnimator.advance(delta, {
      time: state.time,
      stage: state.dungeonStageIndex,
      enabled: this.motionEnabled,
      held:
        state.paused ||
        state.choosing ||
        !!state.shrineChoice ||
        document.hidden ||
        !document.hasFocus(),
    });
    this.frameCache.beginFrame();
    if (this.motionEnabled) this.creatureCache.beginFrame();
    else this.creatureCache.cancelPending();
    const c = this.ctx,
      g = this.game,
      p = g.player;
    c.fillStyle = g.zone.palette[0];
    c.fillRect(0, 0, this.width, this.height);
    c.save();
    let dx = 0,
      dy = 0;
    if (this.shake && p.hurt > 0) {
      dx = Math.sin(g.time * 130) * p.hurt * 12;
      dy = Math.cos(g.time * 145) * p.hurt * 8;
    }
    c.translate(
      Math.round(
        this.width / 2 -
          (g.partner ? (p.x + g.partner.player.x) / 2 : p.x) +
          dx,
      ),
      Math.round(
        this.height / 2 -
          (g.partner ? (p.y + g.partner.player.y) / 2 : p.y) +
          dy,
      ),
    );
    this.terrain();
    for (const a of g.areas) {
      c.globalAlpha = 0.12 + Math.sin(g.time * 5) * 0.03;
      c.fillStyle = a.color;
      c.beginPath();
      c.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 0.45;
      c.strokeStyle = a.color;
      c.lineWidth = 1;
      c.stroke();
      if (this.particles)
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + g.time * 0.5,
            r = a.radius * hash(i, Math.floor(g.time * 2));
          c.fillRect(
            a.x + Math.cos(angle) * r,
            a.y + Math.sin(angle) * r,
            3,
            5,
          );
        }
      c.globalAlpha = 1;
    }
    for (const h of g.hazards) this.telegraph(h);
    for (const l of g.landmarks) {
      if (
        l.kind !== "ritual" ||
        l.state === "complete" ||
        !this.visible(l, 200)
      )
        continue;
      c.strokeStyle = l.state === "active" ? "#b1cd9988" : "#afbf8b33";
      c.fillStyle = l.state === "active" ? "#9abd7212" : "#9abd7206";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(l.x, l.y, 175, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      if (l.state === "active") {
        c.strokeStyle = "#c0dba6";
        c.lineWidth = 4;
        c.beginPath();
        c.arc(
          l.x,
          l.y,
          175,
          -Math.PI / 2,
          -Math.PI / 2 + (Math.PI * 2 * l.progress) / 20,
        );
        c.stroke();
      }
    }
    const gatheringTarget = g.gatheringOpen ? g.gatheringTarget : null;
    for (const n of g.nodes) {
      if (n.depleted || !this.visible(n, 80)) continue;
      c.save();
      c.translate(n.x, n.y);
      const renderedSprite =
        MATERIALS[n.kind].family !== "fish" &&
        this.sprite(
          this.worldAtlas,
          MATERIALS[n.kind].family === "herbs" ? 7 : 6,
          4,
          0,
          8,
          MATERIALS[n.kind].family === "herbs" ? 42 : 48,
        );
      if (MATERIALS[n.kind].family === "herbs" && !renderedSprite) {
        c.strokeStyle = "#829765";
        c.lineWidth = 3;
        for (let i = 0; i < 5; i++) {
          c.beginPath();
          c.moveTo(0, 8);
          c.lineTo((i - 2) * 6, -12 - Math.abs(i - 2) * 3);
          c.stroke();
          c.fillStyle = i % 2 ? "#f0d6ad" : "#d1d8a1";
          c.fillRect((i - 2) * 6 - 3, -17 - Math.abs(i - 2) * 3, 6, 6);
        }
      } else if (MATERIALS[n.kind].family === "ore" && !renderedSprite) {
        c.fillStyle = "#4e5550";
        c.beginPath();
        c.moveTo(-21, 8);
        c.lineTo(-14, -12);
        c.lineTo(4, -20);
        c.lineTo(18, -7);
        c.lineTo(24, 8);
        c.closePath();
        c.fill();
        c.fillStyle = "#c69b6d";
        c.fillRect(-10, -11, 7, 5);
        c.fillRect(4, -8, 8, 4);
        c.fillRect(-2, 1, 5, 5);
      } else if (MATERIALS[n.kind].family === "fish") {
        c.fillStyle = "#234950";
        c.beginPath();
        c.ellipse(0, 3, 48, 28, -0.2, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = "#577c77";
        c.lineWidth = 2;
        c.stroke();
        c.strokeStyle = "#91b6a340";
        c.beginPath();
        c.ellipse(7, 3, 15 + Math.sin(g.time * 2) * 3, 5, 0, 0, Math.PI * 2);
        c.stroke();
      }
      if (Math.hypot(n.x - p.x, n.y - p.y) < 110) {
        c.fillStyle = MATERIALS[n.kind].color;
        c.font = "11px sans-serif";
        c.textAlign = "center";
        c.fillText(MATERIALS[n.kind].name, 0, -45);
        c.font = "9px sans-serif";
        c.fillStyle = g.nodeRestriction(n) ? "#d0a086" : "#a4ba98";
        c.fillText(
          g.nodeRestriction(n) ||
            "+" + g.nodePractice(n) + " skill · walk close",
          0,
          -32,
        );
      }
      const tier = MATERIALS[n.kind].tier;
      if (tier > 1 || gatheringTarget?.id === n.id) {
        c.strokeStyle = MATERIALS[n.kind].color;
        c.lineWidth = 1.5;
        c.beginPath();
        c.ellipse(0, 10, 23, 12, 0, 0, Math.PI * 2);
        c.stroke();
        c.fillStyle = MATERIALS[n.kind].color;
        c.font = "10px sans-serif";
        c.textAlign = "center";
        c.fillText(RESOURCE_TIERS[tier - 1].label, 0, 30);
      }
      c.restore();
    }
    for (const item of g.pickups) {
      if (!this.visible(item, 30)) continue;
      const bob = Math.sin(g.time * 4 + item.x) * 2;
      c.save();
      c.translate(Math.round(item.x), Math.round(item.y + bob));
      if (item.kind === "xp") {
        c.fillStyle = item.value > 5 ? "#b695de" : "#79c9d7";
        c.beginPath();
        c.moveTo(0, -5);
        c.lineTo(4, 0);
        c.lineTo(0, 5);
        c.lineTo(-4, 0);
        c.closePath();
        c.fill();
        c.fillStyle = "#d6f0ed";
        c.fillRect(-1, -3, 2, 3);
      }
      if (item.kind === "gold") {
        c.fillStyle = "#cbaa5c";
        c.fillRect(-4, -4, 8, 8);
        c.fillStyle = "#f1dba0";
        c.fillRect(-3, -3, 2, 5);
      }
      if (item.kind === "heal") {
        c.fillStyle = "#ba7064";
        c.fillRect(-5, -3, 10, 6);
        c.fillRect(-3, -5, 6, 10);
      }
      if (item.kind === "chest") {
        c.fillStyle = "#745339";
        c.fillRect(-12, -9, 24, 18);
        c.fillStyle = "#d4b276";
        c.fillRect(-12, -3, 24, 3);
        c.fillRect(-10, -9, 3, 18);
        c.fillRect(7, -9, 3, 18);
        c.fillStyle = "#f5d7a1";
        c.fillRect(-2, -2, 4, 6);
        c.strokeStyle = "#e2bb7560";
        c.beginPath();
        c.arc(0, 0, 24 + Math.sin(g.time * 3) * 3, 0, Math.PI * 2);
        c.stroke();
      }
      c.restore();
    }
    const actors: { y: number; draw: () => void }[] = [];
    for (const l of g.landmarks)
      if (this.visible(l, 100))
        actors.push({ y: l.y, draw: () => this.landmark(l) });
    for (const e of g.enemies)
      if (!e.dead && this.visible(e, 80))
        actors.push({ y: e.y, draw: () => this.enemy(e) });
    for (const entry of this.deathAnimator.enemies)
      if (this.visible(entry.data.actor, 180))
        actors.push({ y: entry.data.actor.y, draw: () => this.death(entry) });
    for (const pet of g.pets)
      actors.push({
        y: pet.y,
        draw: () => {
          const pose = this.characterPose(
            pet,
            pet.spellId === "beast" ? 38 : 32,
            pet.x > p.x,
          );
          this.shadow(pet.x, pet.y, 15);
          if (
            this.sprite(
              this.companionAtlas,
              pet.spellId === "beast" ? 0 : pet.spellId === "imp" ? 1 : 3,
              2,
              pet.x,
              pet.y,
              pet.spellId === "beast" ? 53 : 46,
              pose.mirror,
              {
                pose,
                rig:
                  pet.spellId === "beast"
                    ? "quadruped"
                    : pet.spellId === "imp"
                      ? "biped"
                      : "totem",
              },
            )
          )
            return;
          if (pet.spellId === "beast")
            this.wolf(pet.x, pet.y, "#a2a598", 1, false, pose);
          else {
            this.shadow(pet.x, pet.y, 13);
            c.save();
            c.translate(pet.x, pet.y);
            if (pose.mirror) c.scale(-1, 1);
            this.combatFallback(pose.frame);
            c.fillStyle = pet.spellId === "imp" ? "#8dba68" : "#ca9a61";
            c.fillRect(-7, -17, 14, 23);
            c.fillStyle = "#d7e5ab";
            c.fillRect(-5, -14, 3, 3);
            c.fillRect(2, -14, 3, 3);
            c.fillStyle = "#e6bf6a";
            c.fillRect(-10, -22, 4, 7);
            c.fillRect(6, -22, 4, 7);
            c.restore();
          }
        },
      });
    const defeated = this.deathAnimator.hero;
    actors.push({
      y: p.y,
      draw: () =>
        defeated
          ? this.death(defeated)
          : p.hp <= 0 && g.partner
            ? this.player(
                deathVisual(
                  0.75,
                  ["mage", "priest", "warlock", "druid"].includes(g.classDef.id)
                    ? "robe"
                    : "biped",
                  Math.cos(p.facing) < -0.2,
                  true,
                ),
              )
            : this.player(),
    });
    if (g.partner) {
      const buddy = g.partner;
      actors.push({
        y: buddy.player.y,
        draw: () => {
          c.save();
          if (buddy.player.hp <= 0) c.globalAlpha = 0.45;
          this.player(
            buddy.player.hp <= 0
              ? deathVisual(
                  0.75,
                  ["mage", "priest", "warlock", "druid"].includes(
                    buddy.classDef.id,
                  )
                    ? "robe"
                    : "biped",
                  Math.cos(buddy.player.facing) < -0.2,
                  true,
                )
              : undefined,
            buddy.player,
            false,
            buddy.classDef,
          );
          c.restore();
          c.save();
          c.font = "600 12px sans-serif";
          c.textAlign = "center";
          c.fillStyle = "#a7d2eb";
          c.fillText(
            buddy.player.hp <= 0
              ? `P2 DOWN · ${Math.round((buddy.revive / 3) * 100)}%`
              : "P2",
            buddy.player.x,
            buddy.player.y - 85,
          );
          c.restore();
        },
      });
      if (buddy.pet)
        actors.push({
          y: buddy.pet.y,
          draw: () =>
            this.sprite(
              this.companionAtlas,
              buddy.pet!.spellId === "beast"
                ? 0
                : buddy.pet!.spellId === "imp"
                  ? 1
                  : 3,
              2,
              buddy.pet!.x,
              buddy.pet!.y,
              58,
              false,
              {
                pose: this.characterPose(buddy.pet!, 44, false),
                rig:
                  buddy.pet!.spellId === "beast"
                    ? "quadruped"
                    : buddy.pet!.spellId === "imp"
                      ? "biped"
                      : "totem",
              },
            ),
        });
    }
    this.props(actors);
    actors.sort((a, b) => a.y - b.y);
    for (const actor of actors) actor.draw();
    const orbitActors = [
      {
        player: g.player,
        spells: g.spells,
        bonuses: undefined,
        travelling: g.travelling,
      },
      ...(g.partner
        ? [
            {
              player: g.partner.player,
              spells: g.partner.spells,
              bonuses: g.partner.config.spellBonuses,
              travelling: false,
            },
          ]
        : []),
    ];
    for (const actor of orbitActors)
      for (const state of actor.spells)
        if (
          actor.player.hp > 0 &&
          !actor.travelling &&
          SPELLS[state.id].kind === "orbit"
        )
          for (const pos of g.orbitPositions(
            state,
            actor.player,
            actor.bonuses,
          )) {
            c.save();
            c.translate(pos.x, pos.y);
            c.rotate(g.time * 2);
            c.fillStyle = SPELLS[state.id].color;
            c.fillRect(-3, -12, 6, 23);
            c.fillStyle = "#f7ecd1";
            c.fillRect(-1, -10, 2, 17);
            c.restore();
          }
    for (const shot of g.projectiles) {
      if (!this.visible(shot, 20)) continue;
      c.strokeStyle = shot.color;
      c.lineWidth = shot.radius;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(shot.x - shot.vx * 0.025, shot.y - shot.vy * 0.025);
      c.lineTo(shot.x, shot.y);
      c.stroke();
      c.fillStyle = "#f0f1d9";
      c.fillRect(shot.x - 2, shot.y - 2, 4, 4);
    }
    c.lineCap = "butt";
    for (const fx of g.effects) {
      c.globalAlpha = fx.life / fx.maxLife;
      c.strokeStyle = fx.color;
      c.fillStyle = fx.color;
      if (fx.kind === "ring") {
        c.lineWidth = 3;
        c.beginPath();
        c.arc(
          fx.x,
          fx.y,
          fx.radius * (1 - (fx.life / fx.maxLife) * 0.5),
          0,
          Math.PI * 2,
        );
        c.stroke();
      }
      if (fx.kind === "line" && fx.end) {
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(fx.x, fx.y);
        c.lineTo((fx.x + fx.end.x) / 2 + 9, (fx.y + fx.end.y) / 2 - 9);
        c.lineTo(fx.end.x, fx.end.y);
        c.stroke();
      }
      if (fx.kind === "burst" && this.particles)
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2,
            r = fx.radius * (1 - fx.life / fx.maxLife);
          c.fillRect(
            fx.x + Math.cos(a) * r - 2,
            fx.y + Math.sin(a) * r - 2,
            4,
            4,
          );
        }
    }
    c.globalAlpha = 1;
    c.textAlign = "center";
    c.font = "bold 12px sans-serif";
    for (const t of g.texts) {
      c.globalAlpha = Math.min(1, t.life * 4);
      c.fillStyle = "#111912";
      c.fillText(t.value, t.x + 1, t.y + 1);
      c.fillStyle = t.color;
      c.fillText(t.value, t.x, t.y);
    }
    c.globalAlpha = 1;
    c.restore();
    if (this.particles) {
      c.fillStyle = "#d6d6a0";
      for (let i = 0; i < 30; i++) {
        c.globalAlpha = 0.1 + Math.sin(g.time + i) * 0.08;
        c.fillRect(
          (hash(i, 5) * this.width + Math.sin(g.time * 0.3 + i) * 20) %
            this.width,
          (hash(i, 10) * this.height -
            ((g.time * (2 + (i % 3))) % this.height) +
            this.height) %
            this.height,
          2,
          2,
        );
      }
      c.globalAlpha = 1;
    }
    const vignette = c.createRadialGradient(
      this.width / 2,
      this.height / 2,
      this.height * 0.25,
      this.width / 2,
      this.height / 2,
      Math.max(this.width, this.height) * 0.65,
    );
    vignette.addColorStop(0, "#09120b00");
    vignette.addColorStop(1, "#09120b99");
    c.fillStyle = vignette;
    c.fillRect(0, 0, this.width, this.height);
    this.minimap();
  }
  private cameraCenter() {
    const p = this.game.player,
      partner = this.game.partner?.player;
    return partner ? { x: (p.x + partner.x) / 2, y: (p.y + partner.y) / 2 } : p;
  }
  private visible(pos: Vec, margin = 50) {
    const center = this.cameraCenter();
    return (
      Math.abs(pos.x - center.x) < this.width / 2 + margin &&
      Math.abs(pos.y - center.y) < this.height / 2 + margin
    );
  }
  private terrain() {
    if (this.game.dungeonStage) {
      drawDungeonFloor(this.ctx, this.game, this.width, this.height);
      return;
    }
    const c = this.ctx,
      p = this.cameraCenter(),
      colors = this.game.zone.palette;
    c.fillStyle = this.ground || colors[0];
    c.fillRect(
      p.x - this.width / 2 - 8,
      p.y - this.height / 2 - 8,
      this.width + 16,
      this.height + 16,
    );
    // A winding trail keeps the starting area legible.
    c.strokeStyle =
      this.game.zone.id === "westfall" ? "#91734855" : "#88755644";
    c.lineWidth = 70;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(-850, -300);
    c.bezierCurveTo(-450, -200, -400, 80, 0, 50);
    c.bezierCurveTo(450, 0, 500, 370, 1100, 300);
    c.stroke();
    c.lineCap = "butt";
    c.strokeStyle = "#dfc58a80";
    c.lineWidth = 4;
    c.strokeRect(-WORLD_SIZE, -WORLD_SIZE, WORLD_SIZE * 2, WORLD_SIZE * 2);
    if (this.visible({ x: 0, y: 100 }, 100)) {
      if (this.sprite(this.worldAtlas, 4, 4, 0, 112, 67)) {
        this.sprite(this.worldAtlas, 5, 4, -95, 100, 98);
        const glow = c.createRadialGradient(0, 92, 8, 0, 92, 100);
        glow.addColorStop(0, "#eeb75f30");
        glow.addColorStop(1, "#eeb75f00");
        c.fillStyle = glow;
        c.fillRect(-100, -8, 200, 200);
        return;
      }
      this.shadow(0, 100, 38);
      c.fillStyle = "#625546";
      c.fillRect(-21, 98, 42, 5);
      c.fillRect(-15, 93, 30, 5);
      c.fillStyle = "#d49650";
      c.beginPath();
      c.moveTo(-10, 97);
      c.lineTo(-6, 80);
      c.lineTo(0, 84);
      c.lineTo(6, 70 + Math.sin(this.game.time * 7) * 4);
      c.lineTo(12, 97);
      c.fill();
      c.fillStyle = "#f4d490";
      c.fillRect(-3, 86, 6, 13);
      const glow = c.createRadialGradient(0, 92, 8, 0, 92, 90);
      glow.addColorStop(0, "#eeb75f30");
      glow.addColorStop(1, "#eeb75f00");
      c.fillStyle = glow;
      c.fillRect(-90, 2, 180, 180);
    }
  }
  private props(actors: { y: number; draw: () => void }[]) {
    if (this.game.dungeonStage) return;
    const p = this.cameraCenter(),
      minX = Math.floor((p.x - this.width / 2 - 100) / 180),
      maxX = Math.ceil((p.x + this.width / 2 + 100) / 180),
      minY = Math.floor((p.y - this.height / 2 - 100) / 180),
      maxY = Math.ceil((p.y + this.height / 2 + 150) / 180);
    for (let x = minX; x <= maxX; x++)
      for (let y = minY; y <= maxY; y++) {
        const h = hash(x + 20, y + 13);
        if (h < 0.4 || (Math.abs(x) <= 1 && Math.abs(y) <= 1)) continue;
        const px = x * 180 + hash(x, y) * 110,
          py = y * 180 + hash(y, x) * 100;
        actors.push({
          y: py,
          draw: () => {
            const c = this.ctx;
            c.save();
            c.translate(px, py);
            const proximity = Math.hypot(px - p.x, py - 60 - p.y);
            c.globalAlpha = proximity < 100 && p.y < py ? 0.35 : 0.92;
            const index =
              h > 0.91
                ? 3
                : this.game.zone.id === "tirisfal" ||
                    (this.game.zone.id === "duskwood" && h < 0.7) ||
                    (this.game.zone.id === "westfall" && h < 0.75)
                  ? 2
                  : h < 0.7
                    ? 0
                    : 1;
            if (
              this.sprite(
                this.worldAtlas,
                index,
                4,
                0,
                8,
                index === 3 ? 74 : 165 + h * 20,
              )
            ) {
              c.restore();
              return;
            }
            if (this.game.zone.id === "westfall" && h < 0.72) {
              this.shadow(0, 0, 22);
              c.fillStyle = "#9d8d58";
              for (let i = 0; i < 7; i++) {
                c.fillRect(-18 + i * 6, -15 - (i % 3) * 4, 3, 18);
                c.fillStyle = i % 2 ? "#bba269" : "#9d8d58";
              }
            } else if (h > 0.91) {
              this.shadow(0, 0, 26);
              c.fillStyle = "#596058";
              c.fillRect(-23, -12, 46, 14);
              c.fillRect(-15, -25, 29, 15);
              c.fillStyle = "#7b8171";
              c.fillRect(-14, -23, 22, 5);
            } else this.tree(h);
            c.restore();
          },
        });
      }
  }
  private tree(h: number) {
    const c = this.ctx,
      colors = this.game.zone.palette;
    this.shadow(0, 3, 34);
    c.fillStyle = "#4d4635";
    c.fillRect(-7, -65, 14, 68);
    c.fillStyle = "#6a5b43";
    c.fillRect(-5, -57, 4, 60);
    const palettes =
      this.game.zone.id === "tirisfal"
        ? ["#172c2d", "#253d3b", "#34504b"]
        : ["#1b3524", "#284a2d", "#3e5c36"];
    for (let i = 0; i < 3; i++) {
      const cy = -38 - i * 26,
        w = 44 - i * 8;
      c.fillStyle = palettes[i];
      c.beginPath();
      c.moveTo(-w, cy);
      c.lineTo(-w + 10, cy - 16);
      c.lineTo(-w + 3, cy - 16);
      c.lineTo(0, cy - 63);
      c.lineTo(w - 3, cy - 16);
      c.lineTo(w - 10, cy - 16);
      c.lineTo(w, cy);
      c.closePath();
      c.fill();
      c.fillStyle = `${colors[3]}66`;
      c.fillRect(-w + 17, cy - 9, w / 2, 3);
    }
    if (h > 0.8) {
      c.fillStyle = "#bfa175";
      c.fillRect(-25, 0, 8, 4);
      c.fillRect(-23, 4, 3, 5);
    }
  }
  private shadow(x: number, y: number, radius: number) {
    const c = this.ctx;
    c.fillStyle = "#0b170e60";
    c.beginPath();
    c.ellipse(x, y + 5, radius, radius * 0.35, 0, 0, Math.PI * 2);
    c.fill();
  }
  private player(
    death?: DeathVisual,
    snapshot = this.game.player,
    bear = false,
    classDef: ClassDef = this.game.classDef,
  ) {
    const c = this.ctx,
      p = snapshot,
      g = this.game;
    const pose =
      death ||
      this.characterPose(
        p,
        snapshot === g.player && g.travel.active ? 76 : 44,
        Math.cos(p.facing) < -0.2,
      );
    if (!death)
      this.shadow(p.x, p.y, snapshot === g.player && g.travel.active ? 30 : 19);
    c.save();
    c.translate(Math.round(p.x), Math.round(p.y));
    if (!death && p.invulnerable > 0 && Math.floor(g.time * 12) % 2)
      c.globalAlpha = 0.6;
    if (!death && (p.shield > 0 || p.invulnerable > 1)) {
      c.strokeStyle = "#e3d4a888";
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(0, -15, 29, 35, 0, 0, Math.PI * 2);
      c.stroke();
    }
    if (!death && snapshot === g.player && g.travel.channel > 0) {
      c.strokeStyle = "#d8bd83aa";
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(0, 3, 25, 10, 0, 0, Math.PI * 2);
      c.stroke();
    }
    if (
      !death &&
      snapshot === g.player &&
      g.travel.active &&
      g.travelOption &&
      this.travelAtlas.complete &&
      this.travelAtlas.naturalWidth
    ) {
      const t = g.travelOption,
        mirror = Math.cos(p.facing) < -0.2;
      const gait = WALK_KEYS[pose.frame];
      const bob = gait ? -gait.bob * 1.2 : 0;
      if (t.rank === 2) {
        c.shadowColor = "#d7b67c66";
        c.shadowBlur = 8;
      }
      const size = t.kind === "form" ? 89 : 105;
      const cw = this.travelAtlas.naturalWidth / 3,
        ch = this.travelAtlas.naturalHeight / 3;
      const height = (size * ch) / cw;
      c.save();
      if (mirror) c.scale(-1, 1);
      c.imageSmoothingEnabled = true;
      this.drawCrop(
        this.travelAtlas,
        {
          x: (t.sprite % 3) * cw,
          y: Math.floor(t.sprite / 3) * ch,
          width: cw,
          height: ch,
        },
        size,
        height,
        -height + 8,
        { pose, rig: "quadruped" },
      );
      c.restore();
      c.shadowBlur = 0;
      if (
        t.kind !== "form" &&
        this.heroAtlas.complete &&
        this.heroAtlas.naturalWidth
      ) {
        const back =
            Math.sin(p.facing) < -0.35 && this.heroBackAtlas.naturalWidth,
          atlas = back ? this.heroBackAtlas : this.heroAtlas,
          crop = (back ? backHeroCrop : heroCrop)(
            classDef.portrait,
            atlas.naturalWidth,
            atlas.naturalHeight,
          );
        c.save();
        if (mirror) c.scale(-1, 1);
        c.imageSmoothingEnabled = true;
        // Crop the standing sprite to its upper body for a seated rider.
        c.translate(-4.5, 0);
        this.drawCrop(
          atlas,
          {
            ...crop,
            height: crop.height * 0.73,
            ...(crop.cutout
              ? {
                  cutout: {
                    ...crop.cutout,
                    y: crop.cutout.y / 0.73,
                    height: crop.cutout.height / 0.73,
                  },
                }
              : {}),
          },
          53,
          (crop.height / crop.width) * 53 * 0.73,
          -73 + bob,
        );
        c.restore();
      }
      c.restore();
      return;
    }
    if (death ? bear : classDef.id === "druid" && p.activeBuff > 0) {
      if (
        this.sprite(this.companionAtlas, 2, 2, 0, 0, 83, pose.mirror, {
          pose,
          rig: "quadruped",
        })
      ) {
        c.restore();
        return;
      }
      this.wolf(0, 0, "#927b55", 1.5, false, pose, !death);
      c.restore();
      return;
    }
    if (
      this.sprite(
        Math.sin(p.facing) < -0.35 && this.heroBackAtlas.naturalWidth
          ? this.heroBackAtlas
          : this.heroAtlas,
        classDef.portrait,
        3,
        0,
        0,
        70,
        pose.mirror,
        {
          pose,
          rig: ["mage", "priest", "warlock", "druid"].includes(classDef.id)
            ? "robe"
            : "biped",
        },
      )
    ) {
      c.restore();
      return;
    }
    if (pose.mirror) c.scale(-1, 1);
    this.combatFallback(pose.frame);
    const move = WALK_KEYS[pose.frame]?.left
      ? WALK_KEYS[pose.frame].left * 3
      : 0;
    const skin = ["shaman"].includes(classDef.id)
      ? "#91ab70"
      : classDef.id === "druid"
        ? "#b396bf"
        : classDef.id === "warlock"
          ? "#a7aea0"
          : "#d8bb97";
    c.fillStyle = "#342f26";
    c.fillRect(-10, -2 + move, 7, 9);
    c.fillRect(3, -2 - move, 7, 9);
    c.fillStyle = "#24353a";
    c.fillRect(-11, -29, 22, 28);
    c.fillStyle = classDef.color;
    c.fillRect(-11, -29, 22, 19);
    c.fillRect(-15, -26, 6, 13);
    c.fillRect(9, -26, 6, 13);
    c.fillStyle = "#ffffff22";
    c.fillRect(-10, -27, 6, 17);
    c.fillStyle = "#1e2c2d";
    c.fillRect(-11, -10, 22, 4);
    c.fillStyle = skin;
    c.fillRect(-8, -40, 16, 14);
    c.fillStyle = "#433b32";
    c.fillRect(-9, -42, 18, 5);
    if (["mage", "warlock", "priest", "rogue"].includes(classDef.id)) {
      c.fillStyle = classDef.color;
      c.fillRect(-11, -44, 22, 6);
      c.fillRect(-11, -38, 4, 14);
      c.fillRect(7, -38, 4, 14);
    }
    if (classDef.id === "druid") {
      c.fillStyle = "#bcb283";
      c.fillRect(-11, -49, 3, 10);
      c.fillRect(8, -49, 3, 10);
      c.fillRect(-16, -48, 6, 3);
      c.fillRect(10, -48, 6, 3);
    }
    c.fillStyle = "#262d26";
    c.fillRect(-5, -35, 3, 2);
    c.fillRect(3, -35, 3, 2);
    c.fillStyle = "#a1885a";
    c.fillRect(16, -33, 3, 32);
    c.fillStyle = classDef.color;
    if (["warrior", "paladin", "rogue"].includes(classDef.id)) {
      c.fillStyle = "#d4d9c7";
      c.fillRect(15, -40, 6, 25);
      c.fillStyle = "#c1a673";
      c.fillRect(12, -16, 12, 3);
    } else if (classDef.id === "hunter") {
      c.strokeStyle = "#cfbe8b";
      c.lineWidth = 3;
      c.beginPath();
      c.arc(14, -18, 17, -1.2, 1.2);
      c.stroke();
    } else {
      c.beginPath();
      c.arc(17, -36, 6, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#ebedd9";
      c.fillRect(15, -39, 3, 3);
    }
    c.restore();
  }
  private wolf(
    x: number,
    y: number,
    color: string,
    scale: number,
    flash: boolean,
    pose: ActorPose,
    shadow = true,
  ) {
    const c = this.ctx;
    if (shadow) this.shadow(x, y, 17 * scale);
    if (
      this.sprite(this.worldAtlas, 8, 4, x, y, 51 * scale, pose.mirror, {
        pose,
        rig: "quadruped",
      })
    )
      return;
    c.save();
    c.translate(Math.round(x), Math.round(y));
    if (pose.mirror) c.scale(-1, 1);
    c.scale(scale, scale);
    this.combatFallback(pose.frame);
    c.fillStyle = flash ? "#f1ecdc" : color;
    c.fillRect(-15, -16, 26, 13);
    c.fillRect(5, -24, 15, 16);
    c.fillRect(16, -16, 9, 5);
    c.fillRect(7, -30, 4, 8);
    c.fillRect(15, -28, 4, 7);
    const step = (WALK_KEYS[pose.frame]?.left || 0) * 2;
    c.fillRect(-13, -4, 5, 8 + step);
    c.fillRect(5, -4, 5, 8 - step);
    c.fillRect(-24, -19, 12, 5);
    c.fillStyle = "#dfc484";
    c.fillRect(15, -20, 3, 3);
    c.restore();
  }
  private combatFallback(frame: number) {
    const key = combatKey(frame);
    if (!key) return;
    this.ctx.translate(key.lean * 1.5, -key.raise);
    this.ctx.rotate(key.reach * 0.035);
  }
  private enemy(e: Enemy, death?: DeathVisual) {
    const c = this.ctx,
      scale = e.boss ? 2.1 : e.elite ? 1.5 : 1;
    const color =
      {
        wolf: "#929989",
        kobold: "#ae9771",
        gnoll: "#ad855b",
        defias: "#ac7261",
        golem: "#8d8e70",
        skeleton: "#c5c3a5",
        ghoul: "#88a080",
        wraith: "#9a95b6",
      }[e.type] || "#b4a888";
    const art = CREATURE_ART[e.type];
    const pose = death || this.creaturePose(e, (art?.stride || 44) * scale);
    if (!death) this.shadow(e.x, e.y, 15 * scale);
    const atlas = art && this.creatureAtlases[art.atlas];
    const renderedSprite =
      art &&
      atlas &&
      this.sprite(
        atlas,
        art.index,
        art.atlas === "world" ? 4 : 3,
        e.x,
        e.y,
        art.size * scale,
        pose.mirror,
        {
          pose,
          rig: art.rig,
          creature: true,
          priority: e.boss && pose.frame >= 8,
        },
      );
    if (renderedSprite) {
      if (e.flash > 0) {
        c.globalAlpha = 0.3;
        c.fillStyle = "#f6e6bc";
        c.beginPath();
        c.arc(e.x, e.y - 20 * scale, 15 * scale, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = 1;
      }
    } else if (e.type === "smite") drawSmite(c, e, pose);
    else if (e.type === "wolf")
      this.wolf(e.x, e.y, color, scale, e.flash > 0, pose, !death);
    else {
      if (!death) this.shadow(e.x, e.y, 15 * scale);
      c.save();
      c.translate(Math.round(e.x), Math.round(e.y));
      if (pose.mirror) c.scale(-1, 1);
      c.scale(scale, scale);
      this.combatFallback(pose.frame);
      c.fillStyle = e.flash > 0 ? "#f3ead5" : color;
      const step = (WALK_KEYS[pose.frame]?.left || 0) * 2;
      c.fillRect(-9, -21, 18, 19);
      c.fillRect(-12, -20, 5, 13);
      c.fillRect(7, -20, 5, 13);
      c.fillRect(-8, -3, 5, 8 + step);
      c.fillRect(3, -3, 5, 8 - step);
      c.fillRect(-8, -34, 16, 15);
      c.fillStyle = "#16251d";
      c.fillRect(-5, -28, 3, 3);
      c.fillRect(3, -28, 3, 3);
      if (e.type === "skeleton") {
        c.fillStyle = "#1a2b2544";
        for (let i = 0; i < 3; i++) c.fillRect(-7, -18 + i * 4, 14, 2);
        c.fillRect(-4, -23, 8, 2);
      }
      if (e.type === "gnoll" || e.type === "kobold") {
        c.fillStyle = "#c6b088";
        c.fillRect(-11, -32, 4, 5);
        c.fillRect(7, -32, 4, 5);
        c.fillRect(-4, -24, 8, 6);
        c.fillStyle = "#363b2c";
        c.fillRect(-2, -23, 4, 3);
      }
      if (e.type === "kobold") {
        c.fillStyle = "#e4c885";
        c.fillRect(-2, -41, 4, 7);
        c.fillStyle = "#f0e4a9";
        c.fillRect(-1, -44, 2, 4);
      }
      if (e.type === "defias") {
        c.fillStyle = "#6c3436";
        c.fillRect(-9, -36, 18, 6);
        c.fillRect(-9, -29, 18, 3);
      }
      if (e.type === "wraith") {
        c.fillStyle = "#7b849744";
        c.beginPath();
        c.moveTo(-15, -18);
        c.lineTo(-19, 8);
        c.lineTo(0, 0);
        c.lineTo(19, 8);
        c.lineTo(15, -18);
        c.fill();
      }
      if (e.type === "golem") {
        c.fillStyle = "#bbb28e";
        c.fillRect(-8, -20, 16, 4);
        c.fillRect(-8, -10, 16, 3);
      }
      c.restore();
    }
    if (death) return;
    if (e.frozenUntil > this.game.time) {
      c.strokeStyle = "#a4e6ef";
      c.lineWidth = 2;
      c.strokeRect(
        e.x - e.radius - 4,
        e.y - e.radius * 2.4,
        e.radius * 2 + 8,
        e.radius * 2.7,
      );
    }
    if (e.guard) {
      c.fillStyle = "#f2d38d";
      c.beginPath();
      c.moveTo(e.x, e.y - 78);
      c.lineTo(e.x + 6, e.y - 72);
      c.lineTo(e.x, e.y - 66);
      c.lineTo(e.x - 6, e.y - 72);
      c.closePath();
      c.fill();
    }
    const dotIds = Object.keys(e.dots || {}).slice(0, 4);
    for (const [i, id] of dotIds.entries()) {
      c.fillStyle = SPELLS[id]?.color || "#d8a08b";
      c.beginPath();
      c.arc(
        e.x + (i - (dotIds.length - 1) / 2) * 9,
        e.y - 51 * scale,
        3,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
    if (e.elite || e.boss || e.guard || e.hp < e.maxHp) {
      const w = e.boss ? 90 : e.elite ? 54 : 28,
        y = e.y - 61 * scale;
      c.fillStyle = "#182019";
      c.fillRect(e.x - w / 2, y, w, 4);
      c.fillStyle = e.boss ? "#d49279" : e.elite ? "#d5b26d" : "#a8b789";
      c.fillRect(e.x - w / 2, y, w * Math.max(0, e.hp / e.maxHp), 4);
      if (e.elite) {
        c.fillStyle = "#ead49d";
        c.font = "10px serif";
        c.textAlign = "center";
        c.fillText("ELITE", e.x, y - 5);
      }
    }
  }
  private telegraph(h: Hazard) {
    const c = this.ctx;
    c.save();
    c.translate(h.x, h.y);
    const warning = h.warning > 0;
    c.fillStyle = h.linger
      ? warning
        ? "#99bd6333"
        : "#71994188"
      : warning
        ? "#cb895e33"
        : "#ed967377";
    c.strokeStyle = h.linger ? "#c0de88" : warning ? "#efc59c" : "#f9ad87";
    c.lineWidth = 2;
    c.setLineDash(warning ? [8, 5] : []);
    c.beginPath();
    let labelX = 0,
      labelY = 4,
      laneAngle = 0;
    if (h.shape === "line" && h.end) {
      const dx = h.end.x - h.x,
        dy = h.end.y - h.y,
        length = Math.hypot(dx, dy);
      laneAngle = Math.atan2(dy, dx);
      c.rotate(laneAngle);
      c.roundRect(
        -h.radius,
        -h.radius,
        length + h.radius * 2,
        h.radius * 2,
        h.radius,
      );
      labelX = dx / 2;
      labelY = dy / 2 + 4;
    } else {
      c.arc(0, 0, h.radius, 0, Math.PI * 2);
      if (h.shape === "ring" && h.innerRadius) {
        c.moveTo(h.innerRadius, 0);
        c.arc(0, 0, h.innerRadius, 0, Math.PI * 2, true);
      }
    }
    c.fill("evenodd");
    c.stroke();
    c.setLineDash([]);
    if (h.shape === "line") c.rotate(-laneAngle);
    if (warning) {
      c.fillStyle = "#ffdec0";
      c.font = "bold 12px sans-serif";
      c.textAlign = "center";
      if (h.shape === "ring") {
        c.fillStyle = "#c5d9aa";
        c.fillText("SAFE CENTER", 0, -16);
        c.fillStyle = "#ffdec0";
        c.fillText(
          h.warning.toFixed(1) + "s",
          0,
          -(h.radius + (h.innerRadius || 0)) / 2,
        );
      } else c.fillText(h.warning.toFixed(1) + "s", labelX, labelY);
      if (!h.shape || h.shape === "circle") {
        const progress = Math.max(
          0,
          Math.min(1, 1 - h.warning / (h.maxWarning || 1.35)),
        );
        c.beginPath();
        c.arc(0, 0, h.radius * progress, 0, Math.PI * 2);
        c.stroke();
      }
    }
    if (h.linger && !warning) {
      c.fillStyle = "#e0efb9";
      c.font = "bold 11px sans-serif";
      c.textAlign = "center";
      c.fillText("ROT CLOUD · MOVE", 0, 4);
    }
    c.restore();
  }
  private landmark(l: Landmark) {
    const c = this.ctx,
      complete = l.state === "complete";
    c.save();
    c.translate(l.x, l.y);
    this.shadow(0, 6, l.kind === "ritual" ? 32 : 26);
    c.globalAlpha = complete ? 0.5 : 1;
    if (l.kind === "cache") {
      c.fillStyle = "#3c2d1e";
      c.strokeStyle = "#d0ab6d";
      c.lineWidth = 2;
      c.beginPath();
      c.roundRect(-24, -30, 48, 36, 5);
      c.fill();
      c.stroke();
      c.fillStyle = "#89683e";
      c.fillRect(-23, -28, 46, 13);
      c.strokeRect(-14, -29, 6, 34);
      c.strokeRect(8, -29, 6, 34);
      c.fillStyle = "#edd193";
      c.fillRect(-5, -17, 10, 10);
      if (complete) {
        c.fillStyle = "#17221c";
        c.fillRect(-20, -25, 40, 8);
      }
    } else if (l.kind === "shrine") {
      c.fillStyle = "#657064";
      c.strokeStyle = "#adb390";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(-19, 7);
      c.lineTo(-14, -45);
      c.lineTo(0, -57);
      c.lineTo(14, -45);
      c.lineTo(19, 7);
      c.closePath();
      c.fill();
      c.stroke();
      c.fillStyle = complete ? "#777f61" : "#e0d49b";
      c.beginPath();
      c.moveTo(0, -43);
      c.lineTo(8, -31);
      c.lineTo(0, -19);
      c.lineTo(-8, -31);
      c.closePath();
      c.fill();
      c.fillStyle = "#505d50";
      c.fillRect(-24, 4, 48, 8);
      if (!complete && this.particles) {
        c.fillStyle = "#e3d59a88";
        for (let i = 0; i < 4; i++)
          c.fillRect(
            Math.sin(this.game.time + i * 1.6) * 26,
            -30 - ((this.game.time * 12 + i * 11) % 45),
            2,
            3,
          );
      }
    } else {
      c.strokeStyle = "#a7bb91";
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(0, 0, 37, 18, 0, 0, Math.PI * 2);
      c.stroke();
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        c.fillStyle = "#697568";
        c.fillRect(Math.cos(a) * 31 - 6, Math.sin(a) * 15 - 18, 12, 22);
        c.fillStyle = "#cee0b088";
        c.fillRect(Math.cos(a) * 31 - 1, Math.sin(a) * 15 - 14, 2, 10);
      }
      if (l.state === "active") {
        c.fillStyle = "#b5d9a666";
        c.beginPath();
        c.arc(0, -20, 8 + Math.sin(this.game.time * 3) * 2, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.globalAlpha = 1;
    if (l.discovered && !complete) {
      c.font = "11px sans-serif";
      c.textAlign = "center";
      const textWidth = c.measureText(l.name).width;
      c.fillStyle = "#101e17dd";
      c.fillRect(-textWidth / 2 - 7, -82, textWidth + 14, 21);
      c.fillStyle = "#e3d2a2";
      c.fillText(l.name, 0, -68);
    }
    c.restore();
  }
  private minimap() {
    const c = this.ctx,
      g = this.game,
      x = this.width - 78,
      y = this.height - 125,
      r = 52,
      center = this.cameraCenter();
    if (this.width < 650) return;
    c.save();
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.clip();
    c.fillStyle = "#172a23dd";
    c.fillRect(x - r, y - r, r * 2, r * 2);
    const drawDot = (pos: Vec, color: string, size: number) => {
      c.fillStyle = color;
      c.fillRect(
        x + (pos.x - center.x) * 0.045 - size / 2,
        y + (pos.y - center.y) * 0.045 - size / 2,
        size,
        size,
      );
    };
    for (const n of g.nodes)
      if (!n.depleted)
        drawDot(
          n,
          MATERIALS[n.kind].family === "herbs"
            ? "#88a875"
            : MATERIALS[n.kind].family === "ore"
              ? "#bb9970"
              : "#89b1b1",
          2,
        );
    if (g.gatheringOpen && g.gatheringTarget)
      drawDot(g.gatheringTarget, "#e6d399", 5);
    for (const e of g.enemies)
      drawDot(e, e.boss ? "#e4a06f" : "#bf7e73", e.boss ? 6 : 2);
    for (const l of g.landmarks)
      if (l.discovered && l.state !== "complete")
        drawDot(
          l,
          l.kind === "shrine"
            ? "#e6d5a4"
            : l.kind === "ritual"
              ? "#a9d1bd"
              : "#e4b47e",
          5,
        );
    for (const item of g.pickups)
      if (item.kind === "chest") drawDot(item, "#f2d58c", 4);
    drawDot(g.player, "#e6d8ad", 5);
    if (g.partner) drawDot(g.partner.player, "#91cde1", 5);
    c.restore();
    c.strokeStyle = "#bfa77377";
    c.lineWidth = 1;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = "#c2c8b0";
    c.textAlign = "center";
    c.font = "10px sans-serif";
    c.fillText("N", x, y - r - 5);
  }
}
