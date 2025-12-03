import { useEffect, useState } from "react";
import { supabase } from "/lib/supabaseClient";

export default function useUserProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        // 1. Получаем auth пользователя
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!ignore) {
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        // 2. Грузим профиль по user.id
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, username, email")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        if (!ignore) {
          setProfile(data);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  const isProfileIncomplete =
    !profile || !profile.full_name || !profile.avatar_url;

  return { profile, loading, isProfileIncomplete };
}
