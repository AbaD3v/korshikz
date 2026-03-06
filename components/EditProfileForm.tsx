import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
// Если у тебя в проекте другой путь, подставь свой клиент.
// Например у тебя раньше был такой путь:
// import { supabase } from "@/hooks/utils/supabase/client";

interface Profile {
  id: string;
  full_name: string | null;
  age: number | null;
  university: string | null;
  hobbies: string | null;
  bio: string | null;
  pets: boolean | null;
  smoking: boolean | null;
  avatar_url: string | null;
}

interface EditProfileFormProps {
  profile: Profile;
  onSave: (data: Profile) => void;
  onCancel: () => void;
}

interface FormState {
  full_name: string;
  age: string;
  university: string;
  hobbies: string;
  bio: string;
  pets: boolean;
  smoking: boolean;
}

interface FormErrors {
  full_name?: string;
  age?: string;
  university?: string;
  bio?: string;
  avatar?: string;
  general?: string;
}

export default function EditProfileForm({
  profile,
  onSave,
  onCancel,
}: EditProfileFormProps) {
  const initialForm: FormState = useMemo(
    () => ({
      full_name: profile.full_name ?? "",
      age: profile.age ? String(profile.age) : "",
      university: profile.university ?? "",
      hobbies: profile.hobbies ?? "",
      bio: profile.bio ?? "",
      pets: Boolean(profile.pets),
      smoking: Boolean(profile.smoking),
    }),
    [profile]
  );

  const [form, setForm] = useState<FormState>(initialForm);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    profile.avatar_url ?? null
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    setForm(initialForm);
    setAvatarPreview(profile.avatar_url ?? null);
    setAvatarFile(null);
    setErrors({});
  }, [initialForm, profile.avatar_url]);

  useEffect(() => {
    if (!avatarFile) return;

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile]);

  const isChanged = useMemo(() => {
    return (
      form.full_name !== initialForm.full_name ||
      form.age !== initialForm.age ||
      form.university !== initialForm.university ||
      form.hobbies !== initialForm.hobbies ||
      form.bio !== initialForm.bio ||
      form.pets !== initialForm.pets ||
      form.smoking !== initialForm.smoking ||
      avatarFile !== null
    );
  }, [form, initialForm, avatarFile]);

  const handleChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, general: undefined }));
  };

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};

    const trimmedName = form.full_name.trim();
    const trimmedUniversity = form.university.trim();
    const trimmedBio = form.bio.trim();

    if (!trimmedName) {
      nextErrors.full_name = "Введите имя";
    } else if (trimmedName.length < 2) {
      nextErrors.full_name = "Имя слишком короткое";
    } else if (trimmedName.length > 50) {
      nextErrors.full_name = "Имя слишком длинное";
    }

    if (form.age) {
      const ageNumber = Number(form.age);
      if (Number.isNaN(ageNumber)) {
        nextErrors.age = "Возраст должен быть числом";
      } else if (ageNumber < 16 || ageNumber > 100) {
        nextErrors.age = "Укажите возраст от 16 до 100";
      }
    }

    if (trimmedUniversity.length > 100) {
      nextErrors.university = "Слишком длинное название университета";
    }

    if (trimmedBio.length > 300) {
      nextErrors.bio = "Bio должно быть не длиннее 300 символов";
    }

    if (avatarFile) {
      const maxSizeMb = 3;
      if (!avatarFile.type.startsWith("image/")) {
        nextErrors.avatar = "Можно загружать только изображения";
      } else if (avatarFile.size > maxSizeMb * 1024 * 1024) {
        nextErrors.avatar = `Размер фото должен быть меньше ${maxSizeMb} МБ`;
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const uploadAvatar = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (!isChanged) {
      onCancel();
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      let avatar_url = profile.avatar_url ?? null;

      if (avatarFile) {
        avatar_url = await uploadAvatar(avatarFile);
      }

      const updatePayload = {
        full_name: form.full_name.trim(),
        age: form.age ? Number(form.age) : null,
        university: form.university.trim() || null,
        hobbies: form.hobbies.trim() || null,
        bio: form.bio.trim() || null,
        pets: form.pets,
        smoking: form.smoking,
        avatar_url,
      };

      const { error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", profile.id);

      if (error) {
        throw new Error(error.message);
      }

      onSave({
        ...profile,
        ...updatePayload,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Не удалось сохранить профиль";
      setErrors({ general: message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Редактирование профиля
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Обновите информацию о себе, чтобы другим было проще понять, подходите ли вы друг другу для совместной аренды.
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col gap-5 md:flex-row">
          <div className="md:w-56">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Фото профиля
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
                className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-emerald-700 dark:text-gray-300"
              />

              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                JPG, PNG, WEBP до 3 МБ
              </p>

              {errors.avatar && (
                <p className="mt-2 text-xs text-red-500">{errors.avatar}</p>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Полное имя
              </label>
              <input
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-emerald-900"
                value={form.full_name}
                onChange={(e) => handleChange("full_name", e.target.value)}
                placeholder="Например: Аружан Серик"
              />
              {errors.full_name && (
                <p className="mt-1 text-xs text-red-500">{errors.full_name}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Возраст
                </label>
                <input
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-emerald-900"
                  type="number"
                  min={16}
                  max={100}
                  value={form.age}
                  onChange={(e) => handleChange("age", e.target.value)}
                  placeholder="18"
                />
                {errors.age && (
                  <p className="mt-1 text-xs text-red-500">{errors.age}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Университет
                </label>
                <input
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-emerald-900"
                  value={form.university}
                  onChange={(e) => handleChange("university", e.target.value)}
                  placeholder="Например: NU, SDU, КазНУ"
                />
                {errors.university && (
                  <p className="mt-1 text-xs text-red-500">{errors.university}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl bg-gray-50 p-4 dark:bg-gray-950/60">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Хобби
            </label>
            <input
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:ring-emerald-900"
              value={form.hobbies}
              onChange={(e) => handleChange("hobbies", e.target.value)}
              placeholder="Спорт, книги, кино, путешествия"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              О себе
            </label>
            <textarea
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:ring-emerald-900"
              rows={4}
              maxLength={300}
              value={form.bio}
              onChange={(e) => handleChange("bio", e.target.value)}
              placeholder="Кратко расскажите о себе, привычках и какой формат соседства вам подходит"
            />
            <div className="mt-1 flex items-center justify-between">
              {errors.bio ? (
                <p className="text-xs text-red-500">{errors.bio}</p>
              ) : (
                <span className="text-xs text-gray-400">
                  До 300 символов
                </span>
              )}
              <span className="text-xs text-gray-400">
                {form.bio.length}/300
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
              <input
                type="checkbox"
                checked={form.pets}
                onChange={(e) => handleChange("pets", e.target.checked)}
                className="h-4 w-4"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Питомцы
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Есть или допустимы питомцы
                </p>
              </div>
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
              <input
                type="checkbox"
                checked={form.smoking}
                onChange={(e) => handleChange("smoking", e.target.checked)}
                className="h-4 w-4"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Курение
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Укажите, если это важно для соседей
                </p>
              </div>
            </label>
          </div>
        </div>

        {errors.general && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
            {errors.general}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saving || !isChanged}
            onClick={handleSubmit}
          >
            {saving ? "Сохранение..." : "Сохранить изменения"}
          </button>

          <button
            type="button"
            className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            disabled={saving}
            onClick={onCancel}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}