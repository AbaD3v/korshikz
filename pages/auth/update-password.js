import { useState } from "react";
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from "next/router";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      alert("Пароль успешно обновлен!");
      router.push("/auth/login");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">Новый пароль</h1>
      
      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Придумайте новый пароль</label>
          <input
            type="password"
            placeholder="Минимум 6 символов"
            className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded border border-red-100">{error}</p>}

        <button type="submit" disabled={loading} className="w-full bg-black dark:bg-white dark:text-black text-white p-3 rounded-xl font-semibold hover:opacity-90 transition active:scale-[0.98]">
          {loading ? "Обновление..." : "Сохранить новый пароль"}
        </button>
      </form>
    </div>
  );
}