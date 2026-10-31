"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Brand } from "@/components/brand";
import { input, primary } from "@/components/styles";
import { follow } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import "@/app/dashboard.css";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      follow(next?.user.id ?? null);
      setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
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
    <div data-page="login" className="flex flex-1 items-center justify-center py-8">
      <form
        onSubmit={signIn}
        className="flex w-full max-w-sm flex-col gap-5 rounded-panel bg-surface p-8 shadow-pop sm:p-9"
      >
        <Brand size="large" />
        <h1 className="font-display text-3xl font-medium tracking-tight">
          Sign in to LifeOS
        </h1>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink-muted">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink-muted">Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
        </label>

        {note ? (
          <p role="alert" className="text-[13px] text-ink-muted">
            {note}
          </p>
        ) : null}

        <button type="submit" className={`${primary} min-h-12 w-full text-[15px]`}>
          Sign in
        </button>
      </form>
    </div>
  );
}
