import type { ClassId, SpellDef, SpellBonus } from "./content";

export interface SpellbookProgress {
  learned: string[];
  prepared: string[];
}
export interface ClassTechnique {
  classId: ClassId;
  level: number;
  gold: number;
  school: string;
  parent: string;
  spell: SpellDef;
}
export const CLASS_MENTORS: Record<ClassId, string> = {
  warrior: "Veteran Ironwatch",
  mage: "Arcanist Wintermere",
  rogue: "Shadowblade Duskwick",
  hunter: "Ranger Ashtrail",
  paladin: "Knight Dawnwarden",
  priest: "Chaplain Lightwell",
  shaman: "Spiritwalker Stormreed",
  warlock: "Binder Emberveil",
  druid: "Keeper Moonbough",
};
function technique(
  classId: ClassId,
  level: number,
  school: string,
  parent: string,
  id: string,
  name: string,
  icon: string,
  kind: SpellDef["kind"],
  color: string,
  damage: number,
  cooldown: number,
  range: number,
  cost: number,
  description: string,
  evolution: string,
  extra: Partial<SpellDef> = {},
): ClassTechnique {
  return {
    classId,
    level,
    gold: level === 5 ? 40 : 120,
    school,
    parent,
    spell: {
      id,
      name,
      icon,
      kind,
      color,
      damage,
      cooldown,
      range,
      cost,
      count: 1,
      description,
      evolution,
      ...extra,
    },
  };
}
export const CLASS_TECHNIQUES: ClassTechnique[] = [
  technique(
    "warrior",
    5,
    "Arms",
    "cleave",
    "rend",
    "Rend",
    "drop",
    "dot",
    "#d09278",
    12,
    3.8,
    115,
    8,
    "Bleed one nearby enemy for three ticks over six seconds. Spreads to unmarked targets.",
    "Bloodletter's Rend",
    { periodic: { ticks: 3, interval: 2 } },
  ),
  technique(
    "warrior",
    12,
    "Arms",
    "execute",
    "heroicstrike",
    "Heroic Strike",
    "sword",
    "melee",
    "#e3c99b",
    55,
    1.9,
    110,
    12,
    "A powerful strike against one nearby enemy.",
    "Champion's Strike",
    { singleTarget: true },
  ),
  technique(
    "mage",
    5,
    "Frost",
    "blizzard",
    "frostnova",
    "Frost Nova",
    "snow",
    "nova",
    "#a3dbea",
    20,
    5.5,
    150,
    16,
    "Root nearby ordinary enemies for 1.2 seconds. Bosses are slowed instead.",
    "Winter's Nova",
    { slow: 0.6, freeze: 1.2 },
  ),
  technique(
    "mage",
    12,
    "Fire",
    "fireball",
    "flamestrike",
    "Flamestrike",
    "flame",
    "ground",
    "#efaa72",
    28,
    6,
    135,
    22,
    "An impact of fire followed by a burning patch beneath an enemy.",
    "Inferno Pillar",
    { impact: 0.7 },
  ),
  technique(
    "rogue",
    5,
    "Assassination",
    "poison",
    "rupture",
    "Rupture",
    "drop",
    "dot",
    "#d38591",
    14,
    3.8,
    105,
    16,
    "Bleed one nearby enemy for four ticks over eight seconds.",
    "Scarlet Rupture",
    { periodic: { ticks: 4, interval: 2 } },
  ),
  technique(
    "rogue",
    12,
    "Combat",
    "sinister",
    "eviscerate",
    "Eviscerate",
    "dagger",
    "melee",
    "#e5b2aa",
    68,
    2.5,
    95,
    24,
    "An energy-heavy finishing strike against one nearby enemy.",
    "Perfect Evisceration",
    { singleTarget: true },
  ),
  technique(
    "hunter",
    5,
    "Survival",
    "shot",
    "serpentsting",
    "Serpent Sting",
    "drop",
    "dot",
    "#a6bf73",
    10,
    3.8,
    600,
    12,
    "Poison an enemy for four ticks over eight seconds. Spreads to unmarked targets.",
    "Venomous Sting",
    { periodic: { ticks: 4, interval: 2 } },
  ),
  technique(
    "hunter",
    12,
    "Marksmanship",
    "multishot",
    "volley",
    "Volley",
    "bow",
    "ground",
    "#d8c09c",
    24,
    5.5,
    145,
    20,
    "Rain arrows into a target area while you keep moving.",
    "Arrow Tempest",
  ),
  technique(
    "paladin",
    5,
    "Holy",
    "judgment",
    "holylight",
    "Holy Light",
    "heart",
    "heal",
    "#f1d696",
    14,
    7,
    0,
    18,
    "Automatically heal yourself while injured. Can critically heal.",
    "Dawn's Light",
  ),
  technique(
    "paladin",
    12,
    "Retribution",
    "hammer",
    "hammerwrath",
    "Hammer of Wrath",
    "sun",
    "projectile",
    "#efcc87",
    80,
    3.8,
    600,
    16,
    "Throw a holy hammer only at an enemy with 20% health or less.",
    "Hammer of Reckoning",
    { executeBelow: 0.2 },
  ),
  technique(
    "priest",
    5,
    "Holy",
    "holynova",
    "renew",
    "Renew",
    "heart",
    "heal",
    "#dfd7a2",
    4.5,
    8,
    0,
    16,
    "Heal yourself in four pulses over eight seconds. Waits while already active or uninjured.",
    "Enduring Renew",
    { periodic: { ticks: 4, interval: 2 } },
  ),
  technique(
    "priest",
    12,
    "Holy",
    "smite",
    "holyfire",
    "Holy Fire",
    "flame",
    "dot",
    "#edbc85",
    9,
    4.5,
    600,
    16,
    "Strike with holy fire, then burn the target for four ticks over eight seconds.",
    "Dawnfire",
    { periodic: { ticks: 4, interval: 2 }, impact: 2 },
  ),
  technique(
    "shaman",
    5,
    "Elemental",
    "lightning",
    "flameshock",
    "Flame Shock",
    "flame",
    "dot",
    "#ed9b71",
    9,
    4,
    550,
    12,
    "An instant fire impact followed by four burning ticks over six seconds.",
    "Searing Shock",
    { periodic: { ticks: 4, interval: 1.5 }, impact: 1.5 },
  ),
  technique(
    "shaman",
    12,
    "Elemental",
    "chainlightning",
    "frostshock",
    "Frost Shock",
    "snow",
    "projectile",
    "#a3d3df",
    40,
    2.8,
    550,
    14,
    "A frost bolt damages an enemy and slows its movement.",
    "Glacial Shock",
    { slow: 0.5 },
  ),
  technique(
    "warlock",
    5,
    "Affliction",
    "corruption",
    "agony",
    "Curse of Agony",
    "skull",
    "dot",
    "#b39abc",
    9,
    4,
    600,
    14,
    "Curse an enemy for six ticks over twelve seconds. Later ticks grow up to 50% stronger.",
    "Agony Unbound",
    { periodic: { ticks: 6, interval: 2, ramp: true } },
  ),
  technique(
    "warlock",
    12,
    "Destruction",
    "immolate",
    "searingpain",
    "Searing Pain",
    "flame",
    "projectile",
    "#e79a76",
    38,
    1.6,
    600,
    12,
    "A quick, focused fire attack against an enemy.",
    "Tormenting Flame",
  ),
  technique(
    "druid",
    5,
    "Restoration",
    "hurricane",
    "rejuvenation",
    "Rejuvenation",
    "leaf",
    "heal",
    "#a9c995",
    5,
    7,
    0,
    14,
    "Heal yourself in three pulses over six seconds without stacking.",
    "Verdant Rejuvenation",
    { periodic: { ticks: 3, interval: 2 } },
  ),
  technique(
    "druid",
    12,
    "Balance",
    "moonfire",
    "starfire",
    "Starfire",
    "moon",
    "projectile",
    "#bdc7e8",
    65,
    2.8,
    650,
    18,
    "A heavy arcane star bolt rewards careful positioning.",
    "Astral Starfire",
  ),
];
export const TECHNIQUE_MAP = Object.fromEntries(
  CLASS_TECHNIQUES.map((t) => [t.spell.id, t]),
) as Record<string, ClassTechnique>;
export const freshSpellbook = (core: readonly string[]): SpellbookProgress => ({
  learned: [],
  prepared: [...core],
});
export const lockedClassSpell = (
  classId: ClassId,
  id: string,
  core: readonly string[],
) =>
  id === core[0] || (["hunter", "warlock"].includes(classId) && id === core[2]);
