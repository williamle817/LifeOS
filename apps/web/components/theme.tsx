"use client";

import { useEffect } from "react";

export function Theme({ name }: { name: string }) {
  useEffect(() => {
    document.documentElement.dataset.theme = name;
    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, [name]);

  return null;
}
