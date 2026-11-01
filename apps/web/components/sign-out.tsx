"use client";

import { useSignedIn } from "@/lib/signed-in";
import { supabase } from "@/lib/supabase";

export function SignOut() {
  const signedIn = useSignedIn();

  if (!signedIn) return null;

  return (
    <button
      type="button"
      onClick={() => void supabase.auth.signOut()}
      className="min-h-11 shrink-0 rounded-full px-4 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
    >
      Sign out
    </button>
  );
}
