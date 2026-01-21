"use client";

import { motion } from "framer-motion";
import { MapPin, Sparkles, Moon, Sun, GraduationCap, CheckCircle2 } from "lucide-react";

interface ListingCardProps {
  listing: any;
  onClick: () => void;
  isUniMatch?: boolean;
  matchScore?: number;
}

export default function ListingCard({ 
  listing: profile, 
  onClick, 
  isUniMatch, 
  matchScore = 75 
}: ListingCardProps) {
  
  const actualListing = profile.listings?.[0]; 
  const displayPrice = actualListing?.price ?? profile.budget ?? 0;

  return (
    <motion.div 
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`group cursor-pointer bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border transition-all duration-500 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 ${
        isUniMatch 
          ? "border-indigo-500/30 dark:border-indigo-500/30" 
          : "border-slate-100 dark:border-slate-800"
      }`}
    >
      {/* Изображение и Бэйджи */}
      <div className="relative aspect-[4/5] overflow-hidden">
        <img 
          src={actualListing?.image_url || profile.avatar_url || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267"} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          alt={profile.full_name}
        />
        
        {/* Верхняя панель: Автор и Степень совместимости */}
        <div className="absolute top-5 left-5 right-5 flex justify-between items-start z-10">
          <div className="flex items-center gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1.5 pr-4 rounded-2xl shadow-xl">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white overflow-hidden border-2 border-white dark:border-slate-800">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <span className="text-xs font-black">{profile?.full_name?.charAt(0)}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <p className="text-[10px] font-black text-slate-900 dark:text-white leading-none">
                  {profile?.full_name || "Студент"}
                </p>
                {isUniMatch && <CheckCircle2 size={10} className="text-indigo-500" />}
              </div>
              <p className={`text-[8px] font-bold uppercase tracking-wider ${isUniMatch ? "text-indigo-500" : "text-slate-400"}`}>
                {profile?.university || "ВУЗ не указан"}
              </p>
            </div>
          </div>

          {/* ЛОКАЛИЗОВАННЫЙ СТАТУС СОВМЕСТИМОСТИ */}
          <div className={`px-4 py-2 rounded-xl text-[10px] font-black italic shadow-lg transition-colors ${
            isUniMatch 
              ? "bg-indigo-600 text-white shadow-indigo-500/40" 
              : "bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700"
          }`}>
            {isUniMatch ? "ВАШ СОКУРСНИК" : `ПОДХОДИТ ВАМ НА ${matchScore}%`}
          </div>
        </div>

        {/* Градиент снизу */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent opacity-80" />
        
        {/* Цена */}
        <div className="absolute bottom-6 left-6 text-white z-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70 mb-1">Бюджет в месяц</p>
          <p className="text-3xl font-black italic tracking-tighter">
            {Number(displayPrice).toLocaleString("ru-RU")} ₸
          </p>
        </div>
      </div>

      {/* Контент под фото */}
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight mb-2 line-clamp-1 group-hover:text-indigo-500 transition-colors">
            {actualListing?.title || (isUniMatch ? `Ваш сокурсник: ${profile.full_name}` : `Сожитель: ${profile.full_name}`)}
          </h3>
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
            <MapPin size={14} className="text-indigo-500" />
            <span className="line-clamp-1">{actualListing?.address || profile?.city || "Район не указан"}</span>
          </div>
        </div>

        {/* Студенческие теги */}
        <div className="flex flex-wrap gap-2 pt-1">
          {profile?.schedule_type === 'morning' && (
            <Tag icon={<Sun size={12} />} text="Жаворонок" color="amber" />
          )}
          {profile?.schedule_type === 'evening' && (
            <Tag icon={<Moon size={12} />} text="Сова" color="indigo" />
          )}
          {profile?.cleanliness_level > 3 && (
            <Tag icon={<Sparkles size={12} />} text="Чистюля" color="emerald" />
          )}
          <Tag icon={<GraduationCap size={12} />} text={profile?.faculty || "Студент"} color="slate" />
        </div>
      </div>
    </motion.div>
  );
}

function Tag({ icon, text, color }: { icon: any, text: string, color: string }) {
  const colors: any = {
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10",
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10",
    slate: "bg-slate-50 text-slate-600 dark:bg-slate-500/10",
  };
  
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider ${colors[color] || colors.slate}`}>
      {icon} {text}
    </div>
  );
}