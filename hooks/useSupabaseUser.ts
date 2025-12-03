import { supabase } from "@/hooks/utils/supabase/client";
import { useEffect, useState } from "react";

export function useSupabaseUser() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user || null);
    });
  }, []);

  return user;
}
