// Файл: app/onboarding/page.tsx
// Многошаговый онбординг (Wizard)
// Шаги: 1) Основное 2) Привычки 3) Учёба 4) Жильё 5) Предпочтения соседа 6) О себе

"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { sanitizeFileName } from "../lib/sanitizeFileName";

type ProfileForm = {
  // Basic
  full_name: string | null;
  phone: string | null;
  birthday: string | null;
  city: string | null;
  avatar_url: string | null;

  // Habits
  wake_time: string | null;
  sleep_time: string | null;
  cleanliness_level: number | null;
  noise_tolerance: number | null;
  schedule_type: string | null;

  // Study
  university: string | null;
  faculty: string | null;
  course: number | null;
  study_type: string | null;
  is_student: boolean | null;

  // Housing prefs
  budget_min: number | null;
  budget_max: number | null;
  preferred_location: string | null;
  need_furnished: boolean | null;
  room_type: string | null;

  // Neighbor prefs
  preferred_gender: string | null;
  preferred_age_min: number | null;
  preferred_age_max: number | null;
  preferred_pets: boolean | null;
  preferred_smoking: boolean | null;

  // Matching
  introvert_extrovert: string | null;
  lifestyle: string | null;
  about_me: string | null;
};

const initialForm: ProfileForm = {
  full_name: null,
  phone: null,
  birthday: null,
  city: null,
  avatar_url: null,

  wake_time: null,
  sleep_time: null,
  cleanliness_level: 3,
  noise_tolerance: 3,
  schedule_type: null,

  university: null,
  faculty: null,
  course: null,
  study_type: null,
  is_student: null,

  budget_min: null,
  budget_max: null,
  preferred_location: null,
  need_furnished: null,
  room_type: null,

  preferred_gender: null,
  preferred_age_min: null,
  preferred_age_max: null,
  preferred_pets: null,
  preferred_smoking: null,

  introvert_extrovert: null,
  lifestyle: null,
  about_me: null,
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // avatar local
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const MAX_FILE_SIZE = 1024 * 1024 * 3; // 3MB

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = (authData as any)?.user ?? null;
        if (!user) {
          router.replace("/login");
          return;
        }
        setUserId(user.id);

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (error) console.error("fetch profile error", error);

        if (profile) {
          // map DB profile to form
          setForm((f) => ({ ...f, ...mapProfileToForm(profile) }));
          if (profile.avatar_url) setAvatarPreview(profile.avatar_url);
          if (profile.isOnboarded) {
            // already onboarded — redirect to profile
            router.replace(`/profile/${user.id}`);
            return;
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();

    return () => {
      mountedRef.current = false;
    };
  }, [router]);

  function mapProfileToForm(profile: any): Partial<ProfileForm> {
    // Only take known keys, avoid unexpected fields
    const out: any = {};
    for (const k of Object.keys(initialForm)) {
      if (profile[k] !== undefined) out[k] = profile[k];
    }
    return out;
  }

  /* ================= Avatar handling ================= */
  const readFileAsDataURL = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(new Error("Ошибка чтения файла"));
      r.onload = () => resolve(r.result as string);
      r.readAsDataURL(file);
    });

  const uploadAvatarToStorage = async (file: File, uid: string) => {
    const safe = sanitizeFileName(file.name || `avatar-${Date.now()}`);
    const path = `${uid}/${Date.now()}-${safe}`;
    const bucket = "avatars";

    const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicData?.publicUrl ?? null;
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setErrors((p) => ({ ...p, avatar: undefined }));

    if (!f) {
      setAvatarFile(null);
      setAvatarPreview(null);
      setForm((p) => ({ ...p, avatar_url: null }));
      return;
    }
    if (f.size > MAX_FILE_SIZE) return setErrors((p) => ({ ...p, avatar: "Файл слишком большой (max 3MB)" }));

    setAvatarFile(f);
    const url = URL.createObjectURL(f);
    setAvatarPreview(url);
  };

  /* ================= Validation ================= */
  const validateStep = (s = step) => {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!form.full_name || !form.full_name.trim()) e.full_name = "Введите имя";
      // phone optional but if present basic check
      if (form.phone && form.phone.length < 6) e.phone = "Неверный телефон";
    }
    if (s === 3) {
      if (form.is_student === null && (!form.university || !form.university.trim())) e.university = "Укажите университет или отметьте, что вы не студент";
    }
    // add more validations as needed
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ================= Save ================= */
  const savePartial = async (partial: Partial<ProfileForm> = {}) => {
    if (!userId) return;
    setSaving(true);
    try {
      const payload = { ...form, ...partial } as any;

      // if avatarFile present, upload and set avatar_url
      if (avatarFile) {
        try {
          const publicUrl = await uploadAvatarToStorage(avatarFile, userId);
          payload.avatar_url = publicUrl;
        } catch (err) {
          console.error("avatar upload err", err);
        }
      }

      // Upsert: if profile exists update, else insert
      const { data, error } = await supabase.from("profiles").upsert([{ id: userId, ...payload }], { onConflict: "id" });
      if (error) throw error;
    } catch (err: any) {
      console.error("savePartial error", err);
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  // Save on step change (auto-save)
  useEffect(() => {
    // validate before moving forward
    // nothing here — we'll call save when user clicks next/finish
  }, [step]);

  const handleNext = async () => {
    if (!validateStep(step)) return;
    // save current form partial
    await savePartial();
    setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  const handleFinish = async () => {
    if (!validateStep(step)) return;
    setSaving(true);
    try {
      const payload = { ...form, isOnboarded: true } as any;
      if (avatarFile) {
        try {
          payload.avatar_url = await uploadAvatarToStorage(avatarFile, userId!);
        } catch (err) {
          console.error("avatar upload error", err);
        }
      }

      // upsert final
      const { error } = await supabase.from("profiles").upsert([{ id: userId, ...payload }], { onConflict: "id" });
      if (error) throw error;

      // redirect to profile
      router.push(`/profile/${userId}`);
    } catch (err: any) {
      console.error("finish error", err);
      setErrors((p) => ({ ...p, submit: err.message || String(err) }));
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-center">Загрузка...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded shadow mt-6">
      <h1 className="text-2xl font-bold mb-4">Онбординг — расскажи о себе</h1>

      <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
        <div>Шаг {step} из 6</div>
        <div className="flex-1 bg-gray-100 h-2 rounded overflow-hidden">
          <div style={{ width: `${(step / 6) * 100}%` }} className="h-2 bg-emerald-500" />
        </div>
        {saving && <div className="text-xs">Сохранение...</div>}
      </div>

      {/* Step 1: Basic */}
      {step === 1 && (
        <div className="space-y-3">
          <label className="block">
            <div className="text-sm font-medium">Полное имя</div>
            <input value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full border p-2 rounded" />
            {errors.full_name && <p className="text-red-600 text-sm">{errors.full_name}</p>}
          </label>

          <label className="block">
            <div className="text-sm font-medium">Телефон (опционально)</div>
            <input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border p-2 rounded" />
            {errors.phone && <p className="text-red-600 text-sm">{errors.phone}</p>}
          </label>

          <label className="block">
            <div className="text-sm font-medium">Дата рождения</div>
            <input type="date" value={form.birthday ?? ""} onChange={(e) => setForm({ ...form, birthday: e.target.value })} className="w-full border p-2 rounded" />
          </label>

          <label className="block">
            <div className="text-sm font-medium">Город</div>
            <input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full border p-2 rounded" />
          </label>

          <label className="block">
            <div className="text-sm font-medium">Аватар</div>
            <input type="file" accept="image/*" onChange={handleAvatarChange} />
            {avatarPreview && <img src={avatarPreview} className="w-24 h-24 rounded-full mt-2 object-cover border" alt="preview" />}
            {errors.avatar && <p className="text-red-600 text-sm">{errors.avatar}</p>}
          </label>

          <div className="flex gap-2 mt-4">
            <button onClick={handleNext} className="ml-auto bg-emerald-600 text-white px-4 py-2 rounded">Далее</button>
          </div>
        </div>
      )}

      {/* Step 2: Habits */}
      {step === 2 && (
        <div className="space-y-3">
          <label>
            <div className="text-sm font-medium">Время подъёма</div>
            <input value={form.wake_time ?? ""} onChange={(e) => setForm({ ...form, wake_time: e.target.value })} className="w-full border p-2 rounded" placeholder="08:00" />
          </label>

          <label>
            <div className="text-sm font-medium">Время сна</div>
            <input value={form.sleep_time ?? ""} onChange={(e) => setForm({ ...form, sleep_time: e.target.value })} className="w-full border p-2 rounded" placeholder="23:30" />
          </label>

          <label>
            <div className="text-sm font-medium">Аккуратность (1-5)</div>
            <input type="number" min={1} max={5} value={String(form.cleanliness_level ?? 3)} onChange={(e) => setForm({ ...form, cleanliness_level: Number(e.target.value) })} className="w-full border p-2 rounded" />
          </label>

          <label>
            <div className="text-sm font-medium">Шумоустойчивость (1-5)</div>
            <input type="number" min={1} max={5} value={String(form.noise_tolerance ?? 3)} onChange={(e) => setForm({ ...form, noise_tolerance: Number(e.target.value) })} className="w-full border p-2 rounded" />
          </label>

          <label>
            <div className="text-sm font-medium">Тип графика</div>
            <select value={form.schedule_type ?? ""} onChange={(e) => setForm({ ...form, schedule_type: e.target.value })} className="w-full border p-2 rounded">
              <option value="">— Выберите —</option>
              <option value="morning">Утренний</option>
              <option value="evening">Вечерний</option>
              <option value="flexible">Гибкий</option>
            </select>
          </label>

          <div className="flex gap-2 mt-4">
            <button onClick={handleBack} className="px-4 py-2 border rounded">Назад</button>
            <button onClick={handleNext} className="ml-auto bg-emerald-600 text-white px-4 py-2 rounded">Далее</button>
          </div>
        </div>
      )}

      {/* Step 3: Study */}
      {step === 3 && (
        <div className="space-y-3">
          <label>
            <div className="text-sm font-medium">Университет</div>
            <input value={form.university ?? ""} onChange={(e) => setForm({ ...form, university: e.target.value })} className="w-full border p-2 rounded" />
          </label>

          <label>
            <div className="text-sm font-medium">Факультет</div>
            <input value={form.faculty ?? ""} onChange={(e) => setForm({ ...form, faculty: e.target.value })} className="w-full border p-2 rounded" />
          </label>

          <label>
            <div className="text-sm font-medium">Курс</div>
            <input type="number" min={1} value={String(form.course ?? "")} onChange={(e) => setForm({ ...form, course: Number(e.target.value) })} className="w-full border p-2 rounded" />
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={Boolean(form.is_student)} onChange={(e) => setForm({ ...form, is_student: e.target.checked })} /> Я студент
          </label>

          <label>
            <div className="text-sm font-medium">Тип обучения</div>
            <select value={form.study_type ?? ""} onChange={(e) => setForm({ ...form, study_type: e.target.value })} className="w-full border p-2 rounded">
              <option value="">— Выберите —</option>
              <option value="bachelor">Бакалавр</option>
              <option value="master">Магистратура</option>
              <option value="college">Колледж</option>
              <option value="other">Другое</option>
            </select>
          </label>

          <div className="flex gap-2 mt-4">
            <button onClick={handleBack} className="px-4 py-2 border rounded">Назад</button>
            <button onClick={handleNext} className="ml-auto bg-emerald-600 text-white px-4 py-2 rounded">Далее</button>
          </div>
        </div>
      )}

      {/* Step 4: Housing prefs */}
      {step === 4 && (
        <div className="space-y-3">
          <label>
            <div className="text-sm font-medium">Бюджет мин</div>
            <input type="number" value={String(form.budget_min ?? "")} onChange={(e) => setForm({ ...form, budget_min: Number(e.target.value) })} className="w-full border p-2 rounded" />
          </label>

          <label>
            <div className="text-sm font-medium">Бюджет макс</div>
            <input type="number" value={String(form.budget_max ?? "")} onChange={(e) => setForm({ ...form, budget_max: Number(e.target.value) })} className="w-full border p-2 rounded" />
          </label>

          <label>
            <div className="text-sm font-medium">Предпочтительный район</div>
            <input value={form.preferred_location ?? ""} onChange={(e) => setForm({ ...form, preferred_location: e.target.value })} className="w-full border p-2 rounded" />
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={Boolean(form.need_furnished)} onChange={(e) => setForm({ ...form, need_furnished: e.target.checked })} /> Нужна мебель
          </label>

          <label>
            <div className="text-sm font-medium">Тип жилья</div>
            <select value={form.room_type ?? ""} onChange={(e) => setForm({ ...form, room_type: e.target.value })} className="w-full border p-2 rounded">
              <option value="">— Выберите —</option>
              <option value="room">Комната</option>
              <option value="studio">Студия</option>
              <option value="1br">1-к квартира</option>
              <option value="2br">2-к квартира</option>
            </select>
          </label>

          <div className="flex gap-2 mt-4">
            <button onClick={handleBack} className="px-4 py-2 border rounded">Назад</button>
            <button onClick={handleNext} className="ml-auto bg-emerald-600 text-white px-4 py-2 rounded">Далее</button>
          </div>
        </div>
      )}

      {/* Step 5: Neighbor prefs */}
      {step === 5 && (
        <div className="space-y-3">
          <label>
            <div className="text-sm font-medium">Пол соседа</div>
            <select value={form.preferred_gender ?? ""} onChange={(e) => setForm({ ...form, preferred_gender: e.target.value })} className="w-full border p-2 rounded">
              <option value="">Не важно</option>
              <option value="male">Мужчина</option>
              <option value="female">Женщина</option>
              <option value="other">Другое</option>
            </select>
          </label>

          <label>
            <div className="text-sm font-medium">Возраст мин</div>
            <input type="number" value={String(form.preferred_age_min ?? "")} onChange={(e) => setForm({ ...form, preferred_age_min: Number(e.target.value) })} className="w-full border p-2 rounded" />
          </label>

          <label>
            <div className="text-sm font-medium">Возраст макс</div>
            <input type="number" value={String(form.preferred_age_max ?? "")} onChange={(e) => setForm({ ...form, preferred_age_max: Number(e.target.value) })} className="w-full border p-2 rounded" />
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={Boolean(form.preferred_pets)} onChange={(e) => setForm({ ...form, preferred_pets: e.target.checked })} /> Ок с питомцами
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={Boolean(form.preferred_smoking)} onChange={(e) => setForm({ ...form, preferred_smoking: e.target.checked })} /> Ок с курящими
          </label>

          <div className="flex gap-2 mt-4">
            <button onClick={handleBack} className="px-4 py-2 border rounded">Назад</button>
            <button onClick={handleNext} className="ml-auto bg-emerald-600 text-white px-4 py-2 rounded">Далее</button>
          </div>
        </div>
      )}

      {/* Step 6: About */}
      {step === 6 && (
        <div className="space-y-3">
          <label>
            <div className="text-sm font-medium">Интроверт / Экстраверт</div>
            <select value={form.introvert_extrovert ?? ""} onChange={(e) => setForm({ ...form, introvert_extrovert: e.target.value })} className="w-full border p-2 rounded">
              <option value="">— Выберите —</option>
              <option value="introvert">Интроверт</option>
              <option value="extrovert">Экстраверт</option>
              <option value="mixed">Смешанный</option>
            </select>
          </label>

          <label>
            <div className="text-sm font-medium">Образ жизни</div>
            <select value={form.lifestyle ?? ""} onChange={(e) => setForm({ ...form, lifestyle: e.target.value })} className="w-full border p-2 rounded">
              <option value="">— Выберите —</option>
              <option value="calm">Спокойный</option>
              <option value="active">Активный</option>
              <option value="party">Праздничный</option>
              <option value="work">Рабочий</option>
            </select>
          </label>

          <label>
            <div className="text-sm font-medium">О себе (коротко)</div>
            <textarea value={form.about_me ?? ""} onChange={(e) => setForm({ ...form, about_me: e.target.value })} className="w-full border p-2 rounded h-32" />
          </label>

          {errors.submit && <p className="text-red-600">{errors.submit}</p>}

          <div className="flex gap-2 mt-4">
            <button onClick={handleBack} className="px-4 py-2 border rounded">Назад</button>
            <button onClick={handleFinish} disabled={saving} className="ml-auto bg-emerald-600 text-white px-4 py-2 rounded">{saving ? "Сохранение..." : "Завершить"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
