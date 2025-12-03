import React, { useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

interface EditProfileFormProps {
  profile: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}

export default function EditProfileForm({ profile, onSave, onCancel }: EditProfileFormProps) {
  const [form, setForm] = useState({
    full_name: profile.full_name || "",
    age: profile.age || "",
    university: profile.university || "",
    hobbies: profile.hobbies || "",
    bio: profile.bio || "",
    pets: profile.pets || false,
    smoking: profile.smoking || false,
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setSaving(true);

    let avatar_url = profile.avatar_url || null;

    if (avatarFile) {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(avatarFile);
      });
      avatar_url = base64;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ ...form, avatar_url })
      .eq("id", profile.id);

    if (error) {
      alert("Ошибка: " + error.message);
    } else {
      onSave({ ...profile, ...form, avatar_url });
    }

    setSaving(false);
  };

  return (
    <div className="bg-white dark:bg-gray-900 p-4 border rounded-lg space-y-4">
      <div className="flex gap-4">
        <div>
          <label className="text-sm font-medium">Аватар</label>
          <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
        </div>

        <div className="flex-1 space-y-2">
          <label className="block text-sm font-medium">Полное имя</label>
          <input
            className="w-full border p-2 rounded"
            value={form.full_name}
            onChange={(e) => handleChange("full_name", e.target.value)}
          />

          <label className="block text-sm font-medium">Возраст</label>
          <input
            className="w-full border p-2 rounded"
            type="number"
            value={form.age}
            onChange={(e) => handleChange("age", e.target.value)}
          />

          <label className="block text-sm font-medium">Университет</label>
          <input
            className="w-full border p-2 rounded"
            value={form.university}
            onChange={(e) => handleChange("university", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Хобби</label>
        <input
          className="w-full border p-2 rounded"
          value={form.hobbies}
          onChange={(e) => handleChange("hobbies", e.target.value)}
        />

        <label className="block text-sm font-medium">Bio</label>
        <textarea
          className="w-full border p-2 rounded"
          rows={3}
          value={form.bio}
          onChange={(e) => handleChange("bio", e.target.value)}
        />

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.pets} onChange={(e) => handleChange("pets", e.target.checked)} />
          Питомцы
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.smoking} onChange={(e) => handleChange("smoking", e.target.checked)} />
          Курение
        </label>
      </div>

      <div className="flex gap-3">
        <button
          className="px-4 py-2 bg-emerald-600 text-white rounded-md"
          disabled={saving}
          onClick={handleSubmit}
        >
          {saving ? "Сохранение..." : "Сохранить"}
        </button>

        <button className="px-4 py-2 border rounded-md" onClick={onCancel}>
          Отмена
        </button>
      </div>
    </div>
  );
}
