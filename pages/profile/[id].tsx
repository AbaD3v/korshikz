// pages/profile/[id].tsx
import React, { useEffect, useState } from "react";
import { GetServerSideProps } from "next";
import { createClient } from "@supabase/supabase-js";

import UserProfile from "../../components/UserProfile";
import UserListings from "../../components/UserListings";
import EditProfileForm from "../../components/EditProfileForm";
import Link from "next/link";

const createSupabase = (url?: string, key?: string) => {
  if (!url || !key) return null;
  return createClient(url, key);
};

type ProfilePublicData = {
  id: string;
  full_name?: string | null;
  email?: string | null; // not shown publicly, kept for isOwner checks if needed
  avatar_url?: string | null;

  // minimal personal
  birthday?: string | null;
  city?: string | null;

  // study
  university?: string | null;
  faculty?: string | null;
  course?: number | null;
  study_type?: string | null;
  is_student?: boolean | null;

  // housing / budget
  budget_min?: number | null;
  budget_max?: number | null;
  preferred_location?: string | null;
  need_furnished?: boolean | null;
  room_type?: string | null;

  // lifestyle
  wake_time?: string | null;
  sleep_time?: string | null;
  cleanliness_level?: number | null;
  noise_tolerance?: number | null;
  introvert_extrovert?: string | null;
  lifestyle?: string | null;

  // habits
  smoking?: boolean | null;
  pets?: boolean | null;
  hobbies?: string | null;
  bio?: string | null;

  // roommate prefs
  preferred_gender?: string | null;
  preferred_age_min?: number | null;
  preferred_age_max?: number | null;
  preferred_pets?: boolean | null;
  preferred_smoking?: boolean | null;

  // any other public fields you want
};

type Listing = { id: string | number; title?: string; [k: string]: any };

type Props = {
  initialProfile: ProfilePublicData | null;
  initialListings: Listing[];
  isOwner: boolean;
};

export default function ProfilePage({ initialProfile, initialListings, isOwner }: Props) {
  const [profile, setProfile] = useState<ProfilePublicData | null>(initialProfile);
  const [listings] = useState<Listing[]>(initialListings);
  const [editing, setEditing] = useState(false);

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-semibold">Профиль не найден</h2>
      </div>
    );
  }

const handleProfileUpdated = (updates: Partial<ProfilePublicData>) => {
  setProfile((prev) => {
    if (!prev) return prev; // ничего не делаем
    return {
      ...prev,
      ...updates,
    } as ProfilePublicData;
  });
  setEditing(false);
};
// внутри JSX
<Link href={`/chat/${profile.id}`}>
  <button
    style={{
      marginTop: 15,
      padding: "10px 15px",
      background: "#4CAF50",
      color: "#fff",
      borderRadius: 10,
      border: "none",
    }}
  >
    Написать
  </button>
</Link>

  return (
    
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {!editing ? (
        <UserProfile
          profile={profile}
          listings={listings}
          isOwner={isOwner}
          onProfileUpdated={() => setEditing(true)}
        />
      ) : (
        <EditProfileForm profile={profile} onSave={handleProfileUpdated} onCancel={() => setEditing(false)} />
      )}

      <UserListings listings={listings} />
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const id = context.params?.id;
  if (!id || Array.isArray(id)) {
    return { props: { initialProfile: null, initialListings: [], isOwner: false } };
  }

  const supabaseServer = createSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseServer) {
    return { props: { initialProfile: null, initialListings: [], isOwner: false } };
  }

  // Select all public/useful fields for roommate decisions
  const selectFields = `
    id,
    full_name,
    email,
    avatar_url,
    birthday,
    city,
    university,
    faculty,
    course,
    study_type,
    is_student,
    budget_min,
    budget_max,
    preferred_location,
    need_furnished,
    room_type,
    wake_time,
    sleep_time,
    cleanliness_level,
    noise_tolerance,
    introvert_extrovert,
    lifestyle,
    smoking,
    pets,
    hobbies,
    bio,
    preferred_gender,
    preferred_age_min,
    preferred_age_max,
    preferred_pets,
    preferred_smoking,
    about_me
  `;

  const { data: profile, error: pErr } = await supabaseServer.from("profiles").select(selectFields).eq("id", id).maybeSingle();
  if (pErr) console.error("Profile fetch error:", pErr);

  const { data: listings, error: lErr } = await supabaseServer
    .from("listings")
    .select("*")
    .eq("user_id", id)
    .order("id", { ascending: false });
  if (lErr) console.error("Listings fetch error:", lErr);

  // Check ownership using Server supabase (service key has access to auth.users)
  let isOwner = false;
  try {
    const authHeader = context.req.headers.cookie ?? "";
    // Best-effort: Try to read session via supabaseServer (server-side, limited)
    // If you have server access to session cookie parsing, you can improve this.
    // For now, we rely on client-side check too; but return false safely.
    isOwner = false;
  } catch (err) {
    isOwner = false;
  }

  return {
    props: {
      initialProfile: profile ?? null,
      initialListings: listings ?? [],
      isOwner,
    },
  };
};
