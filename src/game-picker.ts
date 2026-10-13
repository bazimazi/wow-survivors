/** Native selectors keep their form semantics; pointer menus use a paged game panel. */
let dispose: (() => void) | undefined;
let source: HTMLSelectElement | undefined;
const installed = new WeakSet<HTMLSelectElement>();
export function closeGamePicker() {
  dispose?.();
  dispose = undefined;
  source = undefined;
}
export function dismissGamePicker() {
  const select = source;
  closeGamePicker();
  select?.focus({ preventScroll: true });
}
export function mountGamePickers(root: HTMLElement) {
  closeGamePicker();
  for (const select of root.querySelectorAll<HTMLSelectElement>("select")) {
    if (installed.has(select) || select.multiple || select.size > 1) continue;
    installed.add(select);
    const open = () => {
      if (select.disabled || !select.isConnected) return;
      closeGamePicker();
      const panel = document.createElement("div");
      panel.className = "game-picker";
      panel.setAttribute("role", "listbox");
      const name =
        select.getAttribute("aria-label") ||
        select.labels?.[0]?.textContent?.trim() ||
        "Choose an option";
      panel.setAttribute("aria-label", name);
      select.setAttribute("aria-expanded", "true");
      const options = [...select.options];
      const perPage = Math.max(
        1,
        Math.min(5, Math.floor((innerHeight - 130) / 44)),
      );
      const pages = Math.ceil(options.length / perPage);
      let current = Math.floor(Math.max(0, select.selectedIndex) / perPage);
      const bounds = select.getBoundingClientRect();
      const width = Math.min(innerWidth - 20, Math.max(220, bounds.width));
      panel.style.width = `${width}px`;
      panel.style.left = `${Math.max(10, Math.min(innerWidth - width - 10, bounds.left))}px`;
      const position = () => {
        const anchor = select.getBoundingClientRect();
        const height = panel.getBoundingClientRect().height;
        panel.style.left = `${Math.max(10, Math.min(innerWidth - width - 10, anchor.left))}px`;
        panel.style.top = `${Math.max(10, Math.min(innerHeight - height - 10, anchor.bottom + 6))}px`;
      };
      const container = document.getElementById("modal-root")?.contains(select)
        ? document.getElementById("modal-root")!
        : document.body;
      container.append(panel);
      const close = () => {
        panel.remove();
        select.setAttribute("aria-expanded", "false");
        document.removeEventListener("pointerdown", outside, true);
        window.removeEventListener("resize", closeGamePicker);
        document.removeEventListener("scroll", position, true);
      };
      dispose = close;
      source = select;
      const render = () => {
        panel.replaceChildren();
        for (const option of options.slice(
          current * perPage,
          (current + 1) * perPage,
        )) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "game-picker-option";
          button.setAttribute("role", "option");
          button.setAttribute("aria-selected", String(option.selected));
          button.disabled =
            option.disabled ||
            (option.parentElement instanceof HTMLOptGroupElement &&
              option.parentElement.disabled);
          button.textContent = option.textContent;
          button.addEventListener("click", () => {
            select.value = option.value;
            closeGamePicker();
            select.focus({ preventScroll: true });
            select.dispatchEvent(new Event("change", { bubbles: true }));
          });
          panel.append(button);
        }
        if (pages > 1) {
          const nav = document.createElement("div");
          nav.className = "game-picker-pages";
          const previous = document.createElement("button"),
            next = document.createElement("button"),
            count = document.createElement("span");
          previous.type = next.type = "button";
          previous.textContent = "‹";
          next.textContent = "›";
          previous.setAttribute("aria-label", "Previous choices");
          next.setAttribute("aria-label", "Next choices");
          previous.disabled = current === 0;
          next.disabled = current === pages - 1;
          count.textContent = `${current + 1} / ${pages}`;
          previous.addEventListener("click", () => {
            current--;
            render();
          });
          next.addEventListener("click", () => {
            current++;
            render();
          });
          nav.append(previous, count, next);
          panel.append(nav);
        }
        position();
        (
          panel.querySelector<HTMLElement>(
            '[aria-selected="true"]:not(:disabled)',
          ) ||
          panel.querySelector<HTMLElement>(".game-picker-option:not(:disabled)")
        )?.focus({ preventScroll: true });
      };
      const outside = (event: PointerEvent) => {
        if (panel.contains(event.target as Node) || event.target === select)
          return;
        closeGamePicker();
      };
      panel.addEventListener("keydown", (event) => {
        event.stopPropagation();
        if (event.key === "Escape" || event.key === "Tab") {
          closeGamePicker();
          select.focus({ preventScroll: true });
          if (event.key === "Escape") event.preventDefault();
        } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          const buttons = [
            ...panel.querySelectorAll<HTMLButtonElement>(
              ".game-picker-option:not(:disabled)",
            ),
          ];
          const index = buttons.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          buttons[
            (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) %
              buttons.length
          ]?.focus({ preventScroll: true });
        }
      });
      render();
      document.addEventListener("pointerdown", outside, true);
      window.addEventListener("resize", closeGamePicker);
      document.addEventListener("scroll", position, true);
    };
    select.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      select.focus({ preventScroll: true });
      open();
    });
    select.addEventListener("keydown", (event) => {
      if (
        !["Enter", " ", "F4"].includes(event.key) &&
        !(event.altKey && event.key === "ArrowDown")
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      open();
    });
  }
}
