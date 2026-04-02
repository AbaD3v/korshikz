import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/hooks/utils/supabase/client";
import { toast } from "sonner";
import { 
  Save, X, User, GraduationCap, 
  MapPin, Hash, Heart, Info,
  CheckCircle2, Sparkles
} from "lucide-react";

// Интерфейс на основе твоего JSON
interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  age: number | null;
  gender: string | null;
  university: string | null;
  faculty: string | null;
  course: number | null;
  city: string | null;
  hobbies: string | null;
  about_me: string | null;
  pets: boolean | null;
  smoking: boolean | null;
  status: string | null;
  budget: number | null;
  avatar_url: string | null;
  is_verified: boolean;
}

interface Props {
  profile: Profile;
  onSave: (data: Profile) => void;
  onCancel: () => void;
}

export default function EditProfileForm({ profile, onSave, onCancel }: Props) {
  // Инициализация строго по полям из JSON
  const initialForm = useMemo(() => ({
    full_name: profile.full_name ?? "",
    username: profile.username ?? "",
    age: profile.age ? String(profile.age) : "",
    university: profile.university ?? "",
    faculty: profile.faculty ?? "",
    course: profile.course ? String(profile.course) : "",
    city: profile.city ?? "",
    hobbies: profile.hobbies ?? "",
    about_me: profile.about_me ?? "",
    status: profile.status ?? "searching",
    budget: profile.budget ? String(profile.budget) : "0",
    pets: Boolean(profile.pets),
    smoking: Boolean(profile.smoking),
  }), [profile]);

  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const isChanged = useMemo(() => 
    JSON.stringify(form) !== JSON.stringify(initialForm), 
  [form, initialForm]);

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    const t = toast.loading("Обновление данных...");
    try {
      const payload = {
        full_name: form.full_name || null,
        username: form.username || null,
        age: form.age ? Number(form.age) : null,
        university: form.university || null,
        faculty: form.faculty || null,
        course: form.course ? Number(form.course) : null,
        city: form.city || null,
        hobbies: form.hobbies || null,
        about_me: form.about_me || null,
        status: form.status,
        budget: Number(form.budget),
        pets: form.pets,
        smoking: form.smoking,
      };

      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", profile.id);

      if (error) throw error;

      toast.success("Изменения сохранены", { id: t });
      onSave({ ...profile, ...payload });
    } catch (e: any) {
      toast.error(e.message || "Ошибка", { id: t });
    } finally {
      setSaving(false);
    }
  };

  const sectionClass = "p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#1a1d26]/50 space-y-4";
  const labelClass = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 ml-1";
  const inputClass = "w-full bg-white dark:bg-[#0f1117] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:border-blue-500 outline-none transition-all dark:text-white";

  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-[#161922] rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
            <Sparkles size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold dark:text-white">Редактировать профиль</h2>
            <p className="text-xs text-gray-500">{profile.email}</p>
          </div>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
          <X size={22} />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Personal Info */}
        <section className={sectionClass}>
          <h3 className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
            <User size={14} /> Личные данные
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>ФИО</label>
              <input className={inputClass} value={form.full_name} onChange={e => handleChange("full_name", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Никнейм</label>
              <input className={inputClass} value={form.username} onChange={e => handleChange("username", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Возраст</label>
              <input className={inputClass} type="number" value={form.age} onChange={e => handleChange("age", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Город</label>
              <input className={inputClass} value={form.city} onChange={e => handleChange("city", e.target.value)} />
            </div>
          </div>
        </section>

        {/* University Info */}
        <section className={sectionClass}>
          <h3 className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2">
            <GraduationCap size={14} /> Образование
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className={labelClass}>ВУЗ</label>
              <input className={inputClass} value={form.university} onChange={e => handleChange("university", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Факультет</label>
              <input className={inputClass} value={form.faculty} onChange={e => handleChange("faculty", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Курс</label>
              <input className={inputClass} type="number" value={form.course} onChange={e => handleChange("course", e.target.value)} />
            </div>
          </div>
        </section>

        {/* Preferences & Bio */}
        <section className={sectionClass}>
          <h3 className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest flex items-center gap-2">
            <Info size={14} /> Дополнительно
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Статус</label>
              <select className={inputClass} value={form.status} onChange={e => handleChange("status", e.target.value)}>
                <option value="searching">В поиске</option>
                <option value="staying">Уже живу</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Бюджет (₸)</label>
              <input className={inputClass} type="number" value={form.budget} onChange={e => handleChange("budget", e.target.value)} />
            </div>
          </div>
          
          <div>
            <label className={labelClass}>Хобби</label>
            <input className={inputClass} value={form.hobbies} onChange={e => handleChange("hobbies", e.target.value)} placeholder="Через запятую..." />
          </div>

          <div>
            <label className={labelClass}>О себе</label>
            <textarea className={`${inputClass} min-h-[100px] resize-none`} value={form.about_me} onChange={e => handleChange("about_me", e.target.value)} />
          </div>

          {/* Toggles */}
          <div className="flex gap-6 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="hidden" checked={form.pets} onChange={e => handleChange("pets", e.target.checked)} />
              <div className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${form.pets ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-700'}`}>
                {form.pets && <CheckCircle2 size={12} className="text-white" />}
              </div>
              <span className="text-sm dark:text-gray-300">Питомцы</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="hidden" checked={form.smoking} onChange={e => handleChange("smoking", e.target.checked)} />
              <div className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${form.smoking ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-700'}`}>
                {form.smoking && <CheckCircle2 size={12} className="text-white" />}
              </div>
              <span className="text-sm dark:text-gray-300">Курение</span>
            </label>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="px-6 py-5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 bg-gray-50/30 dark:bg-[#1a1d26]/30">
        <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors">
          Отмена
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || !isChanged}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold transition-all ${
            isChanged 
            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 active:scale-95' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
          }`}
        >
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
          {saving ? "Сохранение..." : "Сохранить"}
        </button>
      </div>
    </div>
  );
}