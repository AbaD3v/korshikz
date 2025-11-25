"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { sanitizeFileName } from "../lib/sanitizeFileName";

export default function OnboardingPage(): JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileExists, setProfileExists] = useState<boolean | null>(null);

  // form state
  const [username, setUsername] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [useStorage, setUseStorage] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const MAX_FILE_SIZE = 1024 * 1024 * 2; // 2 MB

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: ud } = await supabase.auth.getUser();
        const user = (ud as any)?.user ?? null;
        if (!mounted) return;
        if (!user) {
          setMessage("Пожалуйста, войдите, чтобы пройти онбординг.");
          setLoading(false);
          return;
        }
        setUserId(user.id);

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, isOnboarded")
          .eq("id", user.id)
          .maybeSingle();

        console.log("Onboarding.init: profile fetch result", profile, error);

        if (profile) {
          if (profile.isOnboarded) {
            router.push(`/profile/${user.id}`);
            return;
          }
          setProfileExists(true);
          setUsername(profile.username ?? "");
          setAvatarPreview(profile.avatar_url ?? null);
        } else setProfileExists(false);
      } catch (err) {
        console.error("Onboarding.init error", err);
        setMessage("Ошибка при загрузке");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

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
    if (f.size > MAX_FILE_SIZE) return setErrors((p) => ({ ...p, avatar: "Файл слишком большой (макс ~2MB)" }));
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const uploadAvatarToStorage = async (file: File, uid: string) => {
    try {
      const safe = sanitizeFileName(file.name || `avatar-${Date.now()}`);
      const path = `${uid}/${Date.now()}-${safe}`;
      const bucket = "avatars";
      console.log("Onboarding: uploading avatar to storage", path);
      const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = (publicData as any)?.publicUrl ?? null;
      return publicUrl;
    } catch (err) {
      console.error("Avatar storage upload error", err);
      throw err;
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setMessage(null);
    setErrors({});
    if (!userId) return setMessage("Вы не авторизованы");
    setSaving(true);

    try {
      let avatar_url: string | null = avatarPreview ?? null;

      if (avatarFile) {
        if (useStorage) {
          avatar_url = await uploadAvatarToStorage(avatarFile, userId);
        } else {
          avatar_url = await readFileAsDataURL(avatarFile);
        }
      }

      const payload: any = { username: username || null, avatar_url: avatar_url ?? null, isOnboarded: true };

      console.log("Onboarding.submit: payload=", payload, "userId=", userId, "profileExists=", profileExists);

      const { data: ud, error: uerr } = await supabase.auth.getUser();
      const currentUser = (ud as any)?.user ?? null;
      if (uerr || !currentUser) throw new Error("Неавторизован");
      if (currentUser.id !== userId) throw new Error("Auth mismatch");

      if (profileExists) {
        const { data, error } = await supabase.from("profiles").update(payload).eq("id", userId).select().maybeSingle();
        console.log("Onboarding.submit: update result", data, error);
        if (error) throw error;
      } else {
        const row = { id: userId, ...payload };
        const { data, error } = await supabase.from("profiles").insert([row]).select().maybeSingle();
        console.log("Onboarding.submit: insert result", data, error);
        if (error) throw error;
      }

      router.push(`/profile/${userId}`);
    } catch (err: any) {
      console.error("Onboarding.save error", err);
      setMessage(String(err?.message ?? err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Загрузка...</div>;

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto p-6">
      <h2 className="text-xl font-semibold mb-4">Онбординг</h2>

      <label className="block mb-3">
        <div className="text-sm mb-1">Ник</div>
        <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-3 py-2 border rounded" />
      </label>

      <label className="block mb-3">
        <div className="text-sm mb-1">Аватар</div>
        <input type="file" accept="image/*" onChange={handleAvatarChange} />
        {avatarPreview && <img src={avatarPreview} alt="preview" className="w-24 h-24 rounded mt-2 object-cover" />}
      </label>

      <label className="block mb-3 inline-flex items-center gap-2">
        <input type="checkbox" checked={useStorage} onChange={(e) => setUseStorage(e.target.checked)} />
        <span className="text-sm">Загружать аватар в Supabase Storage (рекомендуется для больших изображений)</span>
      </label>

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 text-white rounded">
          {saving ? "Сохранение..." : "Сохранить"}
        </button>
        <button type="button" onClick={() => router.push("/")} className="px-3 py-2 border rounded">Пропустить</button>
      </div>

      {message && <div className="mt-3 text-sm text-red-600">{message}</div>}
    </form>
  );
}
