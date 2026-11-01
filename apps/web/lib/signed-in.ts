import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useSignedIn(): boolean {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(session !== null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return signedIn;
}
