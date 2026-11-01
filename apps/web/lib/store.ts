import { supabase } from "@/lib/supabase";

type Write = PromiseLike<{ error: { message: string } | null }>;

type Entry = { reset: () => void; refresh: () => Promise<void> };

const stores = new Set<Entry>();
let userId: string | null = null;
let who: Promise<string | null> | null = null;
let authId: string | null | undefined;
let era = 0;
let refreshing: Promise<void> | null = null;

function whoAmI(): Promise<string | null> {
  if (!who) {
    const at = era;
    who = Promise.resolve(supabase.from("users").select("id").single()).then(
      ({ data }) => {
        if (at !== era) return null;
        userId = data?.id ?? null;
        if (!userId) who = null;
        return userId;
      },
    );
  }
  return who;
}

export function currentUserId(): string | null {
  return userId;
}

export function owner(value?: string): string {
  return value || (userId ?? "");
}

export function follow(next: string | null): void {
  if (next === authId) return;
  authId = next;
  era += 1;
  userId = null;
  who = null;
  for (const store of stores) store.reset();
}

export function refreshAll(): Promise<void> {
  refreshing ??= Promise.all([...stores].map((store) => store.refresh()))
    .then(() => {})
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export function createStore<T>(empty: T, fetch: () => Promise<T>) {
  let cache = empty;
  let loaded = false;
  let version = 0;
  let lastError: string | null = null;
  let loading: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  function emit(): void {
    for (const listener of listeners) listener();
  }

  function set(next: T): void {
    cache = next;
    version += 1;
    emit();
  }

  async function load(): Promise<void> {
    const at = era;
    const seen = version;
    if (!(await whoAmI())) return;
    const next = await fetch();
    if (at !== era || seen !== version) return;
    cache = next;
    loaded = true;
    emit();
  }

  async function ensureLoaded(): Promise<void> {
    if (loaded) return;
    loading ??= load().finally(() => {
      loading = null;
    });
    await loading;
  }

  stores.add({
    reset() {
      cache = empty;
      loaded = false;
      lastError = null;
      loading = null;
      version += 1;
      emit();
    },
    refresh: () => (loaded ? load() : Promise.resolve()),
  });

  return {
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => cache,
    getServerSnapshot: () => empty,
    lastWriteError: () => lastError,
    ensureLoaded,
    load,
    set,
    async begin(): Promise<void> {
      await ensureLoaded();
      lastError = null;
    },
    async write(run: Write): Promise<void> {
      const { error } = await run;
      if (!error) return;
      lastError = error.message;
      await load();
      emit();
    },
  };
}
