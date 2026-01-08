import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

// Инициализируем клиент напрямую, чтобы избежать проблем с auth-helpers при билде
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ConfirmPage() {
  const router = useRouter();

  useEffect(() => {
    // Выполняем только в браузере
    if (typeof window !== 'undefined') {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
          router.push('/onboarding');
        }
      });

      return () => subscription?.unsubscribe();
    }
  }, [router]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
      <p>Активируем ваш аккаунт...</p>
    </div>
  );
}

// ЭТА ЧАСТЬ ВАЖНА: она отключает статический пререндеринг страницы
export async function getServerSideProps() {
  return { props: {} };
}