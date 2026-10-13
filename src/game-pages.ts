/** One reader per screen: persistent game chrome, no nested document scrollbars. */
import { mountGamePickers, closeGamePicker } from "./game-picker";
const positions = new Map<string, number>();
let menuCleanup: (() => void) | undefined;
let dialogCleanup: (() => void) | undefined;
let installed = false;

function reader(
  view: HTMLElement,
  host: HTMLElement,
  label: string,
  remember?: string,
) {
  view.classList.add("game-reader");
  view.tabIndex = -1;
  const nav = document.createElement("nav");
  nav.className = "game-page-nav";
  nav.setAttribute("aria-label", `${label} pages`);
  nav.innerHTML = `<button type="button" class="game-page-arrow" aria-label="Previous page">‹</button><span class="game-page-count" aria-live="polite"></span><button type="button" class="game-page-arrow" aria-label="Next page">›</button>`;
  const [previous, next] = [
    ...nav.querySelectorAll<HTMLButtonElement>("button"),
  ];
  const count = nav.querySelector<HTMLElement>(".game-page-count")!;
  host.prepend(nav);
  const step = () => Math.max(100, view.clientHeight * 0.85);
  const update = () => {
    const maximum = Math.max(0, view.scrollHeight - view.clientHeight);
    const total = Math.ceil(maximum / step()) + 1;
    const current =
      view.scrollTop >= maximum - 2
        ? total
        : Math.floor(view.scrollTop / step() + 0.15) + 1;
    count.textContent = `${Math.min(total, current)} / ${total}`;
    previous.disabled = view.scrollTop <= 1;
    next.disabled = view.scrollTop >= maximum - 1;
    if (remember) positions.set(remember, view.scrollTop);
    else nav.hidden = total <= 1;
  };
  const turn = (direction: number) => {
    view.scrollBy({ top: step() * direction, behavior: "instant" });
    update();
  };
  previous.addEventListener("click", () => turn(-1));
  next.addEventListener("click", () => turn(1));
  view.addEventListener("scroll", update, { passive: true });
  const observer = new ResizeObserver(update);
  observer.observe(view);
  for (const child of view.children) observer.observe(child);
  if (remember) view.scrollTop = positions.get(remember) || 0;
  update();
  return () => {
    observer.disconnect();
    view.removeEventListener("scroll", update);
    nav.remove();
  };
}

export function mountGameMenu(app: HTMLElement) {
  releaseGameMenu();
  const view = app.querySelector<HTMLElement>(".main-content")!;
  const footer = app.querySelector<HTMLElement>(".site-footer")!;
  const dispose = reader(view, footer, "Menu", view.dataset.page);
  const headings = [
    ...view.querySelectorAll<HTMLElement>(".page-title h1, h2"),
  ];
  const select = document.createElement("select");
  select.className = "game-chapter-select";
  select.setAttribute("aria-label", "Jump to section");
  select.innerHTML = '<option value="">Sections…</option>';
  headings.forEach((heading, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = heading.textContent?.trim() || `Section ${index + 1}`;
    select.append(option);
  });
  select.addEventListener("change", () => {
    if (select.value === "") return;
    const heading = headings[Number(select.value)];
    view.scrollTop +=
      heading.getBoundingClientRect().top -
      view.getBoundingClientRect().top -
      20;
    select.value = "";
  });
  footer.querySelector(".game-page-nav")!.append(select);
  mountGamePickers(app);
  menuCleanup = dispose;
  installKeys();
}

export function releaseGameMenu() {
  closeGamePicker();
  menuCleanup?.();
  menuCleanup = undefined;
}

export function mountGameDialog(modal: HTMLElement) {
  dialogCleanup?.();
  modal.classList.add("game-dialog");
  const view = document.createElement("div");
  view.className = "dialog-content";
  for (const node of [...modal.childNodes]) view.append(node);
  const close = view.querySelector(".modal-close");
  if (close) modal.append(close);
  modal.append(view);
  const footer = document.createElement("div");
  footer.className = "dialog-page-footer";
  modal.append(footer);
  const dispose = reader(view, footer, "Dialog");
  dialogCleanup = () => {
    dispose();
  };
  mountGamePickers(modal);
  installKeys();
}

export function releaseGameDialog() {
  closeGamePicker();
  dialogCleanup?.();
  dialogCleanup = undefined;
}

function installKeys() {
  if (installed) return;
  installed = true;
  document.addEventListener("keydown", (event) => {
    if (
      !["PageDown", "PageUp", "Home", "End"].includes(event.key) ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    if ((event.target as HTMLElement)?.closest("input,select,textarea")) return;
    const dialog = document.querySelector<HTMLElement>(
      ".game-dialog .game-reader",
    );
    const menu =
      !document.body.classList.contains("in-game") &&
      document.querySelector<HTMLElement>(".main-content.game-reader");
    const view = dialog || menu;
    if (!view) return;
    event.preventDefault();
    if (event.key === "Home") view.scrollTop = 0;
    else if (event.key === "End") view.scrollTop = view.scrollHeight;
    else
      view.scrollTop +=
        view.clientHeight * 0.85 * (event.key === "PageDown" ? 1 : -1);
  });
  document.addEventListener(
    "toggle",
    (event) => {
      const detail = event.target;
      if (
        !(detail instanceof HTMLDetailsElement) ||
        !detail.open ||
        !detail.closest(".combat-briefing")
      )
        return;
      for (const other of document.querySelectorAll<HTMLDetailsElement>(
        ".combat-briefing details[open]",
      ))
        if (other !== detail) other.open = false;
    },
    true,
  );
}
