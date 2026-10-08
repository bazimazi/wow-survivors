import { CONTROLLER_BINDINGS } from "./controller";
import type { Direction } from "./controller";

const selector =
  'button,a[href],select,input:not([type="file"]),summary,[tabindex="0"]';
export function controllerTargets(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>(selector)].filter(
    (el) =>
      !el.matches(":disabled,[hidden],[aria-disabled='true']") &&
      !el.closest("[hidden],[inert]") &&
      el.getClientRects().length > 0 &&
      getComputedStyle(el).visibility !== "hidden",
  );
}
function focus(el?: HTMLElement) {
  el?.focus({ preventScroll: true });
  el?.scrollIntoView({ block: "nearest", inline: "nearest" });
}
export function ensureControllerFocus(root: HTMLElement) {
  const targets = controllerTargets(root);
  if (!targets.includes(document.activeElement as HTMLElement))
    focus(targets[0]);
}
export function cycleControllerFocus(root: HTMLElement, delta: number) {
  const targets = controllerTargets(root);
  if (!targets.length) return;
  const index = targets.indexOf(document.activeElement as HTMLElement);
  focus(targets[(index + delta + targets.length) % targets.length]);
}
export function changeControllerSelect(el: HTMLSelectElement, delta: number) {
  const options = [...el.options].filter((option) => !option.disabled);
  if (!options.length) return;
  const index = options.indexOf(el.selectedOptions[0]);
  const next = options[(index + delta + options.length) % options.length];
  el.value = next.value;
  el.dispatchEvent(new Event("change", { bubbles: true }));
}
export function moveControllerFocus(root: HTMLElement, direction: Direction) {
  const current = document.activeElement as HTMLElement;
  if (
    current instanceof HTMLSelectElement &&
    (direction === "left" || direction === "right")
  ) {
    changeControllerSelect(current, direction === "right" ? 1 : -1);
    return;
  }
  const targets = controllerTargets(root);
  if (!targets.includes(current)) {
    focus(targets[0]);
    return;
  }
  const rect = current.getBoundingClientRect();
  const horizontal = direction === "left" || direction === "right";
  const sign = direction === "left" || direction === "up" ? -1 : 1;
  const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  const candidates = targets
    .filter((el) => el !== current)
    .map((el) => {
      const r = el.getBoundingClientRect();
      const dx = r.x + r.width / 2 - center.x;
      const dy = r.y + r.height / 2 - center.y;
      const along = (horizontal ? dx : dy) * sign;
      const across = Math.abs(horizontal ? dy : dx);
      return { el, along, score: along + across * 3 };
    })
    .filter((item) => item.along > 4)
    .sort((a, b) => a.score - b.score);
  focus(candidates[0]?.el);
}
export function confirmControllerFocus(root: HTMLElement) {
  ensureControllerFocus(root);
  const el = document.activeElement as HTMLElement;
  if (!controllerTargets(root).includes(el)) return;
  if (el instanceof HTMLSelectElement) changeControllerSelect(el, 1);
  else el.click();
}
export function captureControllerFocus(root: HTMLElement) {
  const el = document.activeElement as HTMLElement;
  if (!root.contains(el)) return () => {};
  const index = controllerTargets(root).indexOf(el);
  const id = el.id;
  const action = el.dataset.action;
  const dataId = el.dataset.id;
  const slot = el.dataset.slot;
  const restore = () => {
    const targets = controllerTargets(root);
    const match = targets.find((candidate) =>
      id
        ? candidate.id === id
        : action &&
          candidate.dataset.action === action &&
          candidate.dataset.id === dataId &&
          candidate.dataset.slot === slot,
    );
    focus(match || targets[Math.min(Math.max(0, index), targets.length - 1)]);
  };
  return restore;
}
export function scrollControllerMenu(root: HTMLElement, amount: number) {
  const focused = document.activeElement as HTMLElement;
  let container: HTMLElement | null = root.contains(focused) ? focused : root;
  while (container && container !== document.body) {
    if (
      container.scrollHeight > container.clientHeight &&
      /auto|scroll/.test(getComputedStyle(container).overflowY)
    ) {
      container.scrollTop += amount;
      return;
    }
    container = container.parentElement;
  }
  window.scrollBy(0, amount);
}
export function renderControllerHelp() {
  return `<h3>Play with a controller</h3><p class="modal-intro">Connect a controller and press a button, then release it. Standard layouts use the positions below, with Xbox / PlayStation labels.</p><p id="controller-status" class="controller-status" role="status"></p><div class="control-list controller-control-list"><div><kbd>LEFT STICK / D-PAD</kbd><span>Move / navigate menus</span></div>${CONTROLLER_BINDINGS.map((b) => `<div><kbd>${b.label}</kbd><span>${b.description}</span></div>`).join("")}<div><kbd>LT / RT · L2 / R2</kbd><span>Previous / next menu control</span></div><div><kbd>RIGHT STICK</kbd><span>Scroll menus and reviews</span></div></div><p class="modal-intro">In menus, left/right changes a focused selector. Release controls between screens. Disconnecting pauses combat; reconnect and resume when ready.</p>`;
}
export function updateControllerHints(
  active: boolean,
  inGame: boolean,
  modal: boolean,
) {
  document.body.classList.toggle("controller-input", active);
  for (const binding of CONTROLLER_BINDINGS) {
    for (const key of document.querySelectorAll<HTMLElement>(
      `[data-action="${binding.action}"] kbd`,
    )) {
      key.dataset.keyboardLabel ??= key.textContent || "";
      key.textContent = active ? binding.label : key.dataset.keyboardLabel;
    }
  }
  const tutorial = document.querySelector<HTMLElement>(".game-tutorial > kbd");
  if (tutorial) tutorial.textContent = active ? "L STICK" : "WASD";
  let hint = document.getElementById("controller-hint");
  if (!active) {
    hint?.remove();
    return;
  }
  if (!hint) {
    hint = document.createElement("div");
    hint.id = "controller-hint";
    hint.className = "controller-hint";
    document.body.append(hint);
  }
  hint.hidden = inGame && !modal;
  const text =
    "STICK / D-PAD Move · A / × Confirm · B / ○ Back · LT / RT Focus · R STICK Scroll" +
    (!inGame && !modal ? " · LB / RB Tabs" : "");
  if (hint.textContent !== text) hint.textContent = text;
}
