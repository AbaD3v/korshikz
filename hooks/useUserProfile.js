import { useEffect, useState } from "react";
import { supabase } from "/lib/supabaseClient";

export default function useUserProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    let ignore = false;

    async function load() {
      try {
        const res = await fetch(`/api/profile/me?userId=${userId}`);
        if (!res.ok) throw new Error("Failed to fetch profile");
        const data = await res.json();

        if (!ignore) {
          setProfile(data.profile);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => { ignore = true; };
  }, [userId]);

  const isProfileIncomplete = !profile || !profile.username || !profile.avatar_url;

  return { profile, loading, isProfileIncomplete };
}
