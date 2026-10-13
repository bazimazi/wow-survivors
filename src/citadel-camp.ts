import { CLASSES, CLASS_MAP, SPELLS, ZONES } from "./content";
import type { ClassId } from "./content";
import {
  heroStats,
  zoneUnlocked,
  expeditionRestriction,
  characterXpRequired,
} from "./progression";
import type { SaveData } from "./progression";
import { CLASS_KITS } from "./class-combat";
import { DIFFICULTIES, OATHS, adventureStats } from "./adventure";
import { icon } from "./icons";
import { dungeonOptionText } from "./dungeon-ui";

const portrait = (index: number) =>
  `<div class="portrait" style="background-position:${(index % 3) * 50}% ${Math.floor(index / 3) * 50}%" role="img" aria-label="${CLASSES[index].name}"></div>`;

/** A departure screen: hero, destination, launch. Camp services live behind explicit actions. */
export function renderCitadelCamp(save: SaveData, partner: ClassId | "") {
  const hero = CLASS_MAP[save.selectedClass],
    progress = save.heroes[hero.id];
  const zone = ZONES.find((z) => z.id === save.selectedZone)!;
  const stats = adventureStats(
      heroStats(save),
      save.adventure.oath,
      save.adventure.relic,
    ),
    kit = CLASS_KITS[hero.id];
  const restriction =
    expeditionRestriction(save, zone.id) ||
    (partner
      ? expeditionRestriction({ ...save, selectedClass: partner }, zone.id)
      : null);
  return `<div class="departure-screen" style="--class-color:${hero.color}">
    <div class="camp-scene" aria-hidden="true"></div><div class="camp-motes" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
    <section class="departure-intro"><div class="eyebrow world-label"><span class="status-dot"></span> THE CAMP · ${zone.id === "ragefire" ? "KALIMDOR" : "EASTERN KINGDOMS"}</div><h1>The wilds<br>are calling<span>.</span></h1><p>Stand against the horde.<br>Come back a legend.</p><div class="campaign-record"><span>${icon("sword", 15)} <b>${save.totals.kills.toLocaleString()}</b> slain</span><span>${icon("crown", 15)} <b>${save.totals.wins}</b> victories</span></div><button class="camp-service-link" data-action="camp-services">${icon("camp", 20)} Camp services <span aria-hidden="true">→</span></button><button class="camp-service-link" data-action="prepare-run">${icon("rune", 20)} Difficulty & build <span aria-hidden="true">→</span></button></section>
    <section class="hero-stage" aria-label="Selected hero"><div class="hero-stage-caption"><span class="eyebrow">${hero.faction} · ${hero.race}</span><div class="hero-art-name"><h2>${hero.name}</h2><p>${hero.subtitle}</p></div></div><canvas id="camp-hero-canvas" aria-label="Animated ${hero.name}"></canvas><div class="stage-plinth" aria-hidden="true"></div><div class="stage-level">${icon(hero.id, 18)} LEVEL ${progress.level}</div><div class="stage-xp" title="Character experience"><i style="width:${Math.min(100, (progress.xp / characterXpRequired(progress.level)) * 100)}%"></i></div><div class="hero-stage-stats"><span>${icon("heart", 15)} ${Math.round(stats.health)} <small>HEALTH</small></span><span>${icon("sword", 15)} +${Math.round(stats.power)}% <small>POWER</small></span><span>${icon("target", 15)} ${Math.round(stats.crit)}% <small>CRIT</small></span></div><div class="hero-stage-kit"><span style="color:${SPELLS[hero.spells[0]].color}">${icon(SPELLS[hero.spells[0]].icon, 19)} ${SPELLS[hero.spells[0]].name}</span><span><kbd>C</kbd> ${kit.action}</span><span><kbd>SPACE</kbd> ${kit.dash}</span></div></section>
    <section class="departure-mission" aria-label="Selected expedition"><div class="mission-topline"><span class="eyebrow">01 / CHOOSE YOUR BATTLE</span>${icon("compass", 19)}</div><div class="mission-art zone-${zone.id}"><div class="world-image"></div><span class="mission-tag">${zone.dungeon ? "DUNGEON" : "SURVIVAL EXPEDITION"}</span></div><div class="mission-copy"><span class="world-kicker">${zone.subtitle}</span><h2>${zone.name}</h2><p>${zone.description}</p><div class="mission-facts"><span>${icon("whirl", 16)} ${Math.round(zone.duration / 60)} MIN</span><span>${icon("shield", 16)} ${DIFFICULTIES[save.adventure.difficulty].name}</span><span>${icon("skull", 16)} ${zone.boss}</span></div><div class="destination-list" aria-label="Choose expedition">${ZONES.map((z) => `<button class="zone-option ${z.id === zone.id ? "selected" : ""} ${zoneUnlocked(save, z.id) ? "" : "locked"}" data-action="zone" data-id="${z.id}" aria-pressed="${z.id === zone.id}" title="${z.unlockText}">${icon(zoneUnlocked(save, z.id) ? z.icon : "lock", 16)}<span>${z.name}</span><span class="sr-only">${z.dungeon ? dungeonOptionText(save, z.id) : z.unlockText}</span>${z.id === zone.id ? icon("check", 13) : ""}</button>`).join("")}</div><label class="coop-selector">PARTY<select id="coop-hero"><option value="">Solo expedition</option>${CLASSES.filter(
      (c) => c.id !== hero.id,
    )
      .map(
        (c) =>
          `<option value="${c.id}" ${partner === c.id ? "selected" : ""}>Local co-op · ${c.name} · Lv. ${save.heroes[c.id].level}</option>`,
      )
      .join(
        "",
      )}</select></label>${partner ? '<p class="coop-intro">P1: WASD · C · Space. P2: arrows · Enter · Backspace. Stay close to revive your ally.</p>' : ""}<button data-action="begin" class="button primary expedition-button" ${restriction ? `disabled title="${restriction}"` : ""}><span>${icon("sword", 20)} Begin ${zone.dungeon ? "Dungeon" : "Expedition"}</span>${icon("arrow", 20)}</button><div class="departure-build"><span>${OATHS.find((o) => o.id === save.adventure.oath)?.name}</span><span>KEYSTONES · 4 / 8 / 12</span></div><small class="mission-footnote world-hint">${restriction || "Aim with the mouse. Hold V to charge. Space to dodge."}</small></div></section>
    <section class="hero-roster"><div class="roster-heading"><span class="eyebrow">02 / CHOOSE YOUR HERO</span><span>NINE CLASSES · ONE LEGEND</span></div><div class="class-grid">${CLASSES.map((c) => `<button class="class-card ${c.id === hero.id ? "selected" : ""}" style="--class-color:${c.color}" data-action="hero" data-id="${c.id}" aria-label="${c.name} ${c.subtitle}" aria-pressed="${c.id === hero.id}">${portrait(c.portrait)}<span class="class-copy"><b>${c.name}</b><small>LV. ${save.heroes[c.id].level}</small></span><span class="class-symbol">${icon(c.id, 14)}</span></button>`).join("")}</div></section>
  </div>`;
}
