"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, CheckCircle2, AlertCircle } from "lucide-react";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const router = useRouter();

  // 1. ЗАЩИТА СТРАНИЦЫ
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // Если сессии нет, значит пользователь попал сюда не через ссылку из почты
      if (!session) {
        router.replace("/auth/login");
      }
    };
    checkSession();
  }, [router]);

  // 2. ОБРАБОТКА СМЕНЫ ПАРОЛЯ
  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "", message: "" });

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setStatus({ type: "error", message: error.message });
      setLoading(false);
    } else {
      setStatus({ type: "success", message: "Пароль успешно обновлен!" });
      setTimeout(() => {
        router.push("/profile"); // Или на главную
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] dark:bg-[#020617] flex items-center justify-center px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 mx-auto mb-4">
            <Lock size={32} />
          </div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">
            Новый пароль
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
            Придумайте надежный пароль для вашего аккаунта
          </p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="relative">
            <input
              type="password"
              placeholder="Минимум 6 символов"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold dark:text-white"
            />
          </div>

          {status.message && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`flex items-center gap-3 p-4 rounded-2xl text-sm font-bold ${
                status.type === "success" 
                ? "bg-green-500/10 text-green-500" 
                : "bg-red-500/10 text-red-500"
              }`}
            >
              {status.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {status.message}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase italic tracking-widest hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Обновление..." : "Сохранить пароль"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}