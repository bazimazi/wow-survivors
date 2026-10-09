import { CLASSES, SPELLS, STAT_LABELS } from "./content";
import type {
  ClassId,
  TalentDef,
  TalentTree,
  Stat,
  SpellBonus,
} from "./content";
import { CLASSIC_TALENT_FACTS } from "./classic-talent-data";
import { CLASS_TECHNIQUES } from "./spellbook";

export type TalentMode = "survivor" | "classic";
export interface ClassicTalent extends TalentDef {
  row: number;
  column: number;
  requires?: { id: string; rank: number };
}
export interface ClassicTree extends TalentTree {
  nodes: ClassicTalent[];
}
const targets: Record<ClassId, string[][]> = {
  warrior: [
    ["cleave", "execute", "rend", "heroicstrike"],
    ["whirlwind", "cleave"],
    ["thunderclap"],
  ],
  mage: [
    ["arcane"],
    ["fireball", "flamestrike"],
    ["frostbolt", "blizzard", "frostnova"],
  ],
  rogue: [
    ["poison", "rupture", "eviscerate"],
    ["sinister", "flurry"],
    ["throw", "sinister"],
  ],
  hunter: [["beast"], ["shot", "multishot"], ["trap", "serpentsting"]],
  paladin: [
    ["judgment", "hammer", "holylight"],
    ["consecration"],
    ["holystrike", "hammer"],
  ],
  priest: [
    ["smite", "holynova"],
    ["smite", "holynova", "renew"],
    ["pain", "mindblast", "holyfire"],
  ],
  shaman: [
    ["lightning", "chainlightning", "flameshock"],
    ["totem"],
    ["magma", "totem"],
  ],
  warlock: [
    ["corruption", "agony"],
    ["imp"],
    ["shadowbolt", "immolate", "searingpain"],
  ],
  druid: [
    ["wrath", "moonfire", "hurricane"],
    ["thorns"],
    ["rejuvenation", "moonfire", "hurricane"],
  ],
};
const colors = ["#c9a986", "#a7be87", "#8dbbce"];
function effect(name: string): {
  stat: Stat;
  value: number;
  bonus?: SpellBonus;
} {
  if (
    /deflection|shield|armor|armour|toughness|parry|block|anticipation|ward|resistance|defense|defence/i.test(
      name,
    )
  )
    return { stat: "armor", value: 0.8 };
  if (
    /stamina|endurance|vitality|fortitude|last stand|survivalist|thick hide|strength|heart of the wild/i.test(
      name,
    )
  )
    return { stat: "health", value: 5 };
  if (
    /spirit|regeneration|recovery|meditation|healing|restoration|rejuvenation|renew|vampiric/i.test(
      name,
    )
  )
    return { stat: "regen", value: 0.08 };
  if (
    /pathfinding|feline|camouflage|stealth|ghost wolf|fleet|swiftness/i.test(
      name,
    )
  )
    return { stat: "speed", value: 2 };
  if (/range|reach|hawk eye|detection|perception|eye of|tracking/i.test(name))
    return { stat: "magnet", value: 5 };
  if (
    /precision|cruelty|critical|lethality|impale|shatter|malice|deadliness|devastation|keen/i.test(
      name,
    )
  )
    return { stat: "crit", value: 1 };
  if (
    /flurry|speed|haste|lightning mastery|improved .*bolt|improved .*fireball|improved .*strike|serpent.*reflex/i.test(
      name,
    )
  )
    return { stat: "haste", value: 2, bonus: { haste: 3 } };
  if (
    /mana|cost|efficien|conservation|concentration|clearcasting|illumination|mental agility/i.test(
      name,
    )
  )
    return { stat: "power", value: 0, bonus: { costReduction: 3 } };
  return { stat: "power", value: 3, bonus: { power: 3 } };
}
const percent = (key: string) =>
  ["power", "haste", "crit", "speed", "magnet", "costReduction"].includes(key)
    ? "%"
    : "";
export const CLASSIC_TREES = Object.fromEntries(
  CLASSES.map((c) => [
    c.id,
    CLASSIC_TALENT_FACTS[c.id].map(([name, facts], tree) => {
      const nodes: ClassicTalent[] = facts.map(
        ([title, max, row, column, dependency, dependencyRank], index) => {
          const { stat, value, bonus } = effect(title),
            spellIds = targets[c.id][tree].filter((id) => SPELLS[id]);
          const applied = bonus && spellIds.length ? bonus : undefined;
          const technique = CLASS_TECHNIQUES.find(
            (t) => t.classId === c.id && t.spell.name === title,
          );
          const description = applied
            ? `${Object.entries(applied)
                .map(
                  ([key, amount]) =>
                    `+${amount}${percent(key)} ${key === "costReduction" ? "resource cost reduction" : STAT_LABELS[key as Stat]}`,
                )
                .join(
                  " · ",
                )} per rank for ${spellIds.map((id) => SPELLS[id].name).join(", ")}.`
            : `+${value}${percent(stat)} ${STAT_LABELS[stat]} per rank.`;
          return {
            id: `classic_${c.id}_${tree}_${index}`,
            name: title,
            icon: applied
              ? SPELLS[spellIds[0]].icon
              : {
                  armor: "shield",
                  health: "heart",
                  regen: "leaf",
                  speed: "boot",
                  magnet: "spark",
                  crit: "target",
                  haste: "whirl",
                  power: "sword",
                }[stat],
            stat,
            value,
            max,
            required: (row - 1) * 5,
            row,
            column,
            description:
              description +
              (technique
                ? ` Also learns ${title} free at character level ${technique.level} or above; learning stays with this hero.`
                : ""),
            ...(technique ? { grantsTechnique: technique.spell.id } : {}),
            ...(applied ? { spellIds, bonus: applied } : {}),
            ...(dependency === undefined
              ? {}
              : {
                  requires: {
                    id: `classic_${c.id}_${tree}_${dependency}`,
                    rank: dependencyRank!,
                  },
                }),
          };
        },
      );
      return { name, color: colors[tree], nodes };
    }),
  ]),
) as Record<ClassId, ClassicTree[]>;
export const classicTalentBudget = (level: number) =>
  Math.max(0, Math.min(51, Math.floor(level) - 9));
