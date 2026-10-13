import { ART_CHARGE_TIME, BATTLE_ARTS } from "./battle-arts";
import type { GameEngine } from "./engine";
import type { GameRenderer } from "./renderer";

export function mountBattleArtInput(game: GameEngine, renderer: GameRenderer) {
  const canvas = renderer.canvas,
    button = document.getElementById("battle-art-button")!;
  let pointer: { x: number; y: number } | null = null;
  const updateAim = () => {
    if (pointer) game.battleArt.aim = renderer.worldPoint(pointer.x, pointer.y);
  };
  const aim = (event: PointerEvent) => {
    if (event.pointerType !== "touch") {
      pointer = { x: event.clientX, y: event.clientY };
      updateAim();
    }
  };
  canvas.addEventListener("pointermove", aim);
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  canvas.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") return;
    aim(event);
    if (event.button === 2) {
      event.preventDefault();
      game.activate();
      return;
    }
    if (event.button === 0 && game.beginBattleArt())
      canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointerup", (event) => {
    if (event.button === 0) {
      aim(event);
      game.releaseBattleArt();
    }
  });
  canvas.addEventListener("pointercancel", () => game.battleArt.cancel());
  canvas.addEventListener("lostpointercapture", () => game.battleArt.cancel());
  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    pointer = null;
    game.battleArt.aim = null;
    if (game.beginBattleArt()) button.setPointerCapture(event.pointerId);
  });
  button.addEventListener("pointerup", () => game.releaseBattleArt());
  button.addEventListener("pointercancel", () => game.battleArt.cancel());
  button.addEventListener("lostpointercapture", () => game.battleArt.cancel());
  button.addEventListener("keydown", (event) => {
    if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) game.beginBattleArt();
    }
  });
  button.addEventListener("keyup", (event) => {
    if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      game.releaseBattleArt();
    }
  });
  return {
    updateAim,
    clearAim() {
      pointer = null;
      game.battleArt.aim = null;
    },
  };
}
export function updateBattleArtHud(game: GameEngine) {
  const button = document.getElementById(
    "battle-art-button",
  ) as HTMLButtonElement | null;
  if (!button) return;
  const state = game.battleArt,
    art = BATTLE_ARTS[game.classDef.id];
  button.dataset.state = state.charging
    ? "charging"
    : state.cooldown > 0
      ? "cooldown"
      : "ready";
  button.setAttribute(
    "aria-label",
    `${art.name}: ${state.charging ? "release to fire" : state.cooldown > 0 ? state.cooldown.toFixed(1) + " seconds" : "hold to charge"}`,
  );
  button.querySelector("b")!.textContent = state.charging
    ? state.charge >= ART_CHARGE_TIME
      ? "RELEASE!"
      : "Charging…"
    : state.cooldown > 0
      ? state.cooldown.toFixed(1) + "s"
      : art.name;
  (button.querySelector("i") as HTMLElement).style.height =
    `${state.charging ? (state.charge / ART_CHARGE_TIME) * 100 : (state.cooldown / art.cooldown) * 100}%`;
}
