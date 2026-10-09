import type { Material, Stats } from "./content";
import { wardrobeDungeonLoot } from "./wardrobe";
import { accessoryDungeonLoot } from "./accessories";
import { necklaceDungeonLoot } from "./necklaces";
import { offhandDungeonLoot } from "./offhands";
import { dualWieldDungeonLoot } from "./dual-wield";
import { rangedDungeonLoot } from "./ranged";
import { trainedWeaponDungeonLoot } from "./weapon-training";
import { SHADOWFANG_STAGES } from "./shadowfang";
import { SCARLET_STAGES } from "./endgame";

export interface DungeonStage {
  id: string;
  name: string;
  description: string;
  duration: number;
  bounds: { x: number; y: number };
  boss: string;
  enemy: string;
  baseHealth: number;
  tactic: string;
  loot: string[];
  gold: number;
  materials: Partial<Record<Material, number>>;
  enemies?: string[];
}
export const DEADMINES_STAGES: DungeonStage[] = [
  {
    id: "mast-room",
    name: "The Mast Room",
    description:
      "Clear the workshop. The Shredder guards the route to the ship.",
    duration: 90,
    bounds: { x: 740, y: 600 },
    boss: "Sneed's Shredder",
    enemy: "golem",
    baseHealth: 34,
    tactic: "Sidestep the saw lane. Leave the furnace blasts.",
    loot: ["miner_token", "tunnelwalker_boots", "foundry_grips"],
    gold: 50,
    materials: { ore: 4 },
  },
  {
    id: "ironclad-approach",
    name: "The Ironclad Approach",
    description:
      "Hold the dock. Mr. Smite stands between you and the upper deck.",
    duration: 105,
    bounds: { x: 680, y: 660 },
    boss: "Mr. Smite",
    enemy: "smite",
    baseHealth: 38,
    tactic:
      "Leave the hammer circles. Step through the stomp ring's safe center.",
    loot: [
      "dockmaster_maul",
      "rigging_longbow",
      "rigging_staff",
      "boarding_sabre",
    ],
    gold: 50,
    materials: { cloth: 5 },
  },
  {
    id: "captains-deck",
    name: "The Captain's Deck",
    description:
      "Break the Brotherhood. Edwin VanCleef awaits on the Ironclad.",
    duration: 120,
    bounds: { x: 640, y: 760 },
    boss: "Edwin VanCleef",
    enemy: "defias",
    baseHealth: 42,
    tactic:
      "Move between crossing blades. Escape the ambush and clear blackguards.",
    loot: ["corsair_regalia", "brotherhood_jerkin", "captains_seal"],
    gold: 100,
    materials: { dust: 3 },
  },
];
export const DUNGEON_BOONS: {
  id: string;
  name: string;
  description: string;
  icon: string;
  stats: Partial<Stats>;
}[] = [
  {
    id: "edge",
    name: "Sharpened Resolve",
    description: "+10% damage for the remaining dungeon.",
    icon: "sword",
    stats: { power: 10 },
  },
  {
    id: "guard",
    name: "Steady Shelter",
    description:
      "+6 armor and +0.5 health per second for the remaining dungeon.",
    icon: "shield",
    stats: { armor: 6, regen: 0.5 },
  },
  {
    id: "stride",
    name: "Sure Footwork",
    description:
      "+8% movement speed and +20% pickup radius for the remaining dungeon.",
    icon: "boot",
    stats: { speed: 8, magnet: 20 },
  },
];
export const DUNGEON_MIN_LEVEL = 10;

