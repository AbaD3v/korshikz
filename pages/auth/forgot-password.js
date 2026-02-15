import { useState } from "react";
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from "next/router";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const router = useRouter();

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

const { error } = await supabase.auth.resetPasswordForEmail(email, {
  // Путь ДОЛЖЕН указывать на страницу смены пароля
  redirectTo: 'https://korshikz.space/auth/update-password',
});

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: "Инструкции отправлены на вашу почту." });
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
      <h1 className="text-2xl font-bold mb-2 text-center text-gray-900 dark:text-white">Восстановление доступа</h1>
      <p className="text-gray-500 text-center mb-8 text-sm px-4">Введите почту, и мы отправим вам ссылку для смены пароля.</p>
      
      <form onSubmit={handleReset} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Email</label>
          <input
            type="email"
            placeholder="vash@mail.com"
            className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {message && (
          <p className={`text-sm p-3 rounded-xl border ${
            message.type === 'error' 
              ? 'text-red-500 bg-red-50 border-red-100' 
              : 'text-green-600 bg-green-50 border-green-100'
          }`}>
            {message.text}
          </p>
        )}

        <button type="submit" disabled={loading} className="w-full bg-black dark:bg-white dark:text-black text-white p-3 rounded-xl font-semibold hover:opacity-90 transition active:scale-[0.98]">
          {loading ? "Отправка..." : "Сбросить пароль"}
        </button>
      </form>

      <button onClick={() => router.push("/auth/login")} className="mt-6 w-full text-center text-sm text-gray-500 hover:text-black dark:hover:text-white transition">
        ← Вернуться ко входу
      </button>
    </div>
  );
}