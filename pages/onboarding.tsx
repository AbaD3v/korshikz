"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { sanitizeFileName } from "../lib/sanitizeFileName";

/** =============================
 * Улучшенный онбординг:
 * - Мгновенная проверка профиля
 * - Нет мигания страницы
 * - Красивый UI
 * - Полная валидация
 * - Отсутствие кнопки, если профиль уже заполнен
 * ============================= */

export default function OnboardingPage(): JSX.Element {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileExists, setProfileExists] = useState<boolean | null>(null);
  const [alreadyOnboarded, setAlreadyOnboarded] = useState(false);

  // form state
  const [username, setUsername] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [useStorage, setUseStorage] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const MAX_FILE_SIZE = 1024 * 1024 * 2; // 2MB

  /* =====================================
  FETCH USER + PROFILE
  ===================================== */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = (authData as any)?.user ?? null;

        if (!mounted) return;
        if (!user) {
          setMessage("Пожалуйста, войдите.");
          setLoading(false);
          return;
        }

        setUserId(user.id);

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, isOnboarded")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.isOnboarded) {
          setAlreadyOnboarded(true);
          router.replace(`/profile/${user.id}`);
          return;
        }

        if (profile) {
          setProfileExists(true);
          setUsername(profile.username ?? "");
          setAvatarPreview(profile.avatar_url ?? null);
        } else {
          setProfileExists(false);
        }
      } catch (err) {
        console.error("Onboarding.init error", err);
        setMessage("Ошибка загрузки профиля");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  /* =====================================
  FILE HANDLING
  ===================================== */
  const readFileAsDataURL = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(new Error("Ошибка чтения файла"));
      r.onload = () => resolve(r.result as string);
      r.readAsDataURL(file);
    });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setErrors((p) => ({ ...p, avatar: undefined }));

    if (!f) {
      setAvatarFile(null);
      setAvatarPreview(null);
      return;
    }
    if (f.size > MAX_FILE_SIZE)
      return setErrors((p) => ({ ...p, avatar: "Файл слишком большой (макс ~2MB)" }));

    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  /* =====================================
  STORAGE UPLOAD
  ===================================== */
  const uploadAvatarToStorage = async (file: File, uid: string) => {
    const safe = sanitizeFileName(file.name || `avatar-${Date.now()}`);
    const path = `${uid}/${Date.now()}-${safe}`;
    const bucket = "avatars";

    const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicData?.publicUrl ?? null;
  };

  /* =====================================
  SUBMIT FORM
  ===================================== */
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setMessage(null);
    setErrors({});
    if (!userId) return setMessage("Вы не авторизованы");

    if (!username.trim()) {
      setErrors({ username: "Введите ник" });
      return;
    }

    setSaving(true);

    try {
      let avatar_url: string | null = avatarPreview ?? null;

      if (avatarFile) {
        avatar_url = useStorage
          ? await uploadAvatarToStorage(avatarFile, userId)
          : await readFileAsDataURL(avatarFile);
      }

      const payload = {
        username: username.trim(),
        avatar_url: avatar_url ?? null,
        isOnboarded: true,
      };

      if (profileExists) {
        await supabase.from("profiles").update(payload).eq("id", userId);
      } else {
        await supabase.from("profiles").insert([{ id: userId, ...payload }]);
      }

      router.push(`/profile/${userId}`);
    } catch (err: any) {
      console.error("Onboarding.save error", err);
      setMessage(String(err.message || err));
    } finally {
      setSaving(false);
    }
  };

  /* =====================================
    RENDER
  ===================================== */

  if (loading) return <div className="p-6 text-center">Загрузка...</div>;
  if (alreadyOnboarded) return <div className="p-6">Перенаправление...</div>;

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl mx-auto p-6 bg-white shadow rounded-lg space-y-4 mt-8"
    >
      <h2 className="text-2xl font-bold text-center mb-4">Заполнение профиля</h2>

      <label className="block">
        <div className="text-sm mb-1 font-medium">Ваш ник</div>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        />
        {errors.username && <p className="text-red-600 text-sm mt-1">{errors.username}</p>}
      </label>

      <label className="block">
        <div className="text-sm mb-1 font-medium">Аватар</div>
        <input type="file" accept="image/*" onChange={handleAvatarChange} />
        {avatarPreview && (
          <img
            src={avatarPreview}
            alt="preview"
            className="w-24 h-24 rounded-full mt-2 object-cover border"
          />
        )}
        {errors.avatar && <p className="text-red-600 text-sm mt-1">{errors.avatar}</p>}
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={useStorage}
          onChange={(e) => setUseStorage(e.target.checked)}
        />
        <span>Загружать аватар в Supabase Storage</span>
      </label>

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-emerald-600 text-white py-2 rounded hover:bg-emerald-700 transition"
      >
        {saving ? "Сохранение..." : "Сохранить профиль"}
      </button>

      {message && <div className="text-red-600 text-center text-sm">{message}</div>}
    </form>
  );
}
