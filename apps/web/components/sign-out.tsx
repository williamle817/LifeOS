"use client";

import { supabase } from "@/lib/supabase";

export function SignOut() {
  return (
    <button
      type="button"
      onClick={() => void supabase.auth.signOut()}
      className="shrink-0 rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
    >
      Sign out
    </button>
  );
}
