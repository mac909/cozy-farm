import { DEFAULT_SHIRT_COLOR, SHIRT_COLORS, type ShirtColorId } from "../../../shared/content/shirtColors";
import { cleanName, type Look, NAME_MAX_LENGTH } from "../../../shared/player";

interface PickerOptions {
  /** The current look when changing it, or null the first time. */
  current: Look | null;
  /** An image URL of the character wearing a shirt color, for the preview. */
  preview: (color: ShirtColorId) => string;
}

/**
 * Asks for a name and shirt color, in an HTML form over the game (see #look-picker in
 * index.html). A real text field brings up the phone's own keyboard. Resolves to the
 * new look, or null if they cancelled (only possible when changing an existing look).
 */
export function pickLook({ current, preview }: PickerOptions): Promise<Look | null> {
  const form = document.getElementById("look-picker") as HTMLFormElement;
  const title = form.querySelector<HTMLElement>(".picker-title")!;
  const image = form.querySelector<HTMLImageElement>(".picker-preview")!;
  const input = form.querySelector<HTMLInputElement>("input[name=name]")!;
  const swatches = form.querySelector<HTMLElement>(".picker-swatches")!;
  const cancel = form.querySelector<HTMLButtonElement>(".picker-cancel")!;
  const submit = form.querySelector<HTMLButtonElement>(".picker-go")!;

  let color = current?.color ?? DEFAULT_SHIRT_COLOR;
  title.textContent = current ? "Your look" : "Welcome to the farm!";
  submit.textContent = current ? "Save" : "Let's go";
  cancel.hidden = !current;
  input.maxLength = NAME_MAX_LENGTH;
  input.value = current?.name ?? "";

  swatches.replaceChildren(
    ...SHIRT_COLORS.map(({ id, label, hex }) => {
      const swatch = document.createElement("button");
      swatch.type = "button";
      swatch.className = "picker-swatch";
      swatch.style.backgroundColor = hex;
      swatch.setAttribute("aria-label", label);
      swatch.dataset.color = id;
      swatch.addEventListener("click", () => {
        color = id;
        refresh();
      });
      return swatch;
    }),
  );

  function refresh() {
    image.src = preview(color);
    for (const swatch of swatches.querySelectorAll<HTMLElement>(".picker-swatch")) {
      swatch.setAttribute("aria-pressed", String(swatch.dataset.color === color));
    }
    submit.disabled = cleanName(input.value) === "";
  }

  refresh();
  form.hidden = false;
  // On phones this won't pop the keyboard up by itself; they tap the field.
  input.focus();

  return new Promise((resolve) => {
    const close = (look: Look | null) => {
      form.hidden = true;
      input.blur();
      form.removeEventListener("submit", onSubmit);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
      input.removeEventListener("input", refresh);
      cancel.removeEventListener("click", onCancel);
      resolve(look);
    };
    const onSubmit = (event: Event) => {
      event.preventDefault();
      const name = cleanName(input.value);
      if (name) close({ name, color });
    };
    const onCancel = () => close(null);
    const onKey = (event: KeyboardEvent) => {
      // Keep typing out of the game, or "w" would walk and "1" would wave.
      event.stopPropagation();
      if (event.type === "keydown" && event.key === "Escape" && current) close(null);
    };

    form.addEventListener("submit", onSubmit);
    // Caught on the way down, so the game never sees them, wherever focus is.
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    input.addEventListener("input", refresh);
    cancel.addEventListener("click", onCancel);
  });
}
