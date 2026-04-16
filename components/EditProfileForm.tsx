// src/components/EditProfileForm.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  useLocationOptions,
} from "@/hooks/useLocationOptions";
import { normalizeProfileLocation } from "@/lib/normalizeProfileLocation";

interface Profile {
  id: string;
  full_name: string | null;
  age: number | null;
  city_id: string | null;
  university_id: string | null;
  hobbies: string | null;
  about_me: string | null;
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
  city_id: string;
  university_id: string;
  hobbies: string;
  about_me: string;
  pets: boolean;
  smoking: boolean;
}

interface FormErrors {
  full_name?: string;
  age?: string;
  city_id?: string;
  university_id?: string;
  about_me?: string;
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
      city_id: profile.city_id ?? "",
      university_id: profile.university_id ?? "",
      hobbies: profile.hobbies ?? "",
      about_me: profile.about_me ?? "",
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

  const {
    cities,
    universities,
    loading: loadingOptions,
    error: locationOptionsError,
  } = useLocationOptions();

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

  useEffect(() => {
    if (!locationOptionsError) return;

    setErrors((prev) => ({
      ...prev,
      general: locationOptionsError,
    }));
  }, [locationOptionsError]);

  const filteredUniversities = useMemo(() => {
    if (!form.city_id) return universities;
    return universities.filter((u) => u.city_id === form.city_id);
  }, [universities, form.city_id]);

  const selectedCity = useMemo(
    () => cities.find((city) => city.id === form.city_id) ?? null,
    [cities, form.city_id]
  );

  const selectedUniversity = useMemo(
    () => universities.find((u) => u.id === form.university_id) ?? null,
    [universities, form.university_id]
  );

  const isChanged = useMemo(() => {
    return (
      form.full_name !== initialForm.full_name ||
      form.age !== initialForm.age ||
      form.city_id !== initialForm.city_id ||
      form.university_id !== initialForm.university_id ||
      form.hobbies !== initialForm.hobbies ||
      form.about_me !== initialForm.about_me ||
      form.pets !== initialForm.pets ||
      form.smoking !== initialForm.smoking ||
      avatarFile !== null
    );
  }, [form, initialForm, avatarFile]);

  const handleChange = <K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, general: undefined }));
  };

  const handleCityChange = (cityId: string) => {
    setForm((prev) => {
      const stillValidUniversity = universities.some(
        (u) => u.id === prev.university_id && u.city_id === cityId
      );

      return {
        ...prev,
        city_id: cityId,
        university_id: stillValidUniversity ? prev.university_id : "",
      };
    });

    setErrors((prev) => ({
      ...prev,
      city_id: undefined,
      university_id: undefined,
      general: undefined,
    }));
  };

  const handleUniversityChange = (universityId: string) => {
    const selected = universities.find((u) => u.id === universityId);

    setForm((prev) => ({
      ...prev,
      university_id: universityId,
      city_id: selected?.city_id ?? prev.city_id ?? "",
    }));

    setErrors((prev) => ({
      ...prev,
      university_id: undefined,
      city_id: undefined,
      general: undefined,
    }));
  };

  const validateForm = () => {
    const nextErrors: FormErrors = {};

    const trimmedName = form.full_name.trim();
    const trimmedAboutMe = form.about_me.trim();

    if (!trimmedName) {
      nextErrors.full_name = "Введите имя";
    } else if (trimmedName.length < 2) {
      nextErrors.full_name = "Имя слишком короткое";
    }

    if (form.age) {
      const ageNumber = Number(form.age);
      if (Number.isNaN(ageNumber)) {
        nextErrors.age = "Возраст должен быть числом";
      } else if (ageNumber < 16 || ageNumber > 100) {
        nextErrors.age = "Возраст должен быть от 16 до 100";
      }
    }

    if (!form.city_id) {
      nextErrors.city_id = "Выберите город";
    }

    if (!form.university_id) {
      nextErrors.university_id = "Выберите университет";
    }

    if (trimmedAboutMe.length > 300) {
      nextErrors.about_me = "О себе должно быть не длиннее 300 символов";
    }

    if (avatarFile) {
      const maxSizeMb = 3;
      if (!avatarFile.type.startsWith("image/")) {
        nextErrors.avatar = "Можно загружать только изображения";
      } else if (avatarFile.size > maxSizeMb * 1024 * 1024) {
        nextErrors.avatar = `Размер фото должен быть меньше ${maxSizeMb} МБ`;
      }
    }

    if (form.university_id) {
      const selected = universities.find((u) => u.id === form.university_id);

      if (!selected) {
        nextErrors.university_id = "Выбранный университет не найден";
      } else if (form.city_id && selected.city_id !== form.city_id) {
        nextErrors.university_id =
          "Университет не относится к выбранному городу";
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

    setSaving(true);
    setErrors({});

    try {
      let avatar_url = profile.avatar_url ?? null;

      if (avatarFile) {
        avatar_url = await uploadAvatar(avatarFile);
      }

      const normalizedLocation = await normalizeProfileLocation({
        cityId: form.city_id,
        universityId: form.university_id,
      });

      const updatePayload = {
        full_name: form.full_name.trim() || null,
        age: form.age ? Number(form.age) : null,
        city_id: normalizedLocation.city_id,
        university_id: normalizedLocation.university_id,
        hobbies: form.hobbies.trim() || null,
        about_me: form.about_me.trim() || null,
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
      setErrors({
        general:
          err instanceof Error ? err.message : "Не удалось сохранить профиль",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Редактировать профиль
        </h2>
      </div>

      <div className="space-y-6">
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
                <select
                  className="w-full rounded-xl border px-3 py-2"
                  value={form.city_id}
                  onChange={(e) => handleCityChange(e.target.value)}
                  disabled={loadingOptions}
                >
                  <option value="">
                    {loadingOptions ? "Загрузка..." : "Выберите город"}
                  </option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
                {errors.city_id && (
                  <p className="mt-1 text-xs text-red-500">{errors.city_id}</p>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Университет
              </label>
              <select
                className="w-full rounded-xl border px-3 py-2"
                value={form.university_id}
                onChange={(e) => handleUniversityChange(e.target.value)}
                disabled={loadingOptions || !form.city_id}
              >
                <option value="">
                  {loadingOptions
                    ? "Загрузка..."
                    : form.city_id
                    ? "Выберите университет"
                    : "Сначала выберите город"}
                </option>
                {filteredUniversities.map((university) => (
                  <option key={university.id} value={university.id}>
                    {university.name}
                  </option>
                ))}
              </select>
              {errors.university_id && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.university_id}
                </p>
              )}
              {selectedCity && selectedUniversity && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Университет относится к городу: {selectedCity.name}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Хобби</label>
            <input
              className="w-full rounded-xl border px-3 py-2"
              value={form.hobbies}
              onChange={(e) => handleChange("hobbies", e.target.value)}
            />
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

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.pets}
              onChange={(e) => handleChange("pets", e.target.checked)}
            />
            Питомцы
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.smoking}
              onChange={(e) => handleChange("smoking", e.target.checked)}
            />
            Курение
          </label>
        </div>

        {errors.general && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {errors.general}
          </div>
        )}

        <div className="flex gap-3">
          <button
            className="rounded-xl bg-emerald-600 px-4 py-2 text-white disabled:opacity-60"
            disabled={saving || !isChanged || loadingOptions}
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
    </div>
  );
}

