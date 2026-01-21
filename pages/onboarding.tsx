"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Sparkles, GraduationCap, Home, Users2, Info, 
  ChevronRight, ChevronLeft, Check, Camera, MapPin, 
  Sun, Moon, Coffee, Dog, Cigarette 
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const STEPS = [
  { id: 1, title: "Личность", icon: User },
  { id: 2, title: "Быт", icon: Sparkles },
  { id: 3, title: "Занятость", icon: GraduationCap },
  { id: 4, title: "Бюджет", icon: Home },
  { id: 5, title: "Сосед", icon: Users2 },
  { id: 6, title: "О себе", icon: Info },
];

// Тот самый маппинг для исправления ошибки Enum
const STATUS_MAP: Record<number, string> = {
  1: "searching",   // Ищу сожителей
  2: "have_flat",   // Есть квартира
  3: "free_spot",   // Ищу на подселение
  4: "inactive"     // Не ищу
};
export default function OnboardingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [form, setForm] = useState<any>({
    full_name: "",
    university: "",
    city: "Алматы",
    status: 1, // Внутреннее состояние (цифра)
    budget: 120000,
    cleanliness_level: 3,
    noise_tolerance: 3,
    schedule_type: "flexible",
    faculty: "",
    study_type: "",
    preferred_location: "",
    preferred_gender: "any",
    preferred_age_min: 18,
    preferred_age_max: 25,
    preferred_pets: false,
    preferred_smoking: false,
    about_me: "",
    isOnboarded: false,
  });
  
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace("/login");
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        if (profile.isOnboarded) return router.replace(`/profile/${user.id}`);
        // Если в базе уже лежит строка (напр. 'searching'), конвертируем обратно в цифру для формы
        const numericStatus = Object.keys(STATUS_MAP).find(key => STATUS_MAP[Number(key)] === profile.status);
        setForm((prev: any) => ({ 
          ...prev, 
          ...profile, 
          status: numericStatus ? Number(numericStatus) : prev.status 
        }));
        if (profile.avatar_url) setAvatarPreview(profile.avatar_url);
      }
      setLoading(false);
    }
    init();
  }, [router]);

  const handleNext = async () => {
    const isLast = step === STEPS.length;

    if (step === 1 && (!form.university || !form.full_name)) {
      alert("Укажи имя и университет — это важно для мэтчинга!");
      return;
    }

    if (isLast) {
      setSaving(true);
      try {
        // ПРЕОБРАЗОВАНИЕ ПЕРЕД СОХРАНЕНИЕМ
        const finalPayload = {
          ...form,
          id: userId,
          isOnboarded: true,
          status: STATUS_MAP[form.status] || "searching", // Ключевое исправление Enum
          budget: Number(form.budget),
          cleanliness_level: Number(form.cleanliness_level),
          noise_tolerance: Number(form.noise_tolerance)
        };

        const { error } = await supabase.from("profiles").upsert(finalPayload);
        if (error) throw error;

        // Авто-листинг для карты
        if (form.status === 1 || form.status === 2) {
          await createAutoListing();
        }

        setIsFinished(true);
        setTimeout(() => router.push(`/profile/${userId}`), 2200);
      } catch (err: any) {
        console.error("Save error:", err);
        alert(`Ошибка при сохранении: ${err.message}`);
      } finally {
        setSaving(false);
      }
    } else {
      setStep(s => s + 1);
    }
  };

