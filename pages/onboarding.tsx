"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Sparkles, GraduationCap, Home, Users2, Info, 
  ChevronRight, ChevronLeft, Check, Camera, MapPin, 
  Moon, Sun, Coffee, Dog, Cigarette, Calendar // Добавил Calendar
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
    city: "Алматы",
    birthday: "", // Изменил на пустую строку для работы инпута
    cleanliness_level: 3,
    noise_tolerance: 3,
    schedule_type: "flexible",
    is_student: true,
    university: "",
    faculty: "",
    study_type: "",
    budget_min: 50000,
    budget_max: 150000,
    preferred_location: "",
    room_type: "room",
    preferred_gender: "any",
    preferred_age_min: 18,
    preferred_age_max: 30,
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
        setForm((prev: any) => ({ ...prev, ...profile }));
        if (profile.avatar_url) setAvatarPreview(profile.avatar_url);
      }
      setLoading(false);
    }
    init();
  }, [router]);

  const handleNext = async () => {
    setSaving(true);
    try {
      const isLast = step === STEPS.length;
      const payload: any = { ...form };
      
      // 1. Приведение ID и статуса
      payload.id = userId;
      payload.isOnboarded = isLast;

      // 2. Валидация Даты Рождения (Birthday)
      // Если дата не введена или пуста, отправляем null, иначе чистый YYYY-MM-DD
      if (!payload.birthday || payload.birthday.trim() === "") {
        payload.birthday = null;
      } else {
        const d = new Date(payload.birthday);
        if (!isNaN(d.getTime())) {
          payload.birthday = d.toISOString().split('T')[0];
        } else {
          payload.birthday = null;
        }
      }
      
      // 3. Приведение чисел (Усиленная проверка)
payload.budget_max = payload.budget_max ? Number(payload.budget_max) : null;
payload.budget_min = payload.budget_min ? Number(payload.budget_min) : null;
payload.preferred_age_min = payload.preferred_age_min ? Number(payload.preferred_age_min) : null;
payload.preferred_age_max = payload.preferred_age_max ? Number(payload.preferred_age_max) : null;

// Важно: принудительно ограничиваем диапазон 1-5 для уровней чистоты и шума
payload.cleanliness_level = Math.max(1, Math.min(5, Number(payload.cleanliness_level || 3)));
payload.noise_tolerance = Math.max(1, Math.min(5, Number(payload.noise_tolerance || 3)));

      const { error } = await supabase.from("profiles").upsert(payload, { onConflict: 'id' });
      
      if (error) {
        console.error("Ошибка сохранения:", error.message);
        alert(`Ошибка базы: ${error.message}`);
        return;
      }
      
      if (isLast) {
        setIsFinished(true);
        setTimeout(() => router.push(`/profile/${userId}`), 2500);
      } else {
        setStep(s => s + 1);
      }
    } catch (err) {
      console.error("Критическая ошибка:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#020617]"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#FDFDFF] dark:bg-[#020617] p-4 md:p-12 text-slate-900 dark:text-white transition-colors duration-500">
      
      <AnimatePresence>
        {isFinished && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-white dark:bg-[#020617] text-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-6">
              <div className="mx-auto w-24 h-24 bg-indigo-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.4)]">
                <Check size={48} className="text-white" strokeWidth={4} />
              </div>
              <h2 className="text-4xl font-black italic uppercase tracking-tighter">Летим в профиль</h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto">
        <header className="mb-16">
          <div className="flex justify-between items-end">
            <div className="space-y-2">
              <div className="flex gap-1">
                {STEPS.map(s => (
                  <div key={s.id} className={`h-1 rounded-full transition-all duration-700 ${step >= s.id ? "w-8 bg-indigo-500" : "w-2 bg-slate-200 dark:bg-slate-800"}`} />
                ))}
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500 pt-4">Stage {step}/06</p>
              <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none">
                {STEPS.find(s => s.id === step)?.title}
              </h1>
            </div>
          </div>
        </header>

        <main className="min-h-[480px]">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              
              {/* STEP 1: PERSONAL - ИСПРАВЛЕНО (Добавлен Birthday) */}
              {step === 1 && (
                <div className="grid md:grid-cols-2 gap-12 items-start">
                  <div className="space-y-8">
                    <InputGroup label="Твое полное имя">
                      <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} placeholder="Alex Smith" className="premium-input" />
                    </InputGroup>
                    
                    {/* НОВОЕ ПОЛЕ: ДАТА РОЖДЕНИЯ */}
                    <InputGroup label="Дата рождения">
                      <div className="relative">
                        <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-500" size={20} />
                        <input 
                          type="date" 
                          value={form.birthday || ""} 
                          onChange={e => setForm({...form, birthday: e.target.value})} 
                          className="premium-input pl-14 appearance-none" 
                        />
                      </div>
                    </InputGroup>

                    <InputGroup label="Город проживания">
                      <div className="relative">
                        <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-500" size={20} />
                        <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="premium-input pl-14" />
                      </div>
                    </InputGroup>
                  </div>
                  
                  <div className="relative group mx-auto">
                    <div className="w-48 h-48 rounded-[3.5rem] bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                      {avatarPreview ? <img src={avatarPreview} className="w-full h-full object-cover" /> : <Camera className="text-slate-400" size={32} />}
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files?.[0] && setAvatarPreview(URL.createObjectURL(e.target.files[0]))} />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: HABITS */}
              {step === 2 && (
                <div className="grid md:grid-cols-2 gap-12">
                  <InputGroup label="Когда ты активен?">
                    <div className="grid grid-cols-1 gap-4">
                      <OptionCard active={form.schedule_type === 'morning'} icon={<Sun size={20}/>} label="Жаворонок" onClick={() => setForm({...form, schedule_type: 'morning'})} />
                      <OptionCard active={form.schedule_type === 'evening'} icon={<Moon size={20}/>} label="Сова" onClick={() => setForm({...form, schedule_type: 'evening'})} />
                      <OptionCard active={form.schedule_type === 'flexible'} icon={<Coffee size={20}/>} label="Гибкий" onClick={() => setForm({...form, schedule_type: 'flexible'})} />
                    </div>
                  </InputGroup>
                  <div className="space-y-12 bg-slate-50 dark:bg-white/5 p-10 rounded-[3rem]">
                    <InputGroup label={`Уровень чистоты: ${form.cleanliness_level}`}>
                      <input type="range" min="1" max="5" value={form.cleanliness_level} onChange={e => setForm({...form, cleanliness_level: e.target.value})} className="premium-range" />
                    </InputGroup>
                    <InputGroup label={`Шумоустойчивость: ${form.noise_tolerance}`}>
                      <input type="range" min="1" max="5" value={form.noise_tolerance} onChange={e => setForm({...form, noise_tolerance: e.target.value})} className="premium-range" />
                    </InputGroup>
                  </div>
                </div>
              )}

              {/* STEP 3, 4, 5, 6 - оставляем без изменений, так как там логика верна */}
              {step === 3 && (
                <div className="grid md:grid-cols-2 gap-8">
                  <InputGroup label="Твой статус">
                    <div className="flex gap-4">
                      <button onClick={() => setForm({...form, is_student: true})} className={`flex-1 py-6 rounded-[2rem] font-black uppercase text-[10px] tracking-widest border-2 transition-all ${form.is_student ? 'border-indigo-500 bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}>Студент</button>
                      <button onClick={() => setForm({...form, is_student: false})} className={`flex-1 py-6 rounded-[2rem] font-black uppercase text-[10px] tracking-widest border-2 transition-all ${!form.is_student ? 'border-indigo-500 bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}>Работаю</button>
                    </div>
                  </InputGroup>
                  <InputGroup label="Вуз или Компания">
                    <input value={form.university} onChange={e => setForm({...form, university: e.target.value})} placeholder="KBTU / Google" className="premium-input" />
                  </InputGroup>
                  <InputGroup label="Факультет / Должность">
                    <input value={form.faculty} onChange={e => setForm({...form, faculty: e.target.value})} className="premium-input" />
                  </InputGroup>
                  <InputGroup label="Курс или Грейд">
                    <input value={form.study_type} onChange={e => setForm({...form, study_type: e.target.value})} className="premium-input" />
                  </InputGroup>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-12">
                  <div className="grid md:grid-cols-2 gap-8">
                    <InputGroup label="Минимальный бюджет (₸)">
                      <input type="number" value={form.budget_min || ""} onChange={e => setForm({...form, budget_min: e.target.value})} className="premium-input text-2xl" />
                    </InputGroup>
                    <InputGroup label="Максимальный бюджет (₸)">
                      <input type="number" value={form.budget_max || ""} onChange={e => setForm({...form, budget_max: e.target.value})} className="premium-input text-2xl text-indigo-500" />
                    </InputGroup>
                  </div>
                  <InputGroup label="Где хочешь жить?">
                    <input value={form.preferred_location} onChange={e => setForm({...form, preferred_location: e.target.value})} placeholder="Район или улица" className="premium-input" />
                  </InputGroup>
                </div>
              )}

              {step === 5 && (
                <div className="grid md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <InputGroup label="Кого ищем?">
                      <select value={form.preferred_gender} onChange={e => setForm({...form, preferred_gender: e.target.value})} className="premium-input bg-transparent appearance-none">
                        <option value="any">Любой пол</option>
                        <option value="male">Только парни</option>
                        <option value="female">Только девушки</option>
                      </select>
                    </InputGroup>
                    <InputGroup label="Возраст соседа">
                      <div className="flex items-center gap-4">
                        <input type="number" value={form.preferred_age_min} onChange={e => setForm({...form, preferred_age_min: e.target.value})} className="premium-input text-center py-4" />
                        <div className="h-1 w-6 bg-slate-200 rounded-full"/>
                        <input type="number" value={form.preferred_age_max} onChange={e => setForm({...form, preferred_age_max: e.target.value})} className="premium-input text-center py-4" />
                      </div>
                    </InputGroup>
                  </div>
                  <div className="bg-indigo-500/5 p-10 rounded-[3.5rem] space-y-6 border border-indigo-500/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Критичные фильтры</p>
                    <ToggleItem active={form.preferred_pets} label="Ок с животными" icon={<Dog size={18}/>} onClick={() => setForm({...form, preferred_pets: !form.preferred_pets})} />
                    <ToggleItem active={form.preferred_smoking} label="Ок с курением" icon={<Cigarette size={18}/>} onClick={() => setForm({...form, preferred_smoking: !form.preferred_smoking})} />
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="space-y-8">
                  <InputGroup label="Твой Manifesto">
                    <textarea value={form.about_me} onChange={e => setForm({...form, about_me: e.target.value})} className="premium-input min-h-[250px] resize-none py-8" placeholder="Расскажи что-то..." />
                  </InputGroup>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="mt-20 flex justify-between items-center">
          <button onClick={() => setStep(s => s - 1)} disabled={step === 1 || saving} className="group flex items-center gap-3 font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-indigo-500 transition-colors disabled:opacity-0">
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Назад
          </button>
          
          <button onClick={handleNext} disabled={saving} className="relative group overflow-hidden px-12 py-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2.5rem] font-black italic uppercase tracking-tighter shadow-2xl hover:scale-105 active:scale-95 transition-all">
            <span className="relative z-10 flex items-center gap-3">
              {saving ? "Processing..." : step === 6 ? "Finish Base" : "Next Step"}
              <ChevronRight size={20} />
            </span>
            <div className="absolute inset-0 bg-indigo-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </button>
        </footer>
      </div>

      <style jsx global>{`
        .premium-input {
          width: 100%; padding: 1.5rem 2rem; background: transparent;
          border: 2px solid #F1F5F9; border-radius: 2.5rem; font-weight: 800; outline: none; transition: 0.4s;
        }
        .dark .premium-input { border-color: #1E293B; color: white; }
        .premium-input:focus { border-color: #6366F1; background: #fff; }
        .dark .premium-input:focus { background: #0F172A; }
        .premium-range { width: 100%; height: 6px; border-radius: 10px; background: #E2E8F0; appearance: none; outline: none; }
        .premium-range::-webkit-slider-thumb { appearance: none; width: 24px; height: 24px; background: #6366F1; border-radius: 50%; cursor: pointer; }
      `}</style>
    </div>
  );
}

// Вспомогательные компоненты без изменений
function InputGroup({ label, children, error }: any) {
  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-between items-center px-4">
        <label className="text-[10px] font-black uppercase text-indigo-500/60 tracking-[0.2em]">{label}</label>
      </div>
      {children}
    </div>
  );
}

function OptionCard({ active, onClick, label, icon }: any) {
  return (
    <button onClick={onClick} className={`flex items-center gap-4 p-6 rounded-[2.5rem] border-2 transition-all ${active ? "border-indigo-500 bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "border-slate-100 dark:border-slate-800 text-slate-500"}`}>
      <div className={`${active ? "text-white" : "text-indigo-500"}`}>{icon}</div>
      <span className="font-black uppercase text-xs tracking-widest">{label}</span>
    </button>
  );
}

function ToggleItem({ active, label, icon, onClick }: any) {
  return (
    <div onClick={onClick} className="flex items-center justify-between cursor-pointer group">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${active ? "bg-indigo-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>{icon}</div>
        <span className={`text-xs font-black uppercase tracking-tight ${active ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>{label}</span>
      </div>
      <div className={`w-12 h-6 rounded-full p-1 transition-colors ${active ? "bg-indigo-500" : "bg-slate-200 dark:bg-slate-800"}`}>
        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${active ? "translate-x-6" : "translate-x-0"}`} />
      </div>
    </div>
  );
}