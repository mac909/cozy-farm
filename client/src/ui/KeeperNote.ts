import { KEEPER_NAME, KEEPER_TITLE } from "../../../shared/content/keeper";
import "./board.css";
import type { KeeperNote } from "./boardText";
import { button, el, openPanel, panelHead, picture, type Panel } from "./panel";

/** What the reader chose on a note: "look" (Let's have a look) or just closed it. */
export type NoteChoice = "look" | "closed";

/**
 * One of Marlow's notes on paper, with his face: his first ("Let's have a look" / "Later"), or the
 * newest one when you Talk to him. Resolves when it's closed.
 */
export function showKeeperNote(note: KeeperNote, face: string, first = false): { panel: Panel; done: Promise<NoteChoice> } {
  let choice: NoteChoice = "closed";
  let resolve!: (choice: NoteChoice) => void;
  const done = new Promise<NoteChoice>((r) => (resolve = r));
  const panel = openPanel({ cardClass: "note", closeKeys: [" ", "Enter"], closeOnBackdrop: true, onClose: () => resolve(choice) });
  const head = el("div", "note-head");
  const box = el("span", "note-face");
  box.append(picture(face));
  const who = el("div");
  who.append(el("b", "", KEEPER_NAME), el("small", "", first ? KEEPER_TITLE : note.title));
  head.append(box, who);
  panel.card.append(head, ...note.paragraphs.map((p) => el("p", "note-letter", p)), el("span", "board-sig", "— M."));
  if (first) {
    const row = el("div", "note-buttons");
    row.append(
      button("Later", "panel-button soft", () => panel.close()),
      button("Let's have a look", "panel-button", () => {
        choice = "look";
        panel.close();
      }),
    );
    panel.card.append(row);
  } else {
    panel.card.append(button("OK", "panel-button", () => panel.close()));
  }
  return { panel, done };
}

/** Every note Marlow has written, newest first, to read again. */
export function showNotesList(notes: readonly KeeperNote[], face: string, onClose: () => void): Panel {
  const panel = openPanel({ cardClass: "note notes-list", closeOnBackdrop: true, onClose });
  const ring = el("span", "board-ring");
  ring.append(picture(face));
  const head = panelHead(`${KEEPER_NAME}'s notes`, () => panel.close());
  head.prepend(ring);
  panel.card.append(head);
  for (const note of [...notes].reverse()) {
    panel.card.append(el("div", "note-title", note.title), ...note.paragraphs.map((p) => el("p", "note-letter", p)));
  }
  panel.card.append(el("span", "board-sig", "— M."));
  return panel;
}
