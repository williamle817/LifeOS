import { loadEvents } from "@/modules/schedule/lib/event-store";
import { loadAcademic } from "@/modules/academic/lib/course-store";

export async function refreshAll(): Promise<void> {
  await Promise.all([loadEvents(), loadAcademic()]);
}

export function watchReturn(): () => void {
  function onVisible(): void {
    if (document.visibilityState !== "visible") return;
    void refreshAll();
  }

  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onVisible);

  return () => {
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", onVisible);
  };
}