export const RAGEFIRE_STAGES: DungeonStage[] = [
  {
    id: "trogg-refuge",
    name: "The Trogg Refuge",
    description: "Break the chieftain's hold on the upper tunnels.",
    duration: 60,
    bounds: { x: 700, y: 580 },
    boss: "Oggleflint",
    enemy: "oggleflint",
    baseHealth: 28,
    enemies: ["trogg", "earthborer", "molten"],
    tactic: "Step between the cleaving lanes. Leave the falling-stone circles.",
    loot: ["chasm_stone", "trogg_grips"],
    gold: 40,
    materials: { ore: 3 },
  },
  {
    id: "molten-crossing",
    name: "The Molten Crossing",
    description: "Hold the basalt island above the rivers of fire.",
    duration: 75,
    bounds: { x: 660, y: 620 },
    boss: "Taragaman the Hungerer",
    enemy: "taragaman",
    baseHealth: 32,
    enemies: ["molten", "earthborer", "cultist"],
    tactic: "Find the fire ring's safe center. Sidestep the uppercut lane.",
    loot: ["cinder_boots", "slag_blade", "ash_bow", "ember_branch"],
    gold: 45,
    materials: { ore: 3, dust: 1 },
  },
  {
    id: "invokers-sanctum",
    name: "The Invoker's Sanctum",
    description: "Silence the ritual and clear the summoned void spirits.",
    duration: 90,
    bounds: { x: 720, y: 580 },
    boss: "Jergosh the Invoker",
    enemy: "jergosh",
    baseHealth: 34,
    enemies: ["cultist", "voidwalker", "molten"],
    tactic:
      "Dodge the shadow lanes. Move out of the summons and clear their minions.",
    loot: ["searing_hood", "invoker_seal"],
    gold: 50,
    materials: { cloth: 4, dust: 1 },
  },
  {
    id: "hidden-overlook",
    name: "The Hidden Overlook",
    description:
      "Confront the assassin above the Searing Blade's gathering place.",
    duration: 90,
    bounds: { x: 620, y: 680 },
    boss: "Bazzalan",
    enemy: "bazzalan",
    baseHealth: 36,
    enemies: ["cultist", "trogg", "voidwalker"],
    tactic:
      "Sidestep the blade dash. Escape the poison circles before they burst.",
    loot: ["satyr_wraps", "cleft_mantle", "chasm_helm"],
    gold: 65,
    materials: { cloth: 3, dust: 2 },
  },
];

export interface DungeonRoute {
  id: string;
  name: string;
  stages: DungeonStage[];
  prerequisite: string;
  minLevel: number;
  victoryText: string;
}
export const DUNGEONS: DungeonRoute[] = [
  {
    id: "deadmines",
    name: "the Deadmines",
    stages: DEADMINES_STAGES,
    prerequisite: "westfall",
    minLevel: DUNGEON_MIN_LEVEL,
    victoryText: "The Brotherhood's command is broken.",
  },
  {
    id: "ragefire",
    name: "Ragefire Chasm",
    stages: RAGEFIRE_STAGES,
    prerequisite: "tirisfal",
    minLevel: 10,
    victoryText: "The Searing Blade's hidden command has fallen.",
  },
  {
    id: "shadowfang",
    name: "Shadowfang Keep",
    stages: SHADOWFANG_STAGES,
    prerequisite: "ragefire",
    minLevel: 15,
    victoryText: "Arugal's hold on the haunted castle is broken.",
  },
];
DUNGEONS.push({
  id: "scarlet",
  name: "Scarlet Monastery",
  stages: SCARLET_STAGES,
  prerequisite: "duskwood",
  minLevel: 25,
  victoryText:
    "The northern cathedral falls silent. A road into the Plaguelands opens.",
});
for (const route of DUNGEONS)
  route.stages.forEach((stage, index) =>
    stage.loot.push(
      ...wardrobeDungeonLoot(route.id, index),
      ...accessoryDungeonLoot(route.id, index),
      ...necklaceDungeonLoot(route.id, index),
      ...offhandDungeonLoot(route.id, index),
      ...dualWieldDungeonLoot(route.id, index),
      ...rangedDungeonLoot(route.id, index),
      ...trainedWeaponDungeonLoot(route.id, index),
    ),
  );
export const dungeonRoute = (id: string) => DUNGEONS.find((d) => d.id === id);
export const DUNGEON_MAX_GUARDIANS = Math.max(
  ...DUNGEONS.map((d) => d.stages.length),
);
