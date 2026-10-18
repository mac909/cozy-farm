import type { CharacterId } from "../../../shared/content/characters";
import type { FarmerSummary } from "../../../shared/messages";
import "./farmerPicker.css";

export type FarmerChoice = { kind: "farmer"; farmer: FarmerSummary } | { kind: "new" };

interface PickFarmerOptions {
  farmers: readonly FarmerSummary[];
  /** An image URL of a character's face. */
  face: (character: CharacterId) => string;
}

/**
 * The first screen on a new device (or the home-screen app the first time): a big button per
 * farmer, and Someone new underneath. Bags belong to farmers, so tapping your name gets your own
 * bag back. Resolves with the choice.
 */
export function pickFarmer({ farmers, face }: PickFarmerOptions): Promise<FarmerChoice> {
  return new Promise((resolve) => {
    const { overlay, card, close } = openCard();
    card.append(heading("Who's playing?"), paragraph("Tap your name to pick up where you left off."));
    for (const farmer of farmers) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "who-farmer";
      const image = document.createElement("img");
      image.src = face(farmer.character);
      image.alt = "";
      button.append(image, document.createTextNode(farmer.name));
      button.addEventListener("click", () => {
        close();
        resolve({ kind: "farmer", farmer });
      });
      card.append(button);
    }
    const someoneNew = actionButton("+ Someone new", "soft", () => {
      close();
      resolve({ kind: "new" });
    });
    card.append(someoneNew);
    document.body.append(overlay);
  });
}

/**
 * Shown when this farmer started playing on another device (the newest one wins). Resolves when
 * they tap Play here, which takes the game back to this device.
 */
export function showOtherDevice(name: string): Promise<void> {
  return new Promise((resolve) => {
    const { overlay, card, close } = openCard();
    card.append(
      heading("You're playing on another device"),
      paragraph(`${name}'s game moved to the phone or laptop that opened it last. Your bag went with it.`),
      actionButton("Play here", "go", () => {
        close();
        resolve();
      }),
    );
    document.body.append(overlay);
  });
}

/** An overlay with an empty card, which keeps keys away from the game while it's open. */
function openCard() {
  const overlay = document.createElement("div");
  overlay.className = "who";
  const card = document.createElement("div");
  card.className = "who-card";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "true");
  overlay.append(card);
  // Caught on the way down, so "w" doesn't walk and "1" doesn't pick a slot behind the card.
  const stopKeys = (event: KeyboardEvent) => event.stopPropagation();
  window.addEventListener("keydown", stopKeys, true);
  window.addEventListener("keyup", stopKeys, true);
  const close = () => {
    window.removeEventListener("keydown", stopKeys, true);
    window.removeEventListener("keyup", stopKeys, true);
    overlay.remove();
  };
  return { overlay, card, close };
}

function heading(text: string) {
  const h = document.createElement("h1");
  h.className = "who-title";
  h.textContent = text;
  return h;
}

function paragraph(text: string) {
  const p = document.createElement("p");
  p.className = "who-text";
  p.textContent = text;
  return p;
}

function actionButton(text: string, kind: "go" | "soft", onClick: () => void) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `who-button ${kind}`;
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}
