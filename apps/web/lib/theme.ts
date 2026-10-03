export type Mode = "light" | "dark";

export const THEME_KEY = "lifeos.theme";

let cache: Mode | null = null;
const listeners = new Set<() => void>();

function read(): Mode {
  try {
    return window.localStorage.getItem(THEME_KEY) === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

function persist(mode: Mode): boolean {
  try {
    window.localStorage.setItem(THEME_KEY, mode);
    return true;
  } catch {
    return false;
  }
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): Mode {
  cache ??= read();
  return cache;
}

export function getServerSnapshot(): Mode {
  return "light";
}

export function apply(mode: Mode): void {
  if (mode === "dark") document.documentElement.dataset.theme = "night";
  else delete document.documentElement.dataset.theme;
}

export function setMode(mode: Mode): void {
  cache = mode;
  persist(mode);
  apply(mode);
  for (const listener of listeners) listener();
}
