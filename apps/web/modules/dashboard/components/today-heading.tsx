"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}

function getSnapshot(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
}

function getServerSnapshot(): string {
  return "";
}

export function TodayHeading() {
  const key = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [year, month, day] = key.split("-").map(Number);
  const date = key ? new Date(year, month, day) : null;

  return (
    <header className="min-h-16">
      {date ? (
        <>
          <p className="text-sm text-ink-faint">
            {date.toLocaleDateString("en-US", { weekday: "long" })}
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight">
            {date.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            })}
          </h1>
        </>
      ) : null}
    </header>
  );
}
