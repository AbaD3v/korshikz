import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function ConfirmPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Слушаем изменение состояния авторизации
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        // Как только почта подтверждена и сессия создана — редирект на дашборд
        router.push('/onboarding'); 
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
      <div className="spinner" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #000', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
      <p style={{ marginTop: '20px' }}>Активируем ваш аккаунт...</p>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}