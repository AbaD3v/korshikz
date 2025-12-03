"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

interface AvatarUploaderProps {
  userId: string;
  initialUrl?: string | null;
}

export default function AvatarUploader({ userId, initialUrl }: AvatarUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(initialUrl || null);

  const uploadAvatar = async (event: any) => {
    try {
      setUploading(true);

      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // upload
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // get public url
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      // save into database
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateError) throw updateError;

      // update local state
      setAvatarUrl(publicUrl);
    } catch (error) {
      console.log("Error uploading avatar:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl || "/default-avatar.png"}
          alt="avatar"
          className="w-full h-full object-cover"
        />
      </div>

      <label className="cursor-pointer px-3 py-2 bg-emerald-600 text-white rounded">
        {uploading ? "Загрузка…" : "Выбрать фото"}
        <input type="file" accept="image/*" onChange={uploadAvatar} className="hidden" />
      </label>
    </div>
  );
}