const createAutoListing = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    console.error("Пользователь не авторизован");
    return;
  }
  const STATUS_MAP = {
    1: "searching",
    2: "have_flat",
    3: "free_spot"
  };
  const payload = {
    user_id: userId,
    status: STATUS_MAP[form.status] || "searching",
    full_name: form.full_name,
    university: form.university,
    // Передаем адрес строкой, сервер сам найдет координаты
    address: form.preferred_location || form.university || "Алматы",
    city: form.city || "Алматы",
    price: Number(form.budget) || 0
  };

  try {
    const response = await fetch('/api/listings/sync', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('Ошибка при синхронизации');
    
    console.log("Успешно сохранено!");
  } catch (err) {
    console.error("Ошибка сохранения листинга:", err);
  }
};

  if (!mounted || loading) return null;

  return (
    <div className="min-h-screen bg-[#FDFDFF] dark:bg-[#020617] p-6 md:p-12 text-slate-900 dark:text-white">
      <AnimatePresence>
        {isFinished && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-white dark:bg-[#020617]">
            <div className="text-center space-y-6">
              <div className="mx-auto w-20 h-20 bg-indigo-500 rounded-full flex items-center justify-center shadow-xl shadow-indigo-500/40">
                <Check size={40} className="text-white" strokeWidth={3} />
              </div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter">Профиль готов</h2>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <div className="flex gap-1 mb-6">
            {STEPS.map(s => (
              <div key={s.id} className={`h-1.5 rounded-full transition-all duration-500 ${step >= s.id ? "w-10 bg-indigo-500" : "w-3 bg-slate-200 dark:bg-slate-800"}`} />
            ))}
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-2">Шаг {step} из 6</p>
          <h1 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter leading-none">
            {STEPS.find(s => s.id === step)?.title}
          </h1>
        </header>

        <main className="min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              
              {step === 1 && (
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-6">
                    <InputGroup label="Твое имя">
                      <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} placeholder="Имя" className="premium-input" />
                    </InputGroup>
                    <InputGroup label="Твой Университет">
                      <div className="relative">
                        <GraduationCap className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-500" size={20} />
                        <input value={form.university} onChange={e => setForm({...form, university: e.target.value})} placeholder="Напр: КБТУ" className="premium-input pl-14" />
                      </div>
                    </InputGroup>
                  </div>
                  <div className="flex justify-center">
                    <div className="relative w-40 h-40 rounded-[3rem] bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden group">
                      {avatarPreview ? <img src={avatarPreview} className="w-full h-full object-cover" alt="Avatar" /> : <Camera className="text-slate-400" size={32} />}
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files?.[0] && setAvatarPreview(URL.createObjectURL(e.target.files[0]))} />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid md:grid-cols-2 gap-10">
                  <InputGroup label="Режим дня">
                    <div className="space-y-4">
                      <OptionCard 
                        active={form.schedule_type === 'morning'} 
                        icon={<Sun />} 
                        label="Жаворонок" 
                        desc="Просыпаюсь рано, ложусь рано."
                        onClick={() => setForm({...form, schedule_type: 'morning'})} 
                      />
                      <OptionCard 
                        active={form.schedule_type === 'evening'} 
                        icon={<Moon />} 
                        label="Сова" 
                        desc="Активен ночью, люблю поспать подольше."
                        onClick={() => setForm({...form, schedule_type: 'evening'})} 
                      />
                      <OptionCard 
                        active={form.schedule_type === 'flexible'} 
                        icon={<Coffee />} 
                        label="Гибкий график" 
                        desc="Всегда по-разному."
                        onClick={() => setForm({...form, schedule_type: 'flexible'})} 
                      />
                    </div>
                  </InputGroup>
                  <div className="space-y-10 bg-indigo-500/5 p-8 rounded-[2.5rem]">
                    <InputGroup label={`Чистоплотность: ${form.cleanliness_level}`}>
                      <input type="range" min="1" max="5" value={form.cleanliness_level} onChange={e => setForm({...form, cleanliness_level: e.target.value})} className="premium-range" />
                    </InputGroup>
                    <InputGroup label={`Шумоустойчивость: ${form.noise_tolerance}`}>
                      <input type="range" min="1" max="5" value={form.noise_tolerance} onChange={e => setForm({...form, noise_tolerance: e.target.value})} className="premium-range" />
                    </InputGroup>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-10">
                  <InputGroup label="Твоя ситуация">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <OptionCard 
                        active={form.status === 1} 
                        icon={<Users2 />} 
                        label="Ищу сожителей" 
                        desc="Нет жилья, ищу компанию для совместной аренды."
                        onClick={() => setForm({...form, status: 1})} 
                      />
                      <OptionCard 
                        active={form.status === 2} 
                        icon={<Home />} 
                        label="Ищу к себе" 
                        desc="Есть квартира, нужен сосед."
                        onClick={() => setForm({...form, status: 2})} 
                      />
                      <OptionCard 
                        active={form.status === 3} 
                        icon={<Check />} 
                        label="Уже с жильем" 
                        desc="Просто хочу быть в комьюнити."
                        onClick={() => setForm({...form, status: 3})} 
                      />
                    </div>
                  </InputGroup>
                  <div className="grid grid-cols-2 gap-6">
                    <InputGroup label="Факультет">
                      <input value={form.faculty} onChange={e => setForm({...form, faculty: e.target.value})} placeholder="Напр: IT" className="premium-input" />
                    </InputGroup>
                    <InputGroup label="Курс">
                      <input value={form.study_type} onChange={e => setForm({...form, study_type: e.target.value})} placeholder="Напр: 2 курс" className="premium-input" />
                    </InputGroup>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="max-w-2xl mx-auto space-y-12">
                  <div className="text-center">
                    <InputGroup label="Месячный бюджет (₸)">
                      <input type="number" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} className="premium-input text-5xl text-center text-indigo-500 font-black" />
                    </InputGroup>
                  </div>
                  <InputGroup label="Желаемая локация">
                    <div className="relative">
                      <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-500" size={20} />
                      <input value={form.preferred_location} onChange={e => setForm({...form, preferred_location: e.target.value})} placeholder="Район или ЖК" className="premium-input pl-14" />
                    </div>
                  </InputGroup>
                </div>
              )}

              {step === 5 && (
                <div className="grid md:grid-cols-2 gap-10">
                  <div className="space-y-8">
                    <InputGroup label="Предпочтения по полу">
                      <select value={form.preferred_gender} onChange={e => setForm({...form, preferred_gender: e.target.value})} className="premium-input bg-white dark:bg-slate-900">
                        <option value="any">Любой</option>
                        <option value="male">Парни</option>
                        <option value="female">Девушки</option>
                      </select>
                    </InputGroup>
                    <InputGroup label="Возраст">
                      <div className="flex items-center gap-4">
                        <input type="number" value={form.preferred_age_min} onChange={e => setForm({...form, preferred_age_min: e.target.value})} className="premium-input text-center" />
                        <span className="text-slate-400">—</span>
                        <input type="number" value={form.preferred_age_max} onChange={e => setForm({...form, preferred_age_max: e.target.value})} className="premium-input text-center" />
                      </div>
                    </InputGroup>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/5 p-8 rounded-[3rem] space-y-6 flex flex-col justify-center">
                    <ToggleItem active={form.preferred_pets} label="Питомцы" desc="Ок с животными" icon={<Dog />} onClick={() => setForm({...form, preferred_pets: !form.preferred_pets})} />
                    <ToggleItem active={form.preferred_smoking} label="Курение" desc="Ок с курением" icon={<Cigarette />} onClick={() => setForm({...form, preferred_smoking: !form.preferred_smoking})} />
                  </div>
                </div>
              )}

              {step === 6 && (
                <InputGroup label="О себе (Manifesto)">
                  <textarea value={form.about_me} onChange={e => setForm({...form, about_me: e.target.value})} className="premium-input min-h-[200px] py-6 resize-none" placeholder="Расскажи о своих привычках и интересах..." />
                </InputGroup>
              )}

            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="mt-16 flex justify-between items-center">
          <button onClick={() => setStep(s => s - 1)} disabled={step === 1 || saving} className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest text-slate-400 disabled:opacity-0 transition-all">
            <ChevronLeft size={16} /> Назад
          </button>
          
          <button onClick={handleNext} disabled={saving} className="px-10 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all active:scale-95">
            {saving ? "Сохранение..." : step === 6 ? "Готово" : "Далее"}
          </button>
        </footer>
      </div>

      <style jsx global>{`
        .premium-input {
          width: 100%; padding: 1rem 1.25rem; background: transparent;
          border: 2px solid #F1F5F9; border-radius: 1.25rem; font-size: 0.875rem;
          font-weight: 700; outline: none; transition: 0.3s;
        }
        .dark .premium-input { border-color: #1E293B; color: white; }
        .premium-input:focus { border-color: #6366F1; background: #fff; }
        .dark .premium-input:focus { background: #0F172A; }
        .premium-range { width: 100%; height: 5px; background: #E2E8F0; appearance: none; border-radius: 10px; outline: none; }
        .dark .premium-range { background: #1E293B; }
        .premium-range::-webkit-slider-thumb { appearance: none; width: 18px; height: 18px; background: #6366F1; border-radius: 50%; cursor: pointer; border: 3px solid #fff; box-shadow: 0 0 10px rgba(99, 102, 241, 0.3); }
      `}</style>
    </div>
  );
}

