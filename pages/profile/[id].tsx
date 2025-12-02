import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { createClient } from '@supabase/supabase-js';

const createSupabase = (url?: string | undefined, key?: string | undefined) => {
  if (!url || !key) return null;
  return createClient(url, key);
};
const supabase = createSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

import ListingCard from "../../components/ListingCard";
// Optional: AvatarUploader component can be used for client-side avatar uploads
// import AvatarUploader from "../../components/AvatarUploader";
// Optional: Onboarding form (shows if user needs to finish profile)
// import OnboardingForm from "../../components/OnboardingForm";
// helper to convert File -> Data URL (Base64)
function readFileAsDataURL(file: File, onProgress?: (loaded: number, total: number) => void) {
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
}
import { GetServerSideProps } from "next";

type Profile = {
  id: string;
  username: string;
  email?: string | null;
  avatar_url?: string | null;
};

type Listing = {
  id: number | string;
  title?: string;
  description?: string;
  price?: number;
  image_urls?: string[];
  images?: string[];
  user_id?: string;
};

type Props = {
  initialProfile: Profile | null;
  initialListings: Listing[];
};

export default function ProfilePage({ initialProfile, initialListings }: Props) {
  const router = useRouter();
  const { id } = router.query;

  const [profile, setProfile] = useState<Profile | null>(initialProfile ?? null);
  const [listings, setListings] = useState<Listing[]>(initialListings ?? []);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // keep initial server-side data, but still check current user for ownership state
    let mounted = true;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const client = createSupabase(url, key);

    const checkOwner = async () => {
      if (!client) {
        console.warn("Supabase client not available on client — skipping ownership check");
        if (!mounted) return;
        setIsOwner(false);
        setUsername(profile?.username ?? "");
        setLoading(false);
        return;
      }
      const { data: userData } = await client.auth.getUser();
      const currentUser = userData?.user ?? null;
      if (!mounted) return;
      setIsOwner(!!(currentUser && profile && currentUser.id === profile.id));
      setUsername(profile?.username ?? "");
      setLoading(false);
    };
    checkOwner();
    return () => {
      mounted = false;
    };
  }, [profile]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setAvatarFile(f);
  };

  const handleSave = async () => {
    if (!isOwner) return;
    setSaving(true);
    try {
      if (!profile) throw new Error("Профиль отсутствует");
      let avatar_url = profile.avatar_url ?? null;

      if (avatarFile) {
        // get current authenticated user session and ensure ownership
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        const currentUser = userData?.user ?? null;
        console.log("handleSave: currentUser from supabase.auth.getUser():", currentUser, "error:", userErr);
        if (userErr || !currentUser) throw new Error("Не удалось получить текущую сессию пользователя.");
        if (currentUser.id !== profile.id) throw new Error("Вы не можете изменить аватар другого пользователя.");

        // Convert the chosen file to a Base64 data URL and store it directly in profiles.avatar_url
        const dataUrl = await readFileAsDataURL(avatarFile, () => {});
        avatar_url = dataUrl;
      }

      const updates: Partial<Profile> = { username };
      if (avatar_url) updates.avatar_url = avatar_url;

      const { error: updErr } = await supabase.from("profiles").update(updates).eq("id", profile.id);
      if (updErr) throw updErr;

      setProfile((p) => {
        const newProfile: Profile = {
          ...(p ?? ({} as Profile)),
          username,
          avatar_url,
        };
        return newProfile;
      });
      setAvatarFile(null);
      setEditing(false);
    } catch (err: any) {
      console.error("Save error:", err.message || err);
      alert("Ошибка при сохранении профиля: " + (err?.message ?? String(err)));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="animate-pulse flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1 space-y-3">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-2xl h-56" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-semibold">Профиль не найден</h2>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative">
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt={profile.username || "avatar"} width={96} height={96} className="rounded-full object-cover" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xl text-gray-500">{(profile.username || "?")[0]}</div>
          )}

          {isOwner && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 bg-white dark:bg-gray-900 p-2 rounded-full shadow-md border"
              aria-label="Изменить аватар"
            >
              ✎
            </button>
          )}
          {/* Hidden file input always mounted so button has a target even when edit form is collapsed */}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
        </div>

        <div className="flex-1 w-full">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{profile.username}</h1>
              <div className="text-sm text-gray-500">{profile.email}</div>
            </div>

            {isOwner ? (
              <div className="flex gap-2">
                <button onClick={() => setEditing((v) => !v)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg">{editing ? 'Отмена' : 'Редактировать профиль'}</button>
              </div>
            ) : null}
          </div>

          {editing && (
            <div className="mt-4 bg-white dark:bg-gray-900 border rounded-lg p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Имя</label>
                  <input value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Аватар</label>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="mt-1" />
                  {avatarFile && <div className="text-sm mt-2">Выбрано: {avatarFile.name}</div>}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-emerald-600 text-white rounded-md">{saving ? 'Сохранение...' : 'Сохранить'}</button>
                <button onClick={() => setEditing(false)} className="px-4 py-2 border rounded-md">Отмена</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <hr className="my-8" />

      <section>
        <h2 className="text-xl font-semibold mb-4">Объявления</h2>

        {listings.length === 0 ? (
          <div className="text-gray-500">У пользователя нет объявлений.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((l) => (
              <div key={l.id} onClick={() => router.push(`/listings/${l.id}`)}>
                <ListingCard listing={l} onClick={() => router.push(`/listings/${l.id}`)} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params ?? {};

  // Проверка параметра
  if (!id || Array.isArray(id)) {
    return { props: { initialProfile: null, initialListings: [] } };
  }

  // Серверный Supabase клиент с Service Role Key
  const supabaseServer = createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (!supabaseServer) {
    console.warn("Supabase server client not configured. Returning empty props.");
    return { props: { initialProfile: null, initialListings: [] } };
  }

  try {
    // Профиль пользователя
    const { data: profileData, error: pErr } = await supabaseServer
      .from("profiles")
      .select("id, username, email, avatar_url, isOnboarded")
      .eq("id", id)
      .maybeSingle();

    if (pErr) console.error("Profile fetch error:", pErr);

    // Объявления пользователя
    const { data: listingsData, error: lErr } = await supabaseServer
      .from("listings")
      .select("*")
      .eq("user_id", id)
      .order("id", { ascending: false });

    if (lErr) console.error("Listings fetch error:", lErr);

    return {
      props: {
        initialProfile: profileData ?? null,
        initialListings: listingsData ?? [],
      },
    };
  } catch (err) {
    console.error("SSR Supabase error:", err);
    return { props: { initialProfile: null, initialListings: [] } };
  }
};
