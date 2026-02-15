import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

/**
 * Хук для защиты страниц авторизации.
 * Если пользователь уже вошел, его перекинет в профиль.
 */
export function useAuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      
      if (data?.user) {
        // Если пользователь авторизован, отправляем его в профиль
        // Можно заменить на "/", если хочешь на главную
        router.replace("/");
      }
    };

    checkUser();

    // Также подписываемся на изменения состояния (на случай входа в другой вкладке)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.replace("/");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);
}