import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

Element.prototype.scrollIntoView ??= function scrollIntoView() {};

afterEach(() => {
  cleanup();
});
