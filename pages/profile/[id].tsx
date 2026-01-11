"use client";

import React, { useEffect, useState } from "react";
import { GetServerSideProps } from "next";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { MessageSquare, UserCircle, Settings, ArrowLeft, Share2 } from "lucide-react";

import UserProfile from "../../components/UserProfile";
import UserListings from "../../components/UserListings";
import EditProfileForm from "../../components/EditProfileForm";

/* --- Типы данных --- */
export type ProfilePublicData = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  birthday?: string | null;
  city?: string | null;
  university?: string | null;
  faculty?: string | null;
  course?: number | null;
  study_type?: string | null;
  is_student?: boolean | null;
  budget_min?: number | null;
  budget_max?: number | null;
  preferred_location?: string | null;
  need_furnished?: boolean | null;
  room_type?: string | null;
  wake_time?: string | null;
  sleep_time?: string | null;
  cleanliness_level?: number | null;
  noise_tolerance?: number | null;
  introvert_extrovert?: string | null;
  lifestyle?: string | null;
  smoking?: boolean | null;
  pets?: boolean | null;
  hobbies?: string | null;
  bio?: string | null;
  preferred_gender?: string | null;
  preferred_age_min?: number | null;
  preferred_age_max?: number | null;
  preferred_pets?: boolean | null;
  preferred_smoking?: boolean | null;
  about_me?: string | null;
};

export type Listing = { 
  id: string | number; 
  title?: string; 
  [k: string]: any 
};

type Props = {
  initialProfile: ProfilePublicData | null;
  initialListings: Listing[];
  isOwner: boolean;
};

const createSupabase = (url?: string, key?: string) => {
  if (!url || !key) return null;
  return createClient(url, key);
};

export default function ProfilePage({ initialProfile, initialListings, isOwner }: Props) {
  const [profile, setProfile] = useState<ProfilePublicData | null>(initialProfile);
  const [listings] = useState<Listing[]>(initialListings);
  const [editing, setEditing] = useState(false);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 transition-colors">
        <div className="text-center animate-in fade-in zoom-in duration-300 px-4">
          <UserCircle size={80} className="mx-auto text-gray-300 dark:text-gray-800 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Профиль не найден</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Возможно, ссылка устарела или профиль был удален.</p>
          <Link href="/" className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
            <ArrowLeft size={18} /> На главную
          </Link>
        </div>
      </div>
    );
  }

  const handleProfileUpdated = (updates: Partial<ProfilePublicData>) => {
    setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
    setEditing(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-500">
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-10 space-y-8">
        
        {/* Верхняя панель управления */}
        {!editing && (
          <div className="flex justify-between items-center">
            <Link href="/listings" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors flex items-center gap-2 text-sm font-medium">
              <ArrowLeft size={16} /> Назад к поиску
            </Link>
            
            <div className="flex items-center gap-2">
              <button className="p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                <Share2 size={18} />
              </button>
              
              {!isOwner ? (
                <Link href={`/chat/${profile.id}`}>
                  <button className="flex items-center gap-2 px-6 py-2.5 bg-[#22C55E] hover:bg-[#16A34A] text-white rounded-xl shadow-lg shadow-green-500/20 transition-all active:scale-95 font-bold text-sm">
                    <MessageSquare size={18} />
                    Написать
                  </button>
                </Link>
              ) : (
                <button 
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 font-bold text-sm"
                >
                  <Settings size={18} />
                  Редактировать
                </button>
              )}
            </div>
          </div>
        )}

        <main className="animate-in fade-in slide-in-from-bottom-2 duration-700">
          {!editing ? (
            <div className="space-y-10">
              {/* Обертка для UserProfile — важно передать темные классы внутрь */}
              <div className="text-gray-900 dark:text-white bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 md:p-10 shadow-2xl border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-300">
                 <UserProfile
                    profile={profile}
                    listings={listings}
                    isOwner={isOwner}
                    onProfileUpdated={() => setEditing(true)}
                  />
              </div>
              
              {/* Секция объявлений */}
              <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                   <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                    Объявления жильца
                   </h3>
                </div>
                
                <div className="rounded-[2.5rem] overflow-hidden">
                  <UserListings listings={listings} />
                </div>
              </section>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 md:p-10 shadow-2xl border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">Настройки профиля</h2>
                <button 
                  onClick={() => setEditing(false)} 
                  className="px-4 py-2 text-gray-500 hover:text-gray-800 dark:hover:text-white font-medium"
                >
                  Отмена
                </button>
              </div>
              <EditProfileForm 
                profile={profile} 
                onSave={handleProfileUpdated} 
                onCancel={() => setEditing(false)} 
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const id = context.params?.id;
  if (!id || Array.isArray(id)) {
    return { props: { initialProfile: null, initialListings: [], isOwner: false } };
  }

  const supabaseServer = createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (!supabaseServer) {
    return { props: { initialProfile: null, initialListings: [], isOwner: false } };
  }

  const selectFields = `
    id, full_name, email, avatar_url, birthday, city, university, faculty, course, 
    study_type, is_student, budget_min, budget_max, preferred_location, 
    need_furnished, room_type, wake_time, sleep_time, cleanliness_level, 
    noise_tolerance, introvert_extrovert, lifestyle, smoking, pets, 
    hobbies, bio, preferred_gender, preferred_age_min, preferred_age_max, 
    preferred_pets, preferred_smoking, about_me
  `;

  const { data: profile } = await supabaseServer
    .from("profiles")
    .select(selectFields)
    .eq("id", id)
    .maybeSingle();

  const { data: listings } = await supabaseServer
    .from("listings")
    .select("*")
    .eq("user_id", id)
    .order("id", { ascending: false });

  return {
    props: {
      initialProfile: profile ?? null,
      initialListings: listings ?? [],
      isOwner: false, 
    },
  };
};