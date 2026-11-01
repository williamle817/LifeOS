import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

window.matchMedia ??= () => ({ matches: false }) as MediaQueryList;

afterEach(() => {
  cleanup();
});
