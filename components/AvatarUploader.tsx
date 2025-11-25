"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

interface AvatarUploaderProps {
  userId?: string | null; // передаем currentUser.id (optional)
}

// This component no longer uses Supabase Storage.
// It converts the selected image to a Base64 data URL and saves it
// directly into `profiles.avatar_url` for the current user.
export default function AvatarUploader({ userId }: AvatarUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    // if userId is provided, fetch current avatar_url to display
    let mounted = true;
    const fetchAvatar = async () => {
      if (!userId) return;
      try {
        const { data: profile, error } = await supabase.from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
        if (!mounted) return;
        if (error) {
          console.error("AvatarUploader: fetch profile error", error);
        } else if (profile?.avatar_url) {
          setAvatarUrl(profile.avatar_url as string);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchAvatar();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(null);
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setAvatarUrl(url);
    }
  };

  const readFileAsDataURL = (file: File, onProgress?: (loaded: number, total: number) => void) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(e.loaded, e.total);
      };
      reader.onerror = () => reject(new Error("Ошибка чтения файла"));
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") resolve(result);
        else reject(new Error("Не удалось прочитать файл как строку."));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async () => {
    setMessage(null);
    if (!userId) return setMessage("Вы не авторизованы.");
    if (!file) return setMessage("Выберите файл");

    setUploading(true);
    setProgress(0);

    try {
      const dataUrl = await readFileAsDataURL(file, (loaded, total) => {
        const p = total ? Math.round((loaded / total) * 100) : 0;
        setProgress(p);
      });

      const { error } = await supabase.from("profiles").update({ avatar_url: dataUrl }).eq("id", userId);
      if (error) throw error;

      setAvatarUrl(dataUrl);
      setMessage("Аватар успешно обновлён.");
      setFile(null);
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      setMessage("Ошибка при загрузке: " + (err?.message ?? String(err)));
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 800);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {avatarUrl ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : <div className="text-gray-500">Нет</div>}
        </div>
        <div className="flex-1">
          <input type="file" onChange={handleFileChange} accept="image/*" className="block" />
          <div className="flex items-center gap-2 mt-2">
            <button onClick={handleUpload} disabled={uploading || !file} className="px-4 py-2 bg-emerald-600 text-white rounded disabled:opacity-60">
              {uploading ? "Загрузка..." : "Загрузить"}
            </button>
            <button onClick={() => { setFile(null); setAvatarUrl(null); setMessage(null); }} className="px-3 py-2 border rounded text-sm">Отмена</button>
          </div>
          <div className="mt-3 w-full">
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
              <div className="h-2 bg-emerald-500" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
            </div>
            {message && <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">{message}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
