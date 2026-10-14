import type { GameEngine } from "./engine";
import type { RunRecord } from "./progression";
import { HUNT_NAMES } from "./field-hunt";

export function mountHuntHud(root: HTMLElement) {
  const panel = document.createElement("section");
  panel.className = "field-hunt-hud";
  panel.id = "field-hunt-hud";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Optional Field Hunt");
  panel.innerHTML = `<div class="hunt-heading"><span><i id="hunt-direction" aria-hidden="true">↑</i> FIELD HUNT</span><b id="hunt-timer"></b></div><strong id="hunt-name"></strong><div class="hunt-health"><i id="hunt-health-fill"></i></div><p id="hunt-tactic"></p><button data-action="interact" id="hunt-begin" class="landmark-button"><kbd>F</kbd><span>Awaken champion</span></button><small id="hunt-reward">Gold · run XP · healing · ability refresh</small>`;
  root.querySelector(".world-hud")?.append(panel);
}

export function updateHuntHud(game: GameEngine) {
  const panel = document.getElementById("field-hunt-hud");
  if (!panel) return;
  const h = game.hunt;
  panel.hidden = h.state === "idle" || h.state === "expired";
  if (panel.hidden) return;
  const text = (id: string, value: string) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  const enemy = game.enemies.find((e) => e.id === h.enemyId && !e.dead);
  const target = enemy || h;
  document.getElementById("hunt-direction")!.style.transform =
    `rotate(${Math.atan2(target.y - game.player.y, target.x - game.player.x) + Math.PI / 2}rad)`;
  const exposed = h.exposedUntil > game.time;
  panel.classList.toggle("hunt-exposed", exposed);
  panel.classList.toggle("hunt-complete", h.state === "complete");
  text(
    "hunt-timer",
    h.state === "complete"
      ? "COMPLETE"
      : `${Math.max(0, Math.ceil(h.expiresAt - game.time))}s`,
  );
  text("hunt-name", HUNT_NAMES[game.zone.id] || "The Rift Champion");
  const begin = document.getElementById("hunt-begin") as HTMLButtonElement;
  begin.hidden = h.state !== "offered";
  begin.disabled =
    !game.nearbyHunt ||
    game.paused ||
    game.choosing ||
    !!game.shrineChoice ||
    game.ended;
  const distance = Math.ceil(
    Math.hypot(h.x - game.player.x, h.y - game.player.y) / 10,
  );
  text(
    "hunt-tactic",
    h.state === "offered"
      ? `${game.nearbyHunt ? "Press F to begin" : `Violet marker · ${distance} m away`} · optional champion duel`
      : h.state === "complete"
        ? "Health restored. Dash and signature refreshed."
        : exposed
          ? `WARD BROKEN · ${Math.ceil(h.exposedUntil - game.time)}s · strike now!`
          : "Fully charge your Battle Art to break the ward. Dodge the red warnings.",
  );
  const track = panel.querySelector<HTMLElement>(".hunt-health")!;
  track.hidden = !enemy;
  if (enemy)
    document.getElementById("hunt-health-fill")!.style.width =
      `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`;
}

export function renderHuntResult(result: RunRecord) {
  return result.hunts
    ? `<p class="hunt-result">◇ ${result.hunts} Field ${result.hunts === 1 ? "Hunt" : "Hunts"} completed · champion rewards included above</p>`
    : "";
}