export function normalizeSpellbook(
  classId: ClassId,
  level: number,
  raw: unknown,
  core: readonly string[],
): SpellbookProgress {
  const data =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const learned = Array.isArray(data.learned)
    ? [
        ...new Set(
          data.learned
            .slice(0, 32)
            .filter(
              (id): id is string =>
                typeof id === "string" &&
                Object.hasOwn(TECHNIQUE_MAP, id) &&
                TECHNIQUE_MAP[id].classId === classId &&
                level >= TECHNIQUE_MAP[id].level,
            ),
        ),
      ]
    : [];
  const known = new Set([...core, ...learned]),
    proposed = Array.isArray(data.prepared)
      ? data.prepared
          .slice(0, 32)
          .filter((id): id is string => typeof id === "string" && known.has(id))
      : [...core];
  const prepared = [...new Set(proposed)].slice(0, 4);
  if (!prepared.length) prepared.push(...core);
  for (const id of core.filter((id) => lockedClassSpell(classId, id, core))) {
    if (!prepared.includes(id)) {
      if (prepared.length === 4)
        prepared.splice(
          prepared.length -
            1 -
            [...prepared]
              .reverse()
              .findIndex((id) => !lockedClassSpell(classId, id, core)),
          1,
        );
      prepared.unshift(id);
    }
  }
  for (const id of core)
    if (prepared.length < 4 && !prepared.includes(id)) prepared.push(id);
  // The starting attack keeps its first slot. Other preparation order is retained.
  return {
    learned,
    prepared: [core[0], ...prepared.filter((id) => id !== core[0])].slice(0, 4),
  };
}
export function compatibleSpellBonus(
  spell: SpellDef,
  key: keyof SpellBonus,
): boolean {
  if (key === "area")
    return (
      !spell.singleTarget &&
      ["melee", "nova", "orbit", "ground"].includes(spell.kind)
    );
  if (key === "projectiles" || key === "pierce")
    return (
      ["projectile", "pet", "chain"].includes(spell.kind) &&
      !(key === "pierce" && spell.kind === "chain")
    );
  if (key === "leech") return spell.kind !== "heal";
  if (key === "crit")
    return (
      (spell.kind !== "heal" && (spell.kind !== "dot" || !!spell.impact)) ||
      (spell.kind === "heal" && !spell.periodic)
    );
  if (key === "costReduction") return !!spell.cost;
  return true;
}
