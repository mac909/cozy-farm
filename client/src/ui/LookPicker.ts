import { CHARACTERS, type CharacterId, DEFAULT_CHARACTER } from "../../../shared/content/characters";
import { cleanName, type Look, NAME_MAX_LENGTH } from "../../../shared/player";

interface PickerOptions {
  /** The current look when changing it, or null the first time. */
  current: Look | null;
  /** The first time: a look to start from (one this device used before), if any. */
  initial?: Look | null;
  /** An image URL of one frame of a character's sheet. */
  frame: (character: CharacterId, frame: number) => string;
  /** The frames of walking towards the camera, for the preview at the top. */
  walkFrames: readonly number[];
}

/** How long each step of the preview's walk shows, in milliseconds. */
const PREVIEW_STEP_MS = 160;

/**
 * Asks for a name and a character, in an HTML form over the game (see #look-picker in
 * index.html). A real text field brings up the phone's own keyboard. Resolves to the
 * new look, or null if they cancelled (only possible when changing an existing look).
 */
export function pickLook({ current, initial, frame, walkFrames }: PickerOptions): Promise<Look | null> {
  const form = document.getElementById("look-picker") as HTMLFormElement;
  const title = form.querySelector<HTMLElement>(".picker-title")!;
  const image = form.querySelector<HTMLImageElement>(".picker-preview")!;
  const input = form.querySelector<HTMLInputElement>("input[name=name]")!;
  const choices = form.querySelector<HTMLElement>(".picker-characters")!;
  const cancel = form.querySelector<HTMLButtonElement>(".picker-cancel")!;
  const submit = form.querySelector<HTMLButtonElement>(".picker-go")!;

  let character = current?.character ?? initial?.character ?? DEFAULT_CHARACTER;
  title.textContent = current ? "Your look" : "Welcome to the farm!";
  submit.textContent = current ? "Save" : "Let's go";
  cancel.hidden = !current;
  input.maxLength = NAME_MAX_LENGTH;
  input.value = current?.name ?? initial?.name ?? "";

  choices.replaceChildren(
    ...CHARACTERS.map(({ id, label }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "picker-character";
      button.setAttribute("aria-label", label);
      button.title = label;
      button.dataset.character = id;
      const face = document.createElement("img");
      face.src = frame(id, 0);
      face.alt = "";
      button.append(face);
      button.addEventListener("click", () => {
        character = id;
        refresh();
      });
      return button;
    }),
  );

  // The chosen character walks on the spot at the top.
  let step = 0;
  const walk = window.setInterval(() => {
    step = (step + 1) % walkFrames.length;
    image.src = frame(character, walkFrames[step]);
  }, PREVIEW_STEP_MS);

  function refresh() {
    image.src = frame(character, walkFrames[step]);
    for (const button of choices.querySelectorAll<HTMLElement>(".picker-character")) {
      button.setAttribute("aria-pressed", String(button.dataset.character === character));
    }
    submit.disabled = cleanName(input.value) === "";
  }

  refresh();
  form.hidden = false;
  // On phones this won't pop the keyboard up by itself; they tap the field.
  input.focus();

  return new Promise((resolve) => {
    const close = (look: Look | null) => {
      window.clearInterval(walk);
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
      if (name) close({ name, character });
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
