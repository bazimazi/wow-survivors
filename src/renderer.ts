import { BattleFeedback } from "./battle-feedback";
import { encounterBeat } from "./encounter-director";
import { drawHeroMotion, prepareHeroMotion } from "./hero-motion";
import {
  drawArtAim,
  drawArtEffect,
  drawArtProjectile,
  SpellTrails,
} from "./battle-art-visuals";
import { ART_CHARGE_TIME } from "./battle-arts";
import { CombatLabels } from "./combat-text";
import { prepareSpellTextures } from "./spell-textures";
import {
  drawWorldAtmosphere,
  drawCampfireLife,
  drawAreaAtmosphere,
  drawWindProp,
  drawAreaRain,
} from "./living-world";
import {
  HitReactions,
  CastChoreography,
  Footfalls,
} from "./battle-presentation";
import { RenderPositions, FollowCamera } from "./presentation";
import {
  IDLE_FRAME,
  IDLE_PERIOD,
  paintedVertex,
  paintedEmitter,
} from "./painted-rig";
import type { PaintedProfile } from "./painted-rig";
import { drawEvolvedPet, drawEvolvedPetAura } from "./evolution-visuals";
import {
  drawClassProjectile,
  drawClassEffect,
  drawClassAnchor,
  drawClassMark,
  classChoreography,
  drawCatForm,
} from "./class-visuals";
import { RESOURCE_TIERS } from "./resources";
import {
  drawSpellArea,
  drawSpellEffect,
  drawSpellOrbit,
  drawSpellProjectile,
} from "./spell-visuals";
import { MATERIALS, SPELLS, CLASSES } from "./content";
import type { ClassDef } from "./content";
import type {
  Enemy,
  Vec,
  Hazard,
  CombatAction,
  EnemyAction,
  DeathAction,
  Pet,
  ImpactAction,
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
import {
  CombatAnimator,
  combatFrame,
  combatKey,
  combatStyle,
} from "./combat-animation";
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
  profile?: PaintedProfile;
  back?: boolean;
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
  largeText = false;
  highContrast = false;
  private positions = new RenderPositions();
  private camera = new FollowCamera();
  private viewCenter: Vec | null = null;
  private displayTime = 0;
  private drawing = false;
  private poseOwners = new WeakMap<ActorPose, object>();
  private lastFrames = new WeakMap<
    object,
    { key: string; image: HTMLCanvasElement }
  >();
  private blendSurface: HTMLCanvasElement | null = null;
  private transitionSurface: HTMLCanvasElement | null = null;
  private liveSkins = new WeakMap<
    object,
    { key: string; pose: string; image: HTMLCanvasElement }
  >();
  private liveSkinDraws = 0;
  private idleTimes = new WeakMap<object, number>();
  // A mount and its seated rider need separate retained texture surfaces.
  private riderActors = new WeakMap<object, object>();
  private hits = new HitReactions();
  private labels = new CombatLabels();
  private casting = new CastChoreography();
  private footfalls = new Footfalls();
  private animator = new ActorAnimator();
  private combatAnimator = new CombatAnimator();
  private heroActions = new WeakMap<object, CombatAction>();
  private spellTrails = new SpellTrails();
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
  private formAtlas = new Image();
  private evolvedSummons = {
    imp: new Image(),
    totem: new Image(),
    beast: new Image(),
  };
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
  private terrainArt = new Image();
  private campProps = new Image();
  private feedback = new BattleFeedback();
  constructor(
    public canvas: HTMLCanvasElement,
    public game: GameEngine,
  ) {
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    void prepareHeroMotion(game.classDef.id);
    if (game.partner) void prepareHeroMotion(game.partner.classDef.id);
    this.campProps.src = "/art/camp-props.webp";
    this.worldAtlas.src = "/art/world-sprites.png";
    this.heroAtlas.src = "/art/hero-sprites.png";
    this.heroBackAtlas.src = "/art/hero-backs.png";
    this.companionAtlas.src = "/art/companions.png";
    this.travelAtlas.src = "/art/travel-sprites.png";
    this.formAtlas.src = "/art/druid-forms.png";
    this.evolvedSummons.imp.src = "/art/infernal.webp";
    this.evolvedSummons.totem.src = "/art/fire-elemental.webp";
    this.evolvedSummons.beast.src = "/art/wrath-wolf.webp";
    this.ragefireAtlas.src = "/art/ragefire-sprites.png";
    this.shadowfangAtlas.src = "/art/shadowfang-sprites.png";
    this.duskwoodAtlas.src = "/art/duskwood-sprites.png";
    void prepareSpellTextures();
    this.prepareGround();
    this.terrainArt.onload = () => this.preparePaintedGround();
    this.terrainArt.src = "/art/forest-floor.webp";
    this.resize();
  }
  async ready(): Promise<boolean> {
    await Promise.allSettled([
      prepareHeroMotion(this.game.classDef.id),
      ...(this.game.partner
        ? [prepareHeroMotion(this.game.partner.classDef.id)]
        : []),
      prepareSpellTextures(),
      this.terrainArt.decode(),
      this.campProps.decode(),
      this.worldAtlas.decode(),
      this.heroAtlas.decode(),
      this.heroBackAtlas.decode(),
      this.companionAtlas.decode(),
      this.travelAtlas.decode(),
      this.formAtlas.decode(),
      ...Object.values(this.evolvedSummons).map((image) => image.decode()),
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
  private preparePaintedGround() {
    const tile = document.createElement("canvas");
    tile.width = tile.height = 640;
    const c = tile.getContext("2d")!;
    const zone = this.game.zone.id;
    c.filter =
      zone === "westfall"
        ? "sepia(.55) saturate(.75) brightness(1.05)"
        : ["duskwood", "tirisfal", "plaguelands"].includes(zone)
          ? "saturate(.4) brightness(.62)"
          : "saturate(.7) brightness(.78)";
    c.drawImage(this.terrainArt, 0, 0, 640, 640);
    c.filter = "none";
    c.globalAlpha = 0.18;
    c.fillStyle = this.game.zone.palette[0];
    c.fillRect(0, 0, 640, 640);
    this.ground = this.ctx.createPattern(tile, "repeat");
  }
  private pet(pet: Pet, owner: Vec, rank: number) {
    const beast = pet.spellId === "beast",
      elemental = pet.spellId === "totem";
    const pose = this.characterPose(pet, beast ? 72 : 64, pet.x > owner.x);
    if (rank >= 5) {
      const image =
        this.evolvedSummons[pet.spellId as keyof typeof this.evolvedSummons];
      if (!image?.naturalWidth) {
        drawEvolvedPet(
          this.ctx,
          pet,
          owner,
          this.displayTime,
          this.motionEnabled,
          this.particles,
        );
        return;
      }
      const height = beast ? 72 : elemental ? 94 : 88;
      const width = (height * image.naturalWidth) / image.naturalHeight;
      this.shadow(pet.x, pet.y, beast ? 28 : 25);
      drawEvolvedPetAura(
        this.ctx,
        pet,
        this.displayTime,
        this.motionEnabled,
        this.particles,
      );
      const c = this.ctx;
      c.save();
      c.translate(pet.x, pet.y);
      if (pose.mirror) c.scale(-1, 1);
      c.imageSmoothingEnabled = true;
      this.drawCrop(
        image,
        { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight },
        width,
        height,
        -height * 0.95,
        { pose, rig: beast ? "quadruped" : elemental ? "hover" : "heavy" },
      );
      c.restore();
      return;
    }
    this.shadow(pet.x, pet.y, 15);
    if (
      this.sprite(
        this.companionAtlas,
        beast ? 0 : pet.spellId === "imp" ? 1 : 3,
        2,
        pet.x,
        pet.y,
        beast ? 53 : 46,
        pose.mirror,
        { pose, rig: beast ? "quadruped" : elemental ? "totem" : "biped" },
      )
    )
      return;
    if (beast) this.wolf(pet.x, pet.y, "#a2a598", 1, false, pose, false);
    else {
      const c = this.ctx;
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
    if (motion)
      motion = {
        ...motion,
        profile:
          motion.profile ??
          (atlas === this.heroAtlas || atlas === this.heroBackAtlas
            ? CLASSES.find((hero) => hero.portrait === index)?.id
            : atlas === this.companionAtlas
              ? (["beast-front", "imp", "bear", "totem"] as const)[index]
              : atlas === this.formAtlas
                ? index === 0
                  ? "cat"
                  : "moonkin"
                : atlas === this.travelAtlas
                  ? "mount"
                  : undefined),
        back: atlas === this.heroBackAtlas,
      };
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
          : atlas === this.formAtlas
            ? {
                x: (index % 2) * cellWidth,
                y: 0,
                width: cellWidth,
                height: atlas.naturalHeight,
              }
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
    c.translate(x, y);
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
  onImpact(action: ImpactAction) {
    this.hits.trigger(action);
    this.feedback.impact(
      action,
      action.actor === this.game.player ||
        action.actor === this.game.partner?.player,
    );
  }
  onAction(action: CombatAction) {
    this.heroActions.set(action.actor, action);
    this.casting.observe(action);
    if (!this.motionEnabled) {
      this.combatAnimator.clear(action.actor);
      return;
    }
    this.combatAnimator.trigger(
      action.actor,
      combatStyle(action),
      action.time,
      action.facing,
      action.battleArt ? 2 : action.ability ? 1 : 0,
      true,
    );
  }
  onEnemyAction(action: EnemyAction) {
    if (!this.motionEnabled) this.creatureCombatAnimator.clear(action.actor);
    else this.creatureCombatAnimator.trigger(action, true);
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
      : data.bear ||
          (this.game.classCombat &&
            this.game.classDef.id === "druid" &&
            data.actor.kit.form === "cat")
        ? "quadruped"
        : this.game.classCombat &&
            this.game.classDef.id === "druid" &&
            data.actor.kit.form === "moonkin"
          ? "heavy"
          : ["mage", "priest", "warlock", "druid"].includes(
                this.game.classDef.id,
              )
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
  beforeStep() {
    if (this.suspended) return;
    const g = this.game;
    this.positions.capture([
      g.player,
      ...(g.partner
        ? [g.partner.player, ...(g.partner.pet ? [g.partner.pet] : [])]
        : []),
      ...g.enemies,
      ...g.pets,
      ...g.projectiles,
      ...g.pickups,
    ]);
  }
  private present(actor: object & Vec): Vec {
    return this.positions.at(actor);
  }
  private drawActor(actor: object & Vec, draw: () => void) {
    const p = this.present(actor);
    this.ctx.save();
    this.ctx.translate(p.x - actor.x, p.y - actor.y);
    draw();
    this.ctx.restore();
  }
  private smoothPose(
    pose: ActorPose,
    actor: object,
    progress?: number,
  ): ActorPose {
    if (!this.motionEnabled || pose.frame < 0) {
      this.poseOwners.set(pose, actor);
      return pose;
    }
    const phase = progress === undefined ? pose.phase * 8 : progress * 6;
    const blend = phase - Math.floor(phase);
    const nextFrame =
      progress === undefined
        ? (pose.frame + 1) % 8
        : pose.frame + (Math.floor(phase) < 5 ? 1 : 0);
    const smooth = {
      ...pose,
      nextFrame,
      blend: blend * blend * (3 - 2 * blend),
    };
    this.poseOwners.set(smooth, actor);
    return smooth;
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
      ? this.smoothPose(
          {
            ...walk,
            frame: action.frame,
            mirror: action.mirror,
            gaitFrame: walk.frame >= 0 ? walk.frame : (walk.settleFrame ?? -1),
          },
          e,
          action.phase !== undefined ? action.phase / 6 : action.progress,
        )
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
      ? this.smoothPose(
          {
            ...walk,
            frame: action.frame,
            mirror: action.mirror,
            gaitFrame: walk.frame >= 0 ? walk.frame : (walk.settleFrame ?? -1),
          },
          actor,
          action.phase !== undefined ? action.phase / 6 : action.progress,
        )
      : walk;
  }
  private pose(
    actor: object & Vec,
    stride = 44,
    mirror = false,
    frozen = false,
    phaseOffset = 0,
  ) {
    return this.smoothPose(
      this.animator.sample(
        actor,
        this.present(actor),
        this.drawing ? this.displayTime : this.game.time,
        {
          enabled: this.motionEnabled,
          frozen: frozen || this.suspended,
          stride,
          mirror,
          phaseOffset,
        },
      ),
      actor,
    );
  }
  private drawCrop(
    atlas: HTMLImageElement,
    crop: SpriteCrop,
    width: number,
    height: number,
    top: number,
    motion?: SpriteMotion,
  ) {
    const c = this.ctx;
    const base = `${atlas.src}:${crop.x}:${crop.y}:${crop.width}:${crop.height}:${motion?.profile ?? "generic"}:${motion?.back ? "back" : "front"}:${motion?.rig}`;
    const owner = motion && this.poseOwners.get(motion.pose);
    const cached = (pose: number) => {
      const gait = motion?.pose.gaitFrame;
      const key = `${base}:${pose}${gait !== undefined && gait >= 0 ? `:gait:${gait}` : ""}`,
        create = () =>
          createAnimationFrame(
            atlas,
            crop,
            motion!.rig,
            pose,
            motion?.pose.gaitFrame,
            motion?.profile,
            motion?.back,
          );
      if (this.suspended)
        return motion!.creature
          ? this.creatureCache.peek(key)
          : this.frameCache.peek(key);
      return motion!.creature
        ? this.creatureCache.get(key, create, motion!.priority)
        : this.frameCache.get(key, create);
    };
    let requested =
      motion?.pose.frame === -1
        ? (motion.pose.settleFrame ?? -1)
        : (motion?.pose.frame ?? -1);
    const individuallyFrozen =
      owner &&
      "frozenUntil" in owner &&
      typeof owner.frozenUntil === "number" &&
      owner.frozenUntil > this.game.time;
    const idleTime =
      owner && individuallyFrozen
        ? (this.idleTimes.get(owner) ?? this.displayTime)
        : this.displayTime;
    if (owner) this.idleTimes.set(owner, idleTime);
    const idlePhase =
      ((idleTime / IDLE_PERIOD + (motion?.pose.phase || 0) * 0.25) % 1) * 8;
    const idle = requested === -1 && !!owner && this.motionEnabled;
    if (idle) requested = IDLE_FRAME + Math.floor(idlePhase);
    const live =
      !!owner &&
      !!motion &&
      this.motionEnabled &&
      requested >= 0 &&
      requested < 40 &&
      (!motion.creature || motion.priority) &&
      (!motion.creature || this.liveSkinDraws < 4);
    let frame: HTMLCanvasElement | null = null;
    if (live && owner && motion) {
      const mix = idle ? idlePhase % 1 : motion.pose.blend || 0;
      const next = idle
        ? IDLE_FRAME + ((requested - IDLE_FRAME + 1) % 8)
        : motion.pose.nextFrame;
      const signature = `${requested}:${next}:${mix}:${motion.pose.gaitFrame}:${motion.pose.phase}:${motion.pose.strideWeight}`;
      const previous = this.liveSkins.get(owner);
      if (previous?.key === base && previous.pose === signature)
        frame = previous.image;
      else if (this.liveSkinDraws < 6 && !this.suspended) {
        const target = previous?.image || document.createElement("canvas");
        frame = createAnimationFrame(
          atlas,
          crop,
          motion.rig,
          requested,
          motion.pose.gaitFrame,
          motion.profile,
          motion.back,
          {
            nextFrame: next,
            mix,
            gaitNext:
              motion.pose.gaitFrame !== undefined
                ? (motion.pose.gaitFrame + 1) % 8
                : undefined,
            gaitMix: (motion.pose.phase * 8) % 1,
            strideWeight: motion.pose.strideWeight ?? 1,
            restFrame: IDLE_FRAME + Math.floor(idlePhase),
            restNext: IDLE_FRAME + ((Math.floor(idlePhase) + 1) % 8),
            restMix: idlePhase % 1,
          },
          target,
        );
        this.liveSkinDraws++;
        this.liveSkins.set(owner, { key: base, pose: signature, image: frame });
      }
    }
    if (!frame) frame = motion && requested >= 0 ? cached(requested) : null;
    if (frame && owner) this.lastFrames.set(owner, { key: base, image: frame });
    if (!frame && motion && requested >= 0 && owner) {
      const last = this.lastFrames.get(owner);
      if (last?.key === base && last.image.width > 0) frame = last.image;
    }
    c.save();
    const dasher =
      owner && "dashTimer" in owner && "facing" in owner
        ? (owner as { dashTimer: number; facing: number })
        : null;
    const dashing =
      !!dasher && this.motionEnabled && dasher.dashTimer > 0 && requested < 26;
    if (dashing) {
      c.rotate(Math.abs(Math.cos(dasher!.facing)) * 0.12);
      c.scale(1.03, 0.96);
    }
    if (owner && this.motionEnabled) {
      const reaction = this.hits.sample(owner, this.displayTime, true);
      c.translate(reaction.x, reaction.y);
      c.rotate(reaction.angle);
      const key = motion && combatKey(motion.pose.frame);
      if (key) {
        const next =
          motion?.pose.nextFrame !== undefined &&
          combatKey(motion.pose.nextFrame);
        const mix = motion?.pose.blend || 0;
        const lean =
          key.lean + ((next ? next.lean : key.lean) - key.lean) * mix;
        c.rotate(lean * 0.035);
        c.translate(lean * 1.5, -Math.abs(lean) * 0.8);
      }
    }
    const strideWeight =
      !live &&
      motion &&
      (!motion.creature || motion.priority) &&
      requested >= 0 &&
      requested < 8
        ? (motion.pose.strideWeight ?? 1)
        : 1;
    const drawFrame = (image: HTMLCanvasElement) => {
      if (strideWeight < 1) {
        this.transitionSurface ??= document.createElement("canvas");
        if (this.transitionSurface.width !== FRAME_SIZE)
          this.transitionSurface.width = this.transitionSurface.height =
            FRAME_SIZE;
        const blend = this.transitionSurface.getContext("2d")!;
        blend.clearRect(0, 0, FRAME_SIZE, FRAME_SIZE);
        blend.globalAlpha = 1 - strideWeight;
        blend.drawImage(
          atlas,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
          FRAME_PADDING,
          FRAME_PADDING,
          FRAME_CONTENT,
          FRAME_CONTENT,
        );
        if (crop.cutout) {
          const mask = crop.cutout;
          blend.clearRect(
            FRAME_PADDING + mask.x * FRAME_CONTENT,
            FRAME_PADDING + mask.y * FRAME_CONTENT,
            mask.width * FRAME_CONTENT,
            mask.height * FRAME_CONTENT,
          );
        }
        blend.globalCompositeOperation = "lighter";
        blend.globalAlpha = strideWeight;
        blend.drawImage(image, 0, 0);
        blend.globalAlpha = 1;
        blend.globalCompositeOperation = "source-over";
        image = this.transitionSurface;
      }
      if (dashing && this.particles) {
        c.save();
        const direction = motion?.pose.mirror ? -1 : 1;
        for (const distance of [16, 8]) {
          c.save();
          c.globalAlpha *= distance === 16 ? 0.09 : 0.16;
          c.translate(
            -Math.cos(dasher!.facing) * direction * distance,
            -Math.sin(dasher!.facing) * distance,
          );
          c.drawImage(
            image,
            -width / 2 - (width * FRAME_PADDING) / FRAME_CONTENT,
            top - (height * FRAME_PADDING) / FRAME_CONTENT,
            (width * FRAME_SIZE) / FRAME_CONTENT,
            (height * FRAME_SIZE) / FRAME_CONTENT,
          );
          c.restore();
        }
        c.restore();
      }
      c.drawImage(
        image,
        -width / 2 - (width * FRAME_PADDING) / FRAME_CONTENT,
        top - (height * FRAME_PADDING) / FRAME_CONTENT,
        (width * FRAME_SIZE) / FRAME_CONTENT,
        (height * FRAME_SIZE) / FRAME_CONTENT,
      );
    };
    const drawOriginal = () => {
      const cutout = crop.cutout;
      c.save();
      if (cutout) {
        c.beginPath();
        c.rect(-width / 2, top, width, height);
        c.rect(
          -width / 2 + cutout.x * width,
          top + cutout.y * height,
          cutout.width * width,
          cutout.height * height,
        );
        c.clip("evenodd");
      }
      c.drawImage(
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
      c.restore();
    };
    if (frame) {
      const mix = idle ? idlePhase % 1 : motion?.pose.blend || 0;
      const next = idle
        ? IDLE_FRAME + ((requested - IDLE_FRAME + 1) % 8)
        : motion?.pose.nextFrame;
      const other =
        !live &&
        (!motion?.creature || motion.priority) &&
        next !== undefined &&
        next !== requested &&
        mix > 0.01
          ? cached(next)
          : null;
      if (other && other !== frame) {
        this.blendSurface ??= document.createElement("canvas");
        if (this.blendSurface.width !== FRAME_SIZE)
          this.blendSurface.width = this.blendSurface.height = FRAME_SIZE;
        const blendContext = this.blendSurface.getContext("2d")!;
        blendContext.clearRect(0, 0, FRAME_SIZE, FRAME_SIZE);
        blendContext.globalCompositeOperation = "source-over";
        blendContext.globalAlpha = 1 - mix;
        blendContext.drawImage(frame, 0, 0);
        blendContext.globalCompositeOperation = "lighter";
        blendContext.globalAlpha = mix;
        blendContext.drawImage(other, 0, 0);
        blendContext.globalAlpha = 1;
        blendContext.globalCompositeOperation = "source-over";
        drawFrame(this.blendSurface);
      } else drawFrame(frame);
    } else drawOriginal();
    c.restore();
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
  render(delta = 0, interpolation = 1) {
    this.drawing = true;
    try {
      this.drawFrame(delta, interpolation);
    } finally {
      this.drawing = false;
    }
  }
  worldPoint(clientX: number, clientY: number): Vec {
    const rect = this.canvas.getBoundingClientRect(),
      center = this.cameraCenter();
    return {
      x:
        ((clientX - rect.left) * this.width) / rect.width -
        this.width / 2 +
        center.x,
      y:
        ((clientY - rect.top) * this.height) / rect.height -
        this.height / 2 +
        center.y,
    };
  }
  private drawFrame(delta: number, interpolation: number) {
    this.liveSkinDraws = 0;
    const state = this.game;
    if (!this.suspended) {
      this.positions.alpha = Math.max(0, Math.min(1, interpolation));
      this.displayTime = this.motionEnabled
        ? Math.max(0, state.time - (1 - this.positions.alpha) / 60)
        : 0;
    } else if (!this.motionEnabled) this.displayTime = 0;
    const primary = this.present(state.player),
      buddy = state.partner && this.present(state.partner.player);
    const center = buddy
      ? { x: (primary.x + buddy.x) / 2, y: (primary.y + buddy.y) / 2 }
      : primary;
    this.viewCenter = this.camera.sample(
      center,
      delta,
      this.suspended,
      this.motionEnabled,
    );
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
    if (!this.suspended) this.frameCache.beginFrame();
    if (this.motionEnabled && !this.suspended) this.creatureCache.beginFrame();
    else this.creatureCache.cancelPending();
    const c = this.ctx,
      g = this.game,
      p = g.player;
    c.fillStyle = g.zone.palette[0];
    c.fillRect(0, 0, this.width, this.height);
    c.save();
    let dx = 0,
      dy = 0;
    if (this.shake && this.motionEnabled && p.hurt > 0) {
      dx = Math.sin(g.time * 130) * p.hurt * 12;
      dy = Math.cos(g.time * 145) * p.hurt * 8;
    }
    const kick = this.feedback.shake(
      this.displayTime,
      this.shake && this.motionEnabled,
    );
    dx += kick.x;
    dy += kick.y;
    c.translate(
      this.width / 2 - this.viewCenter.x + dx,
      this.height / 2 - this.viewCenter.y + dy,
    );
    this.terrain();
    drawArtAim(
      c,
      g.battleArt,
      g.classDef.id,
      p,
      this.displayTime,
      this.motionEnabled,
      this.particles,
    );
    drawWorldAtmosphere(
      c,
      this.cameraCenter(),
      this.width,
      this.height,
      g.zone.id,
      this.displayTime,
      this.motionEnabled,
      this.particles,
      !!g.dungeonStage,
    );
    if (!g.dungeonStage && this.visible({ x: 0, y: 100 }, 100))
      drawCampfireLife(c, this.displayTime, this.motionEnabled, this.particles);
    for (const actor of [p, ...(g.partner ? [g.partner.player] : [])])
      this.footfalls.observe(
        actor,
        g.time,
        this.motionEnabled &&
          this.particles &&
          actor.hp > 0 &&
          actor.dashTimer <= 0,
      );
    this.footfalls.draw(
      c,
      this.displayTime,
      this.motionEnabled && this.particles,
      g.zone.id === "westfall" ? "#dbc38a" : "#c4b894",
    );
    const projectileDetailStride = Math.max(
      1,
      Math.ceil(g.projectiles.length / 90),
    );
    for (const a of g.areas) {
      if (this.visible(a, a.radius + 70)) {
        drawAreaAtmosphere(
          c,
          a,
          this.displayTime,
          this.motionEnabled,
          this.particles,
        );
        drawSpellArea(
          c,
          a,
          this.displayTime,
          this.motionEnabled,
          this.particles,
        );
      }
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
      } else if (
        MATERIALS[n.kind].family === "fish" &&
        !this.drawCampProp(2, 0, 24, 132, 104)
      ) {
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
    for (const pickup of g.pickups) {
      const item = { ...pickup, ...this.present(pickup) };
      if (!this.visible(item, 30)) continue;
      const bob = Math.sin(g.time * 4 + item.x) * 2;
      c.save();
      c.translate(Math.round(item.x), Math.round(item.y + bob));
      if (this.particles) {
        const color =
          item.kind === "xp"
            ? item.value > 5
              ? "#c99aef"
              : "#67ddeb"
            : item.kind === "gold" || item.kind === "chest"
              ? "#f5c35d"
              : "#8ee69a";
        const glow = c.createRadialGradient(
          0,
          0,
          0,
          0,
          0,
          item.kind === "chest" ? 32 : 14,
        );
        glow.addColorStop(0, color + "55");
        glow.addColorStop(1, color + "00");
        c.fillStyle = glow;
        c.fillRect(-32, -32, 64, 64);
      }
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
      if (item.kind === "chest" && !this.drawCampProp(1, 0, 11, 52)) {
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
    if (g.classCombat)
      for (const actor of [g.player, ...(g.partner ? [g.partner.player] : [])])
        for (const anchor of actor.kit.anchors)
          drawClassAnchor(c, anchor, g.time, this.motionEnabled);
    const actors: { y: number; draw: () => void; actor?: object & Vec }[] = [];
    for (const l of g.landmarks)
      if (this.visible(l, 100))
        actors.push({ y: l.y, draw: () => this.landmark(l) });
    for (const e of g.enemies)
      if (!e.dead && this.visible(e, 80))
        actors.push({
          y: e.y,
          draw: () => this.drawActor(e, () => this.enemy(e)),
        });
    for (const entry of this.deathAnimator.enemies)
      if (this.visible(entry.data.actor, 180))
        actors.push({ y: entry.data.actor.y, draw: () => this.death(entry) });
    for (const pet of g.pets)
      actors.push({
        y: pet.y,
        actor: pet,
        draw: () =>
          this.pet(
            pet,
            p,
            g.spells.find((state) => state.id === pet.spellId)?.rank || 1,
          ),
      });
    const defeated = this.deathAnimator.hero;
    actors.push({
      y: p.y,
      actor: p,
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
        actor: buddy.player,
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
          actor: buddy.pet,
          draw: () =>
            this.pet(
              buddy.pet!,
              buddy.player,
              buddy.spells.find((state) => state.id === buddy.pet!.spellId)
                ?.rank || 1,
            ),
        });
    }
    this.props(actors);
    actors.sort((a, b) => a.y - b.y);
    for (const actor of actors) {
      if (actor.actor) this.drawActor(actor.actor, actor.draw);
      else actor.draw();
    }
    for (const e of g.enemies) {
      if (
        e.dead ||
        e.boss ||
        e.elite ||
        e.hp >= e.maxHp ||
        !this.visible(e, 80)
      )
        continue;
      const at = this.present(e),
        w = 28;
      c.fillStyle = "#010807bb";
      c.fillRect(at.x - w / 2 - 1, at.y - e.radius * 3 - 1, w + 2, 5);
      c.fillStyle = "#c96052";
      c.fillRect(
        at.x - w / 2,
        at.y - e.radius * 3,
        w * Math.max(0, e.hp / e.maxHp),
        3,
      );
    }
    this.feedback.draw(
      c,
      this.displayTime,
      this.particles && this.motionEnabled,
    );
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
            const center = this.present(actor.player),
              angle =
                Math.atan2(pos.y - actor.player.y, pos.x - actor.player.x) +
                (this.displayTime - g.time) * 2.8;
            const radius = Math.hypot(
              pos.x - actor.player.x,
              pos.y - actor.player.y,
            );
            const point = {
              x: center.x + Math.cos(angle) * radius,
              y: center.y + Math.sin(angle) * radius,
            };
            drawSpellOrbit(
              c,
              state.id,
              point,
              center,
              this.displayTime,
              this.motionEnabled,
              this.particles,
              state.rank,
            );
          }
    for (const [shotIndex, projectile] of g.projectiles.entries()) {
      const shot = { ...projectile, ...this.present(projectile) };
      if (!this.visible(shot, 80)) continue;
      this.spellTrails.draw(
        c,
        projectile,
        shot,
        this.displayTime,
        this.motionEnabled && this.particles,
      );
      if (shot.battleArt) {
        drawArtProjectile(c, shot, this.displayTime, this.particles);
        continue;
      }
      if (shot.spellId && SPELLS[shot.spellId] && !shot.enemy) {
        drawSpellProjectile(
          c,
          shot,
          this.displayTime,
          this.motionEnabled,
          this.particles && shotIndex % projectileDetailStride === 0,
        );
        continue;
      }
      if (shot.classId && !shot.enemy) {
        drawClassProjectile(c, shot, this.particles);
        continue;
      }
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
    if (g.classCombat)
      for (const entry of [
        { p: g.player, id: g.classDef.id },
        ...(g.partner
          ? [{ p: g.partner.player, id: g.partner.classDef.id }]
          : []),
      ]) {
        for (const enemy of g.enemies)
          if (
            !enemy.dead &&
            this.visible(enemy, 90) &&
            (entry.p.kit.target === enemy.id ||
              entry.p.kit.curses.has(enemy.id))
          )
            drawClassMark(
              c,
              entry.id,
              entry.p,
              enemy,
              entry.p.kit.curses.has(enemy.id),
            );
      }
    if (this.particles) {
      let volumes = 0;
      for (const area of g.areas) {
        if (!this.visible(area, area.radius + 120)) continue;
        drawAreaRain(c, area, this.displayTime, this.motionEnabled, true);
        if (++volumes >= 4) break;
      }
    }
    let detailedImpacts = 0;
    for (const fx of g.effects) {
      if (
        !this.visible(fx, fx.radius + 100) &&
        (!fx.end || !this.visible(fx.end, 100))
      )
        continue;
      if (fx.battleArt) {
        drawArtEffect(c, fx, this.motionEnabled, this.particles);
        continue;
      }
      if (fx.spellId && SPELLS[fx.spellId]) {
        drawSpellEffect(
          c,
          {
            ...fx,
            life: Math.min(
              fx.maxLife,
              fx.life + (this.motionEnabled ? g.time - this.displayTime : 0),
            ),
          },
          this.motionEnabled,
          this.particles,
          fx.motif === "signature" ||
            fx.motif === "evolution" ||
            detailedImpacts++ < 16,
        );
        continue;
      }
      if (fx.kind === "class") {
        drawClassEffect(c, fx, this.motionEnabled, this.particles);
        continue;
      }
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
    this.labels.observe(g.texts, g.time);
    this.labels.draw(c, this.displayTime, this.motionEnabled, this.largeText);
    c.globalAlpha = 1;
    c.restore();
    if (this.particles) {
      const t = this.motionEnabled ? this.displayTime : 0;
      c.fillStyle = "#d6d6a0";
      for (let i = 0; i < 30; i++) {
        c.globalAlpha = 0.1 + Math.sin(t + i) * 0.08;
        c.fillRect(
          (hash(i, 5) * this.width + Math.sin(t * 0.3 + i) * 20) % this.width,
          (hash(i, 10) * this.height -
            ((t * (2 + (i % 3))) % this.height) +
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
    this.drawHordeWarning();
    if (p.hp > 0 && p.hp < p.maxHp * 0.3) {
      const pulse = this.motionEnabled
        ? 0.12 + Math.sin(this.displayTime * 5) * 0.035
        : 0.12;
      const danger = c.createRadialGradient(
        this.width / 2,
        this.height / 2,
        this.height * 0.25,
        this.width / 2,
        this.height / 2,
        Math.max(this.width, this.height) * 0.6,
      );
      danger.addColorStop(0, "#9e201500");
      danger.addColorStop(1, `rgba(157,30,18,${pulse})`);
      c.fillStyle = danger;
      c.fillRect(0, 0, this.width, this.height);
    }
    this.minimap();
  }
  private drawHordeWarning() {
    const g = this.game,
      beat = encounterBeat(g.time, g.zone.duration);
    if (!g.pacedEncounters || g.dungeonStage || g.boss || !beat.warning) return;
    const c = this.ctx,
      a = beat.angle,
      horizontal = Math.abs(Math.cos(a)) > 0.5;
    const x = horizontal
      ? Math.cos(a) > 0
        ? this.width - 24
        : 24
      : this.width / 2;
    const y = horizontal
      ? this.height / 2
      : Math.sin(a) > 0
        ? this.height - 110
        : 160;
    c.save();
    c.translate(x, y);
    c.rotate(a);
    c.globalAlpha = this.motionEnabled
      ? 0.6 + Math.sin(this.displayTime * 10) * 0.25
      : 0.85;
    c.strokeStyle = "#ef9d60";
    c.fillStyle = "#ef9d601f";
    c.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(-12 - i * 13, -12);
      c.lineTo(-i * 13, 0);
      c.lineTo(-12 - i * 13, 12);
      c.stroke();
    }
    c.restore();
  }
  private cameraCenter() {
    const p = this.game.player,
      partner = this.game.partner?.player;
    return (
      this.viewCenter ||
      (partner ? { x: (p.x + partner.x) / 2, y: (p.y + partner.y) / 2 } : p)
    );
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
    const minStone = Math.floor((p.x - this.width / 2) / 48),
      maxStone = Math.ceil((p.x + this.width / 2) / 48);
    for (let i = minStone; i <= maxStone; i++) {
      const x = i * 48,
        y = Math.sin(x / 600) * 135 + 50;
      if (Math.abs(y - p.y) > this.height / 2 + 50 || hash(i, 91) < 0.25)
        continue;
      for (let j = 0; j < 3; j++) {
        const sx = x + hash(i, j) * 20,
          sy = y + (j - 1) * 19 + hash(j, i) * 12;
        c.save();
        c.translate(sx, sy);
        c.rotate(hash(i, j + 4) * 0.4 - 0.2);
        c.fillStyle = "#080d0966";
        c.beginPath();
        c.ellipse(2, 4, 15, 9, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = ["#81755c66", "#9b927466", "#73745f77"][j];
        c.beginPath();
        c.moveTo(-13, -5);
        c.lineTo(6, -8);
        c.lineTo(15, -1);
        c.lineTo(11, 6);
        c.lineTo(-9, 7);
        c.closePath();
        c.fill();
        c.strokeStyle = "#b8ad852c";
        c.lineWidth = 1;
        c.stroke();
        c.restore();
      }
    }
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
        if (h < 0.43 || (x === 0 && y === 0)) continue;
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
              index !== 3 &&
              this.motionEnabled &&
              this.worldAtlas.naturalWidth
            ) {
              drawWindProp(
                c,
                this.worldAtlas,
                creatureCrop(
                  "world",
                  index,
                  this.worldAtlas.naturalWidth,
                  this.worldAtlas.naturalHeight,
                ),
                165 + h * 20,
                this.displayTime,
                h * 6.28,
              );
              c.restore();
              return;
            }
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
    let pose =
      death ||
      this.characterPose(
        p,
        snapshot === g.player && g.travel.active ? 108 : 66,
        Math.cos(p.facing) < -0.2,
      );
    if (!death)
      this.shadow(p.x, p.y, snapshot === g.player && g.travel.active ? 30 : 19);
    c.save();
    c.translate(p.x, p.y);
    if (!death && g.classCombat) {
      classChoreography(c, classDef.id, p, g.time, this.motionEnabled);
      if (classDef.id === "rogue" && p.kit.concealedUntil > g.time)
        c.globalAlpha = 0.4;
    }
    if (!death && p.hp > 0 && !g.travelling) {
      const spells = p === g.player ? g.spells : g.partner?.spells || [];
      const canPrepare =
        !this.suspended &&
        g.enemies.some(
          (e) => !e.dead && Math.hypot(e.x - p.x, e.y - p.y) < 650,
        );
      const available = spells.filter(
        (s) =>
          p.resource >= (SPELLS[s.id]?.cost || 0) &&
          (SPELLS[s.id]?.kind !== "melee" ||
            g.enemies.some(
              (e) =>
                !e.dead &&
                Math.hypot(e.x - p.x, e.y - p.y) <
                  SPELLS[s.id].range + e.radius,
            )),
      );
      const preparing = this.suspended
        ? this.casting.preparation(p)
        : canPrepare
          ? available.find(
              (s) =>
                s.timer > 0 &&
                s.timer < 0.2 &&
                ["projectile", "chain", "nova", "ground", "melee"].includes(
                  SPELLS[s.id]?.kind,
                ),
            )
          : undefined;
      if (this.motionEnabled && preparing && pose.frame < 8) {
        const phase = Math.max(0, Math.min(1, 1 - preparing.timer / 0.2));
        const style = combatStyle({
          actor: p,
          time: g.time,
          facing: p.facing,
          spellId: preparing.id,
          spellKind: SPELLS[preparing.id].kind,
        });
        pose = this.smoothPose(
          {
            ...pose,
            frame: combatFrame(style, Math.floor(phase)),
            gaitFrame: pose.frame >= 0 ? pose.frame : (pose.settleFrame ?? -1),
          },
          p,
          phase / 6,
        );
      }
      const back = Math.sin(p.facing) < -0.35;
      const hand = paintedEmitter(classDef.id, back);
      const point = paintedVertex(
        hand.x,
        hand.y,
        ["mage", "priest", "warlock", "druid"].includes(classDef.id)
          ? "robe"
          : "biped",
        pose.frame,
        classDef.id,
        back,
      );
      if (pose.nextFrame !== undefined && pose.blend) {
        const next = paintedVertex(
          hand.x,
          hand.y,
          ["mage", "priest", "warlock", "druid"].includes(classDef.id)
            ? "robe"
            : "biped",
          pose.nextFrame,
          classDef.id,
          back,
        );
        point.x += (next.x - point.x) * pose.blend;
        point.y += (next.y - point.y) * pose.blend;
      }
      const emitter = {
        x: (point.x - 0.5) * 78 * (pose.mirror ? -1 : 1),
        y: (point.y - 0.95) * 78,
      };
      this.casting.draw(
        c,
        p,
        available,
        this.displayTime,
        this.motionEnabled,
        this.particles,
        canPrepare,
        this.suspended,
        emitter,
      );
    }
    if (
      !death &&
      this.motionEnabled &&
      p.invulnerable > 0 &&
      Math.floor(g.time * 12) % 2
    )
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
      const gait = WALK_KEYS[pose.frame],
        nextGait = WALK_KEYS[pose.nextFrame ?? pose.frame];
      const blend = pose.blend || 0;
      const bob = gait
        ? -(gait.bob + ((nextGait?.bob ?? gait.bob) - gait.bob) * blend) * 1.8
        : 0;
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
        { pose, rig: "quadruped", profile: "mount" },
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
        c.rotate(
          gait
            ? (gait.sway +
                ((nextGait?.sway ?? gait.sway) - gait.sway) * blend) *
                0.022
            : 0,
        );
        let rider = this.riderActors.get(p);
        if (!rider) {
          rider = {};
          this.riderActors.set(p, rider);
        }
        const riderPose: ActorPose = {
          frame: -1,
          mirror,
          phase: 0,
          strideWeight: 1,
        };
        this.poseOwners.set(riderPose, rider);
        const riderHeight = (crop.height / crop.width) * 53;
        // Skin the full illustration with its original joint coordinates, then
        // clip at the waist rather than rescaling the upper-body texture rig.
        c.beginPath();
        c.rect(-40, -90 + bob, 80, 17 + riderHeight * 0.73);
        c.clip();
        this.drawCrop(atlas, crop, 53, riderHeight, -73 + bob, {
          pose: riderPose,
          rig: ["mage", "priest", "warlock", "druid"].includes(classDef.id)
            ? "robe"
            : "biped",
          profile: classDef.id,
          back: !!back,
        });
        c.restore();
      }
      c.restore();
      return;
    }
    if (g.classCombat && classDef.id === "druid" && p.kit.form !== "bear") {
      if (
        this.sprite(
          this.formAtlas,
          p.kit.form === "cat" ? 0 : 1,
          2,
          0,
          0,
          p.kit.form === "cat" ? 83 : 87,
          pose.mirror,
          { pose, rig: p.kit.form === "cat" ? "quadruped" : "heavy" },
        )
      ) {
        c.restore();
        return;
      }
      if (p.kit.form === "cat") {
        drawCatForm(
          c,
          p,
          g.time,
          !death &&
            this.motionEnabled &&
            !!(snapshot === g.player
              ? g.input.x || g.input.y || p.dashTimer
              : g.partner?.input.x || g.partner?.input.y || p.dashTimer),
        );
        c.restore();
        return;
      }
    }
    if (
      death
        ? bear
        : classDef.id === "druid" &&
          (p.activeBuff > 0 || (g.classCombat && p.kit.form === "bear"))
    ) {
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
    const recentAction = this.heroActions.get(p);
    const charging = p === g.player && g.battleArt.charging;
    const direction = charging
      ? g.battleArt.angle(p)
      : recentAction && g.time - recentAction.time < 0.3
        ? recentAction.facing
        : p.facing;
    if (
      !death &&
      drawHeroMotion(
        c,
        classDef.id,
        pose,
        this.motionEnabled ? this.displayTime : 0,
        direction,
        this.motionEnabled && charging
          ? g.battleArt.charge / ART_CHARGE_TIME
          : -1,
        this.motionEnabled && p.dashTimer > 0,
      )
    ) {
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
        78,
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
    c.translate(x, y);
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
        c.save();
        c.globalAlpha = (e.flash / 0.12) * 0.7;
        c.strokeStyle = "#fff0c4";
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(e.x - 10 * scale, e.y - 32 * scale);
        c.lineTo(e.x + 5 * scale, e.y - 22 * scale);
        c.moveTo(e.x + 8 * scale, e.y - 36 * scale);
        c.lineTo(e.x + 13 * scale, e.y - 28 * scale);
        c.stroke();
        c.restore();
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
      const w = e.radius + 5,
        h = e.radius * 2.5;
      c.save();
      c.translate(e.x, e.y);
      c.strokeStyle = "#b6efffbb";
      c.fillStyle = "#80cbed24";
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(-w, -h * 0.65);
      c.lineTo(-w * 0.55, -h);
      c.lineTo(w * 0.35, -h * 1.12);
      c.lineTo(w, -h * 0.75);
      c.lineTo(w * 0.85, h * 0.1);
      c.lineTo(-w * 0.65, h * 0.12);
      c.closePath();
      c.fill();
      c.stroke();
      c.strokeStyle = "#c8f5ff66";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-w * 0.55, -h);
      c.lineTo(w * 0.15, -h * 0.4);
      c.lineTo(-w * 0.65, h * 0.12);
      c.moveTo(w, -h * 0.75);
      c.lineTo(w * 0.15, -h * 0.4);
      c.lineTo(w * 0.85, h * 0.1);
      c.stroke();
      c.restore();
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
    c.strokeStyle = this.highContrast
      ? "#fff4b0"
      : h.linger
        ? "#c0de88"
        : warning
          ? "#efc59c"
          : "#f9ad87";
    c.lineWidth = this.highContrast ? 4 : 2;
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
      c.font = this.largeText ? "bold 18px sans-serif" : "bold 14px sans-serif";
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
  private drawCampProp(
    index: number,
    x: number,
    y: number,
    width: number,
    height = width,
  ): boolean {
    if (!this.campProps.complete || !this.campProps.naturalWidth) return false;
    const w = this.campProps.naturalWidth / 2,
      h = this.campProps.naturalHeight / 2;
    const c = this.ctx;
    c.save();
    c.imageSmoothingEnabled = true;
    c.drawImage(
      this.campProps,
      (index % 2) * w,
      Math.floor(index / 2) * h,
      w,
      h,
      x - width / 2,
      y - height,
      width,
      height,
    );
    c.restore();
    return true;
  }
  private landmark(l: Landmark) {
    const c = this.ctx,
      complete = l.state === "complete";
    c.save();
    c.translate(l.x, l.y);
    this.shadow(0, 6, l.kind === "ritual" ? 32 : 26);
    c.globalAlpha = complete ? 0.5 : 1;
    const painted = this.drawCampProp(
      l.kind === "shrine" ? 0 : l.kind === "cache" ? 1 : 3,
      0,
      l.kind === "ritual" ? 20 : 12,
      l.kind === "shrine" ? 112 : l.kind === "cache" ? 86 : 128,
    );
    if (painted) {
      if (!complete && this.particles && l.kind !== "cache") {
        const color = l.kind === "shrine" ? "#6ee5d3" : "#c491ee";
        c.save();
        c.globalCompositeOperation = "screen";
        const glow = c.createRadialGradient(0, -28, 0, 0, -28, 48);
        glow.addColorStop(0, color + "22");
        glow.addColorStop(1, color + "00");
        c.fillStyle = glow;
        c.fillRect(-48, -76, 96, 96);
        c.restore();
      }
    } else if (l.kind === "cache") {
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
      const labelY = painted
        ? l.kind === "shrine"
          ? -120
          : l.kind === "ritual"
            ? -114
            : -88
        : -82;
      c.fillRect(-textWidth / 2 - 7, labelY, textWidth + 14, 21);
      c.fillStyle = "#e3d2a2";
      c.fillText(l.name, 0, labelY + 14);
    }
    c.restore();
  }
  private minimap() {
    const c = this.ctx,
      g = this.game,
      x = this.width - 78,
      y = 185,
      r = 52,
      center = this.cameraCenter();
    if (this.width < 650) return;
    c.save();
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.clip();
    c.fillStyle = "#0b191bed";
    c.fillRect(x - r, y - r, r * 2, r * 2);
    c.strokeStyle = "#c9b67e22";
    c.lineWidth = 1;
    for (let ring = 1; ring <= 3; ring++) {
      c.beginPath();
      c.arc(x, y, ring * 16, 0, Math.PI * 2);
      c.stroke();
    }
    c.strokeStyle = "#d3bd7b40";
    c.strokeRect(
      x - this.width * 0.0225,
      y - this.height * 0.0225,
      this.width * 0.045,
      this.height * 0.045,
    );
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
