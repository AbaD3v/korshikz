import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1️⃣ Регистрация в Supabase
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Убедитесь, что этот URL добавлен в Redirect URLs в Supabase Dashboard
          emailRedirectTo: "https://korshikz.space/auth/confirm",
        },
      });

      // Игнорируем ошибку "уже зарегистрирован", чтобы отправить письмо повторно
      if (signUpError && signUpError.message !== "User already registered") {
        throw signUpError;
      }

      // 2️⃣ Отправка письма через ваш API
      const response = await fetch("/api/auth/send-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Ошибка при отправке письма");
      }

      setSuccess(true);
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message || "Что-то пошло не так");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
      <h1 className="text-2xl font-bold mb-6 text-center">Создать аккаунт</h1>

      {success ? (
        <div className="text-center space-y-4">
          <div className="text-5xl">📩</div>
          <p className="text-green-600 font-medium">
            Письмо отправлено на <b>{email}</b>.<br />
            Пожалуйста, проверьте почту для подтверждения.
          </p>
        </div>
      ) : (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              className="w-full p-3 border rounded-xl dark:bg-gray-700"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Пароль</label>
            <input
              type="password"
              className="w-full p-3 border rounded-xl dark:bg-gray-700"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</p>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-black text-white p-3 rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 transition"
          >
            {loading ? "Загрузка..." : "Зарегистрироваться"}
          </button>
        </form>
      )}
    </div>
  );
}