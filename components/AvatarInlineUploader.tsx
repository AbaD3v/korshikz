"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AvatarInlineUploader() {
  const [userId, setUserId] = useState<string | null>(null);
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // fetch current authenticated user and profile
    let mounted = true;
    const init = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user ?? null;
        if (!mounted) return;
        if (!user) {
          setUserId(null);
          setMessage("Пожалуйста, войдите, чтобы изменить аватар.");
          return;
        }
        setUserId(user.id);

        // fetch profile avatar_url
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("AvatarInlineUploader: profile fetch error", error);
        } else if (profile?.avatar_url) {
          setCurrentAvatar(profile.avatar_url as string);
        }
      } catch (err) {
        console.error("AvatarInlineUploader init error:", err);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(null);
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    setMessage(null);
    if (!userId) {
      setMessage("Вы не авторизованы.");
      return;
    }
    if (!file) {
      setMessage("Выберите файл для загрузки.");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // convert file to base64 Data URL with progress
      const dataUrl = await readFileAsDataURL(file, (loaded, total) => {
        const p = total ? Math.round((loaded / total) * 100) : 0;
        setProgress(p);
      });

      // update profiles.avatar_url for current user
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: dataUrl })
        .eq("id", userId);

      if (error) {
        console.error("AvatarInlineUploader: update error", error);
        setMessage("Ошибка обновления профиля: " + (error.message ?? String(error)));
      } else {
        setCurrentAvatar(dataUrl);
        setMessage("Аватар успешно обновлён.");
        setFile(null);
        setPreview(null);
        setProgress(100);
      }
    } catch (err: any) {
      console.error("AvatarInlineUploader upload error:", err);
      setMessage("Ошибка при загрузке: " + (err?.message ?? String(err)));
    } finally {
      setUploading(false);
      // reset progress after short delay
      setTimeout(() => setProgress(0), 800);
    }
  };

  return (
    <div className="max-w-md w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg p-4 shadow-sm">
      <h3 className="text-lg font-medium mb-3">Аватар</h3>

      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          {currentAvatar ? (
            // show current avatar (can be data URL or external URL)
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentAvatar} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="text-gray-500">Нет</div>
          )}
        </div>

        <div className="flex-1">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block mb-2"
            aria-label="Выберите изображение для аватара"
          />

          {preview && (
            <div className="mb-2">
              <div className="text-sm text-gray-600 mb-1">Превью:</div>
              <div className="w-28 h-28 rounded-md overflow-hidden border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="preview" className="w-full h-full object-cover" />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="px-4 py-2 bg-emerald-600 text-white rounded disabled:opacity-60"
            >
              {uploading ? "Загрузка..." : "Загрузить"}
            </button>

            <button
              onClick={() => {
                setFile(null);
                setPreview(null);
                setMessage(null);
              }}
              className="px-3 py-2 border rounded text-sm"
            >
              Отмена
            </button>
          </div>

          <div className="mt-3">
            <ProgressBar value={progress} />
            {message && <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">{message}</div>}
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-500">Загрузка сохраняет изображение в поле `profiles.avatar_url` как Data URL (Base64).</div>
    </div>
  );
}

// Helper: read file as Data URL with progress callback
function readFileAsDataURL(file: File, onProgress?: (loaded: number, total: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded, e.total);
    };

    reader.onerror = (e) => {
      reject(new Error("Ошибка чтения файла"));
    };

    reader.onload = () => {
      const result = reader.result as string | ArrayBuffer | null;
      if (typeof result === "string") resolve(result);
      else reject(new Error("Не удалось прочитать файл как строку."));
    };

    reader.readAsDataURL(file);
  });
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
      <div
        className="h-2 bg-emerald-500 transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
