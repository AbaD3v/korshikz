// src/components/EditProfileForm.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient.js";
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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (avatarFile) {
      const url = URL.createObjectURL(avatarFile);
      setAvatarPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setAvatarPreview(profile.avatar_url);
    }
  }, [avatarFile, profile.avatar_url]);

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

      <div className="p-6">
        <div className="flex flex-col gap-5 md:flex-row">
          <div className="md:w-56">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Аватар
            </label>

            <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 p-4 dark:border-gray-700">
              <div className="mb-3 h-28 w-28 overflow-hidden rounded-full border bg-gray-100 dark:bg-gray-800">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Аватар"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                    Нет фото
                  </div>
                )}
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                className="block w-full text-sm"
              />

              {errors.avatar && (
                <p className="mt-2 text-xs text-red-500">{errors.avatar}</p>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Полное имя
              </label>
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={form.full_name}
                onChange={(e) => handleChange("full_name", e.target.value)}
              />
              {errors.full_name && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.full_name}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Возраст
                </label>
                <input
                  className="w-full rounded-xl border px-3 py-2"
                  type="number"
                  value={form.age}
                  onChange={(e) => handleChange("age", e.target.value)}
                />
                {errors.age && (
                  <p className="mt-1 text-xs text-red-500">{errors.age}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Город</label>
                <input
                  className="w-full rounded-xl border px-3 py-2"
                  value={form.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                />
                {errors.city && (
                  <p className="mt-1 text-xs text-red-500">{errors.city}</p>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Университет
              </label>
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={form.university}
                onChange={(e) => handleChange("university", e.target.value)}
              />
              {errors.university && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.university}
                </p>
              )}
            </div>
          </div>
        </div>
        </div>

        {/* University Info */}
        <section className="p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#1a1d26]/50 space-y-4">
          <h3 className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2">
            <GraduationCap size={14} /> Образование
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 ml-1">ВУЗ</label>
              <input className="w-full bg-white dark:bg-[#0f1117] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:border-blue-500 outline-none transition-all dark:text-white" value={form.university} onChange={e => handleChange("university", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 ml-1">Факультет</label>
              <input className="w-full bg-white dark:bg-[#0f1117] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:border-blue-500 outline-none transition-all dark:text-white" value={form.faculty} onChange={e => handleChange("faculty", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 ml-1">Курс</label>
              <input className="w-full bg-white dark:bg-[#0f1117] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:border-blue-500 outline-none transition-all dark:text-white" type="number" value={form.course} onChange={e => handleChange("course", e.target.value)} />
            </div>
          </div>
        </section>

        {/* Preferences & Bio */}
        <section className="p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#1a1d26]/50 space-y-4">
          <h3 className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest flex items-center gap-2">
            <Info size={14} /> Дополнительно
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 ml-1">Статус</label>
              <select className="w-full bg-white dark:bg-[#0f1117] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:border-blue-500 outline-none transition-all dark:text-white" value={form.status} onChange={e => handleChange("status", e.target.value)}>
                <option value="searching">В поиске</option>
                <option value="staying">Уже живу</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 ml-1">Бюджет (₸)</label>
              <input className="w-full bg-white dark:bg-[#0f1117] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:border-blue-500 outline-none transition-all dark:text-white" type="number" value={form.budget} onChange={e => handleChange("budget", e.target.value)} />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 ml-1">Хобби</label>
            <input className="w-full bg-white dark:bg-[#0f1117] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:border-blue-500 outline-none transition-all dark:text-white" value={form.hobbies} onChange={e => handleChange("hobbies", e.target.value)} placeholder="Через запятую..." />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">О себе</label>
            <textarea
              className="w-full rounded-xl border px-3 py-2"
              rows={4}
              value={form.about_me}
              onChange={(e) => handleChange("about_me", e.target.value)}
            />
            {errors.about_me && (
              <p className="mt-1 text-xs text-red-500">{errors.about_me}</p>
            )}
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

      <div className="flex gap-3 p-6">
        <button
          className="rounded-xl bg-emerald-600 px-4 py-2 text-white disabled:opacity-60"
          disabled={saving || !isChanged}
          onClick={handleSubmit}
        >
          {saving ? "Сохранение..." : "Сохранить"}
        </button>

        <button
          className="rounded-xl border px-4 py-2"
          onClick={onCancel}
          disabled={saving}
        >
          Отмена
        </button>
      </div>
    </div>
  );
}