function InputGroup({ label, children }: any) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black uppercase text-indigo-500/70 tracking-widest ml-2">{label}</label>
      {children}
    </div>
  );
}

function OptionCard({ active, onClick, label, desc, icon }: any) {
  return (
    <button 
      onClick={onClick} 
      className={`w-full flex flex-col items-start gap-2.5 p-5 rounded-[1.8rem] border-2 transition-all text-left ${
        active 
          ? "border-indigo-500 bg-indigo-500 text-white shadow-lg shadow-indigo-500/15" 
          : "border-slate-100 dark:border-slate-800/50 text-slate-500 hover:border-indigo-100 dark:hover:border-indigo-900/30"
      }`}
    >
      <div className={`p-2.5 rounded-xl ${active ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10"}`}>
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 20 }) : icon}
      </div>
      <div>
        <div className="font-black uppercase text-[10px] tracking-widest mb-0.5">{label}</div>
        {desc && <div className={`text-[9px] leading-tight font-medium ${active ? "text-white/70" : "text-slate-400"}`}>{desc}</div>}
      </div>
    </button>
  );
}

function ToggleItem({ active, label, desc, icon, onClick }: any) {
  return (
    <div onClick={onClick} className="flex items-center justify-between cursor-pointer group py-1">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl transition-colors ${active ? "bg-indigo-500 text-white" : "bg-white dark:bg-slate-800 text-slate-400"}`}>
          {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 16 }) : icon}
        </div>
        <div className="flex flex-col">
          <span className={`text-[10px] font-black uppercase tracking-tight ${active ? "text-slate-900 dark:text-white" : "text-slate-500"}`}>{label}</span>
          {desc && <span className="text-[8px] text-slate-400 font-medium leading-none mt-1">{desc}</span>}
        </div>
      </div>
      <div className={`w-9 h-5 rounded-full p-1 transition-colors ${active ? "bg-indigo-500" : "bg-slate-200 dark:bg-slate-700"}`}>
        <div className={`w-3 h-3 bg-white rounded-full transition-transform ${active ? "translate-x-4" : "translate-x-0"}`} />
      </div>
    </div>
  );
}