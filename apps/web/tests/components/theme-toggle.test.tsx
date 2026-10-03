import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

type Toggle = typeof import("@/components/theme-toggle");

async function mount(stored?: string) {
  window.localStorage.clear();
  if (stored) window.localStorage.setItem("lifeos.theme", stored);
  delete document.documentElement.dataset.theme;
  vi.resetModules();
  const { ThemeToggle }: Toggle = await import("@/components/theme-toggle");
  render(<ThemeToggle />);
}

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("switching between light and dark", () => {
  it("starts light when nothing was chosen before", async () => {
    await mount();
    expect(
      screen.getByRole("button", { name: "Switch to dark mode" }),
    ).toBeTruthy();
  });

  it("comes back dark when dark was chosen before", async () => {
    await mount("dark");
    expect(
      screen.getByRole("button", { name: "Switch to light mode" }),
    ).toBeTruthy();
  });

  it("paints the page dark when switched", async () => {
    await mount();
    await userEvent.click(
      screen.getByRole("button", { name: "Switch to dark mode" }),
    );
    expect(document.documentElement.dataset.theme).toBe("night");
  });

  it("remembers the choice", async () => {
    await mount();
    await userEvent.click(
      screen.getByRole("button", { name: "Switch to dark mode" }),
    );
    expect(window.localStorage.getItem("lifeos.theme")).toBe("dark");
  });

  it("takes the page back to light", async () => {
    await mount("dark");
    await userEvent.click(
      screen.getByRole("button", { name: "Switch to light mode" }),
    );
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(window.localStorage.getItem("lifeos.theme")).toBe("light");
  });

  it("flips the label after each press", async () => {
    await mount();
    await userEvent.click(
      screen.getByRole("button", { name: "Switch to dark mode" }),
    );
    expect(
      screen.getByRole("button", { name: "Switch to light mode" }),
    ).toBeTruthy();
  });
});
