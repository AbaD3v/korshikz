"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/hooks/utils/supabase/client";
import { ArrowLeft, Search, User, Users } from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export default function CreateGroupPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const currentUser = data.user ?? null;
      setUser(currentUser);
      setLoadingAuth(false);

      if (!currentUser) {
        router.push("/auth/login");
      }
    });
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const loadProfiles = async () => {
      setLoadingProfiles(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .neq("id", user.id)
        .order("full_name", { ascending: true });

      if (error) {
        console.error("Error loading profiles:", error);
      } else {
        setProfiles(data ?? []);
      }

      setLoadingProfiles(false);
    };

    loadProfiles();
  }, [user]);

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;

    return profiles.filter((profile) =>
      (profile.full_name ?? "Пользователь").toLowerCase().includes(q)
    );
  }, [profiles, search]);

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const createGroup = async () => {
    if (!user || !title.trim() || submitting) return;

    setSubmitting(true);
    setErrorText("");

    try {
      const { data: authData } = await supabase.auth.getUser();
      console.log("AUTH USER:", authData.user);
      console.log("LOCAL USER:", user);

      const { data: group, error: groupError } = await supabase
        .from("group_chats")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          created_by: user.id,
        })
        .select()
        .single();

      console.log("GROUP RESULT:", group, groupError);

      if (groupError || !group) {
        console.error("Error creating group:", groupError);
        setErrorText(groupError?.message || "Ошибка при создании группы");
        setSubmitting(false);
        return;
      }

      const uniqueMemberIds = Array.from(new Set(selectedUserIds)).filter(
        (id) => id !== user.id
      );

      const membersToInsert = [
        {
          group_chat_id: group.id,
          user_id: user.id,
          role: "owner",
          added_by: user.id,
        },
        ...uniqueMemberIds.map((memberId) => ({
          group_chat_id: group.id,
          user_id: memberId,
          role: "member",
          added_by: user.id,
        })),
      ];

      const { error: membersError } = await supabase
        .from("group_chat_members")
        .insert(membersToInsert);

      console.log("MEMBERS ERROR:", membersError);

      if (membersError) {
        console.error("Error adding members:", membersError);
        setErrorText(membersError?.message || "Ошибка при добавлении участников");
        setSubmitting(false);
        return;
      }

      router.push(`/chat/group/${group.id}`);
    } catch (error: any) {
      console.error("Unexpected create group error:", error);
      setErrorText(error?.message || "Неожиданная ошибка");
      setSubmitting(false);
    }
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#020617] p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
          <div className="h-10 w-40 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
          <div className="h-24 bg-white dark:bg-gray-900 rounded-3xl" />
          <div className="h-96 bg-white dark:bg-gray-900 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617] p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-white dark:hover:bg-gray-900 transition-colors"
          >
            <ArrowLeft className="text-gray-700 dark:text-gray-200" size={22} />
          </button>

          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
              Создать группу
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Выберите участников и создайте новый групповой чат
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-800 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Название группы
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Соседи блока A"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Описание
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Необязательно"
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Users className="text-indigo-600 dark:text-indigo-400" size={20} />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Участники
              </h2>
            </div>

            <span className="text-sm text-gray-500 dark:text-gray-400">
              Выбрано: {selectedUserIds.length}
            </span>
          </div>

          <div className="relative mb-4">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Поиск пользователей..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
            />
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {loadingProfiles ? (
              [1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 animate-pulse"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gray-200 dark:bg-gray-700" />
                  <div className="flex-1">
                    <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                    <div className="h-3 w-24 bg-gray-100 dark:bg-gray-700 rounded" />
                  </div>
                </div>
              ))
            ) : filteredProfiles.length > 0 ? (
              filteredProfiles.map((profile) => {
                const selected = selectedUserIds.includes(profile.id);

                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => toggleUser(profile.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${
                      selected
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 dark:border-indigo-500"
                        : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 hover:border-indigo-200 dark:hover:border-indigo-900/40"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 relative">
                        {profile.avatar_url ? (
                          <Image
                            src={profile.avatar_url}
                            alt="avatar"
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <User size={20} />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {profile.full_name ?? "Пользователь"}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selected ? "Выбран" : "Нажмите, чтобы добавить"}
                      </p>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border-2 transition-all ${
                        selected
                          ? "bg-indigo-600 border-indigo-600"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    />
                  </button>
                );
              })
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                Пользователи не найдены
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              type="button"
              onClick={createGroup}
              disabled={!title.trim() || submitting}
              className={`flex-1 py-3.5 rounded-2xl font-bold transition-all ${
                !title.trim() || submitting
                  ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
              }`}
            >
              {submitting ? "Создание..." : "Создать группу"}
            </button>

            {errorText && (
              <p className="mt-3 text-sm text-red-500">{errorText}</p>
            )}

            <Link
              href="/chat"
              className="flex-1 sm:flex-none px-6 py-3.5 rounded-2xl text-center font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
            >
              Отмена
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}