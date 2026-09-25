"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!ready) return null;
  if (session) return <>{children}</>;

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setNote("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setNote(error.message);
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <form
        onSubmit={signIn}
        className="w-full max-w-xs rounded-xl border border-line bg-surface p-5"
      >
        <h1 className="text-sm font-medium">Sign in to LifeOS</h1>

        <label className="mt-4 block">
          <span className="text-xs text-ink-muted">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent"
          />
        </label>

        <label className="mt-3 block">
          <span className="text-xs text-ink-muted">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent"
          />
        </label>

        {note ? <p className="mt-3 text-xs text-ink-muted">{note}</p> : null}

        <button
          type="submit"
          className="mt-4 w-full rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-surface"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
