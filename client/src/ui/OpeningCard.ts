import type { ProjectDef } from "../../../shared/content/projects";
import { keeperWords } from "../../../shared/content/keeper";
import "./board.css";
import { button, el, openPanel, picture } from "./panel";

export interface OpeningPictures {
  /** The project as it is now (the lit lighthouse). */
  hero: string;
  /** The hero's shape: tall (the lighthouse) or wide (the garden shop, Milestone 8). Tall if missing. */
  heroShape?: "tall" | "wide";
  /** A small picture for each "New" line, in the order of the project's `opens`. */
  lines: readonly (string | null)[];
}

/**
 * A project's opening card (Milestone 6): bunting across the top, its picture, the title ("The
 * lighthouse is lit!"), Marlow's note, what's new, and "Let's go see". Resolves with whether they
 * want to go and see.
 */
export function showOpeningCard(project: ProjectDef, pictures: OpeningPictures): Promise<boolean> {
  return new Promise((resolve) => {
    let see = false;
    const panel = openPanel({ cardClass: "opening", position: "bottom", closeOnBackdrop: true, onClose: () => resolve(see) });
    const { card } = panel;
    const hero = el("div", `opening-hero${pictures.heroShape === "wide" ? " wide" : ""}`);
    hero.append(picture(pictures.hero));
    const note = el("p", "note-letter", `“${keeperWords(project.opening.note)}” `);
    note.style.textAlign = "center";
    note.append(el("span", "board-sig", "— M."));
    card.append(el("div", "opening-bunting"), hero, el("h2", "panel-title center", project.opening.title), note, el("div", "panel-label", "New"));
    project.opens.forEach((line, i) => {
      const row = el("div", "opening-line");
      const icon = el("span", "board-icon");
      const src = pictures.lines[i];
      if (src) icon.append(picture(src));
      row.append(icon, el("span", "", line));
      card.append(row);
    });
    const buttons = el("div", "note-buttons");
    const go = button("Let's go see", "panel-button", () => {
      see = true;
      panel.close();
    });
    buttons.append(button("OK", "panel-button soft", () => panel.close()), go);
    card.append(buttons);
    go.focus({ preventScroll: true });
  });
}
