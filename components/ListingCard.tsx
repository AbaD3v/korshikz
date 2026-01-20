import { motion } from "framer-motion";
import { MapPin, Sparkles, Moon, Sun, GraduationCap } from "lucide-react";

export default function ListingCard({ listing: profile, onClick }: any) {
  // В твоем новом API 'listing' — это на самом деле объект профиля.
  // А само объявление (цена, адрес) лежит в массиве profile.listings
  const actualListing = profile.listings?.[0]; 
  
  // Безопасное получение цены (если нет листинга, берем бюджет из профиля)
  const displayPrice = actualListing?.price ?? profile.budget ?? 0;

  return (
    <motion.div 
      whileHover={{ y: -8 }}
      onClick={onClick}
      className="group cursor-pointer bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500"
    >
      {/* Изображение и Бэйджи */}
      <div className="relative aspect-[4/5] overflow-hidden">
        <img 
          src={actualListing?.image_url || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267"} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          alt={profile.full_name}
        />
        
        {/* Плашка автора (Студента) */}
        <div className="absolute top-5 left-5 right-5 flex justify-between items-start">
          <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-2 pr-4 rounded-2xl shadow-xl">
            <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center text-white overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-black">{profile?.full_name?.charAt(0)}</span>
              )}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-900 dark:text-white leading-none">
                {profile?.full_name || "Студент"}
              </p>
              <p className="text-[8px] text-indigo-500 font-bold uppercase tracking-wider">
                {profile?.university || "ВУЗ не указан"}
              </p>
            </div>
          </div>

          <div className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black italic shadow-lg shadow-indigo-500/40">
            MATCH
          </div>
        </div>

        {/* Градиент снизу */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-60" />
        
        {/* Цена (Исправлено: защита от undefined) */}
        <div className="absolute bottom-6 left-6 text-white">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mb-1">Бюджет / Месяц</p>
          <p className="text-3xl font-black italic tracking-tighter">
            {displayPrice.toLocaleString("ru-RU")} ₸
          </p>
        </div>
      </div>

      {/* Контент под фото */}
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight mb-2 line-clamp-1">
            {actualListing?.title || `Поиск сожителя: ${profile.full_name}`}
          </h3>
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
            <MapPin size={14} className="text-indigo-500" />
            {actualListing?.address || "Район не указан"}
          </div>
        </div>

        {/* Студенческие теги */}
        <div className="flex flex-wrap gap-2 pt-2">
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

function Tag({ icon, text, color }: any) {
  const colors: any = {
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10",
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10",
    slate: "bg-slate-50 text-slate-600 dark:bg-slate-500/10",
  };
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider ${colors[color]}`}>
      {icon} {text}
    </div>
  );
}