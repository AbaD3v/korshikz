import Image from "next/image";
import Link from "next/link";
import { X, Users, Crown, Shield, Trash2, UserPlus } from "lucide-react";

type MemberRole = "owner" | "admin" | "member";

interface MemberProfile {
  id: string;
  full_name: string | null;
  username?: string | null;
  avatar_url: string | null;
}

interface GroupMember {
  id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  profiles: MemberProfile | null;
}

interface GroupChatInfoDrawerProps {
  open: boolean;
  onClose: () => void;
  groupTitle: string;
  members: GroupMember[];
  currentUserId: string;
  onRemoveMember: (userId: string) => void;
  onAddMember: () => void;
  onMakeAdmin: (userId: string) => void;
  onRemoveAdmin: (userId: string) => void;
  onTransferOwnership: (userId: string) => void;
}


const roleLabelMap: Record<MemberRole, string> = {
  owner: "Владелец",
  admin: "Админ",
  member: "Участник",
};

const roleIconMap: Record<MemberRole, React.ReactNode> = {
  owner: <Crown size={14} className="text-amber-500" />,
  admin: <Shield size={14} className="text-indigo-500" />,
  member: <Users size={14} className="text-gray-400" />,
};

export default function GroupChatInfoDrawer({
  open,
  onClose,
  groupTitle,
  members,
  currentUserId,
  onRemoveMember,
  onAddMember,
}: GroupChatInfoDrawerProps) {
  if (!open) return null;

  const currentMember = members.find((m) => m.user_id === currentUserId);
  const currentRole = currentMember?.role;

  const canAdd = currentRole === "owner" || currentRole === "admin";

  const canRemoveMember = (target: GroupMember) => {
    if (!currentRole) return false;
    if (target.user_id === currentUserId) return false;

    if (currentRole === "owner") {
      return target.role === "admin" || target.role === "member";
    }

    if (currentRole === "admin") {
      return target.role === "member";
    }

    return false;
  };

  const sortedMembers = [...members].sort((a, b) => {
    const order = { owner: 0, admin: 1, member: 2 };
    return order[a.role] - order[b.role];
  });

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-[#0f172a] border-l border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Информация о чате
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {groupTitle}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-xl font-black text-gray-900 dark:text-white">
            {groupTitle}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {members.length} участников
          </p>

          {canAdd && (
            <button
              onClick={onAddMember}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
            >
              <UserPlus size={16} />
              Добавить участника
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {sortedMembers.map((member) => {
            const profile = member.profiles;
            const name =
              profile?.full_name || profile?.username || "Пользователь";

            return (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/5 p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0">
                    {profile?.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={name}
                        width={44}
                        height={44}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                        {name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/profile/${member.user_id}`}
                      className="block text-sm font-bold text-gray-900 dark:text-white truncate hover:underline"
                    >
                      {name}
                    </Link>

                    <div className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      {roleIconMap[member.role]}
                      <span>{roleLabelMap[member.role]}</span>
                    </div>
                  </div>
                </div>

                {canRemoveMember(member) && (
                  <button
                    onClick={() => onRemoveMember(member.user_id)}
                    className="p-2 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                    title="Удалить участника"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}