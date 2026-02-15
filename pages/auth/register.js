import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setError(null);
    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (googleError) setError(googleError.message);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: "https://korshikz.space/auth/confirm" },
      });

      if (signUpError) throw signUpError;
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">Регистрация в Коршы</h1>

      {success ? (
        <div className="text-center space-y-4 py-8">
          <div className="text-5xl animate-bounce">📩</div>
          <p className="text-green-600 font-medium text-lg text-center">Письмо отправлено!</p>
          <p className="text-gray-500 text-center px-4">Проверьте почту <b>{email}</b> для подтверждения.</p>
          <button onClick={() => setSuccess(false)} className="text-sm text-gray-400 underline mt-4 hover:text-gray-600">Ввести другой email</button>
        </div>
      ) : (
        <>
          <form onSubmit={handleRegister} className="space-y-4">
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
            
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Пароль</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Минимум 6 символов"
                  className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition pr-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-800">{error}</p>}

            <button type="submit" disabled={loading} className="w-full bg-black dark:bg-white dark:text-black text-white p-3 rounded-xl font-semibold hover:opacity-90 transition active:scale-[0.98]">
              {loading ? "Загрузка..." : "Создать аккаунт"}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200 dark:border-gray-700"></span></div>
            <div className="relative flex justify-center text-sm uppercase"><span className="px-2 bg-white dark:bg-gray-800 text-gray-500 font-medium">или через</span></div>
          </div>

          <button onClick={handleGoogleLogin} type="button" className="w-full flex items-center justify-center gap-3 border border-gray-300 dark:border-gray-600 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium text-gray-700 dark:text-white active:scale-[0.98]">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-5 h-5" />
            Продолжить с Google
          </button>

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Уже есть аккаунт? <button onClick={() => router.push("/auth/login")} className="text-black dark:text-white font-bold hover:underline">Войти</button>
          </p>
        </>
      )}
    </div>
  );
}