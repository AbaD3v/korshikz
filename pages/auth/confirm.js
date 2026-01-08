import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

export default function ConfirmPage() {
  const router = useRouter();
  // Используем версию для Pages Router, так как у тебя папка pages
  const supabase = createPagesBrowserClient();

  useEffect(() => {
    // Проверяем событие авторизации
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        // Перенаправляем на онбординг
        router.push('/onboarding'); 
      }
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [supabase, router]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
      <p>Активируем ваш аккаунт, пожалуйста, подождите...</p>
    </div>
  );
}