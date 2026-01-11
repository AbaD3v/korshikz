"use client";

import { useState } from "react";
import Image from "next/image";
import { supabase } from "@/hooks/utils/supabase/client";
import { Camera, Loader2, User } from "lucide-react";

interface AvatarUploaderProps {
  userId: string;
  initialUrl?: string | null;
}

export default function AvatarUploader({ userId, initialUrl }: AvatarUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(initialUrl || null);

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      const file = event.target.files?.[0];
      if (!file) return;

      // Ограничение размера (например, 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert("Файл слишком большой. Максимум 2MB");
        return;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`; // Случайное имя для избежания кэша на сервере
      const filePath = `avatars/${fileName}`;

      // 1. Загрузка в Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Получаем Public URL
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      // 3. Обновляем профиль в БД
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateError) throw updateError;

      // 4. Обновляем локальный стейт с таймстампом против кэша
      setAvatarUrl(`${publicUrl}?t=${new Date().getTime()}`);
      
    } catch (error: any) {
      alert("Ошибка при загрузке аватара");
      console.error("Error:", error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative group w-full h-full">
      {/* Кнопка загрузки в виде оверлея */}
      <label className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
        {uploading ? (
          <Loader2 className="text-white animate-spin" size={24} />
        ) : (
          <Camera className="text-white" size={24} />
        )}
        <input 
          type="file" 
          accept="image/*" 
          onChange={uploadAvatar} 
          className="hidden" 
          disabled={uploading}
        />
      </label>

      {/* Отображение аватара */}
      <div className="w-full h-full relative bg-neutral-100 dark:bg-neutral-800">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt="User Avatar"
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-400">
            <User size={40} />
          </div>
        )}
      </div>

      {/* Индикатор загрузки для маленьких экранов */}
      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 z-20">
          <Loader2 className="animate-spin text-indigo-600" size={24} />
        </div>
      )}
    </div>
  );
}