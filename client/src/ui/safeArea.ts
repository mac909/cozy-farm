export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Space taken by a phone's notch, rounded corners, and home bar, in CSS pixels (all 0 on a laptop). Set up in index.html. */
export function safeArea(): Insets {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => parseFloat(style.getPropertyValue(name)) || 0;
  return { top: read("--safe-top"), right: read("--safe-right"), bottom: read("--safe-bottom"), left: read("--safe-left") };
}
