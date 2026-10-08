import type { AnimationRig } from "./animation";
import { DUSKWOOD_SPRITES } from "./duskwood";
import { SHADOWFANG_SPRITES } from "./shadowfang";

export type CreatureAtlas = "world" | "ragefire" | "shadowfang" | "duskwood";
export interface CreatureArt {
  atlas: CreatureAtlas;
  index: number;
  rig: AnimationRig;
  stride: number;
  size: number;
}
const art = (
  atlas: CreatureAtlas,
  index: number,
  rig: AnimationRig,
  stride: number,
  size: number,
): CreatureArt => ({ atlas, index, rig, stride, size });

/** Rendering metadata only; enemy stats and encounter definitions remain in the engine. */
export const CREATURE_ART: Readonly<Record<string, CreatureArt>> = {
  wolf: art("world", 8, "quadruped", 40, 51),
  kobold: art("world", 9, "biped", 34, 59),
  gnoll: art("world", 10, "biped", 40, 59),
  skeleton: art("world", 11, "biped", 36, 59),
  ghoul: art("world", 12, "biped", 34, 59),
  wraith: art("world", 13, "hover", 44, 59),
  defias: art("world", 14, "biped", 38, 59),
  blackguard: art("world", 14, "biped", 38, 59),
  golem: art("world", 15, "heavy", 50, 59),
  trogg: art("ragefire", 0, "heavy", 36, 65),
  earthborer: art("ragefire", 1, "slither", 26, 56),
  molten: art("ragefire", 2, "heavy", 50, 65),
  cultist: art("ragefire", 3, "robe", 36, 65),
  voidwalker: art("ragefire", 4, "hover", 42, 65),
  oggleflint: art("ragefire", 5, "heavy", 46, 65),
  taragaman: art("ragefire", 6, "biped", 52, 65),
  jergosh: art("ragefire", 7, "robe", 38, 65),
  bazzalan: art("ragefire", 8, "biped", 40, 65),
  keep_worg: art(
    "shadowfang",
    SHADOWFANG_SPRITES.keep_worg,
    "quadruped",
    38,
    66,
  ),
  keep_worgen: art(
    "shadowfang",
    SHADOWFANG_SPRITES.keep_worgen,
    "biped",
    40,
    72,
  ),
  keep_servitor: art(
    "shadowfang",
    SHADOWFANG_SPRITES.keep_servitor,
    "hover",
    42,
    72,
  ),
  keep_guard: art("shadowfang", SHADOWFANG_SPRITES.keep_guard, "biped", 38, 72),
  keep_void: art("shadowfang", SHADOWFANG_SPRITES.keep_void, "hover", 44, 72),
  silverlaine: art(
    "shadowfang",
    SHADOWFANG_SPRITES.silverlaine,
    "hover",
    44,
    72,
  ),
  springvale: art("shadowfang", SHADOWFANG_SPRITES.springvale, "biped", 42, 72),
  fenrus: art("shadowfang", SHADOWFANG_SPRITES.fenrus, "quadruped", 60, 66),
  arugal: art("shadowfang", SHADOWFANG_SPRITES.arugal, "robe", 38, 72),
  dusk_wolf: art("duskwood", DUSKWOOD_SPRITES.dusk_wolf, "quadruped", 40, 68),
  dusk_spider: art(
    "duskwood",
    DUSKWOOD_SPRITES.dusk_spider,
    "arachnid",
    32,
    68,
  ),
  dusk_rotted: art("duskwood", DUSKWOOD_SPRITES.dusk_rotted, "biped", 32, 68),
  dusk_raider: art("duskwood", DUSKWOOD_SPRITES.dusk_raider, "biped", 38, 68),
  dusk_worgen: art("duskwood", DUSKWOOD_SPRITES.dusk_worgen, "biped", 40, 68),
  dusk_mage: art("duskwood", DUSKWOOD_SPRITES.dusk_mage, "robe", 36, 68),
  dusk_ogre: art("duskwood", DUSKWOOD_SPRITES.dusk_ogre, "heavy", 52, 68),
  dusk_defias: art("duskwood", DUSKWOOD_SPRITES.dusk_defias, "biped", 38, 68),
  stitches: art("duskwood", DUSKWOOD_SPRITES.stitches, "heavy", 56, 78),
};
