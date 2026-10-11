"use client";

import { useEffect } from "react";
import { refreshAll } from "@/lib/store";

export function StayFresh() {
  useEffect(() => {
    function onVisible(): void {
      if (document.visibilityState === "visible") void refreshAll();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);
  return null;
}
