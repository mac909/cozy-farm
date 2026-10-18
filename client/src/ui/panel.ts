import "./panel.css";

export interface PanelOptions {
  /** Extra class names for the card (each panel styles its own insides). */
  cardClass?: string;
  /** "bottom" sits the card at the bottom of the screen. */
  position?: "center" | "bottom";
  /**
   * Touches and keys around the card go through to the game, and the screen isn't darkened
   * (the bed banner, so the joystick and Esc get you up). Otherwise the panel keeps the keys
   * away from the game, so "w" doesn't walk and "1" doesn't pick a slot behind it.
   */
  passThrough?: boolean;
  /** Keys (KeyboardEvent.key) that close the panel, besides Escape. Ignored with passThrough. */
  closeKeys?: readonly string[];
  /** Tapping the dark area around the card closes it. */
  closeOnBackdrop?: boolean;
  /** Called once when it closes, however that happened. */
  onClose?: () => void;
}

export interface Panel {
  readonly card: HTMLDivElement;
  readonly isOpen: boolean;
  close(): void;
}

/** Opens a cream card over the game. Close it with close(), Escape, or the options' keys. */
export function openPanel(options: PanelOptions = {}): Panel {
  const overlay = document.createElement("div");
  overlay.className = `panel${options.position === "bottom" ? " bottom" : ""}${options.passThrough ? " through" : ""}`;
  const card = document.createElement("div");
  card.className = `panel-card${options.cardClass ? ` ${options.cardClass}` : ""}`;
  card.setAttribute("role", "dialog");
  overlay.append(card);

  let open = true;
  const onKey = (event: KeyboardEvent) => {
    const typing = event.target instanceof HTMLInputElement;
    if (!typing) event.stopPropagation();
    if (event.type !== "keydown" || event.repeat) return;
    if (event.key === "Escape" || (!typing && options.closeKeys?.some((key) => key.toLowerCase() === event.key.toLowerCase()))) {
      event.preventDefault();
      panel.close();
    }
  };
  if (!options.passThrough) {
    // Caught on the way down, before the game sees them.
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
  }
  if (options.closeOnBackdrop) {
    overlay.addEventListener("pointerdown", (event) => {
      if (event.target === overlay) panel.close();
    });
  }

  const panel: Panel = {
    card,
    get isOpen() {
      return open;
    },
    close() {
      if (!open) return;
      open = false;
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
      overlay.remove();
      options.onClose?.();
    },
  };
  document.body.append(overlay);
  return panel;
}

/** A small element with text and an optional class. */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** A button that fires on click (taps included). */
export function button(text: string, className: string, onClick: () => void): HTMLButtonElement {
  const node = el("button", className, text);
  node.type = "button";
  node.addEventListener("click", onClick);
  return node;
}

/** A pixel-art picture from an image URL. */
export function picture(src: string, className = "panel-icon"): HTMLImageElement {
  const img = el("img", className);
  img.src = src;
  img.alt = "";
  img.draggable = false;
  return img;
}

/** A panel's title row: the title, optional extras (like the coins), and a × that closes it. */
export function panelHead(title: string, close: () => void, ...extras: HTMLElement[]): HTMLDivElement {
  const head = el("div", "panel-head");
  head.append(el("h2", "panel-title", title), ...extras, button("×", "panel-x", close));
  head.querySelector(".panel-x")!.setAttribute("aria-label", "Close");
  return head;
}
