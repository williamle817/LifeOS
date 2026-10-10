"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function SignOut() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(session !== null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!signedIn) return null;

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
