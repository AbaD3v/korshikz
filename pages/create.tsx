"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { 
  Loader2, Upload, CheckCircle, AlertCircle, 
  X, MapPin, ChevronRight, Info, Search, Link as LinkIcon 
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { sanitizeFileName } from "@/lib/sanitizeFileName";

// Динамический импорт карты
const ListingMap = dynamic(() => import("@/components/ListingMap"), { 
  ssr: false,
  loading: () => <div className="h-80 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-[3rem]" />
});

export default function CreateListingPage({ city: globalCity }: { city: string }) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<any>(undefined);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState<any>({
    title: "",
    description: "",
    price: "",
    city: globalCity || "Астана",
    address: "",
    property_type: "apartment",
    rent_type: "long",
    rooms: "",
    area_total: "",
    floor: "",         // Текущий этаж
    floors_total: "",  // Всего этажей
    lat: null,
    lng: null,
  });

  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [krishaUrl, setKrishaUrl] = useState("");

  useEffect(() => {
    setIsMounted(true);
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    };
    fetchUser();
  }, []);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  // --- ОБНОВЛЕННАЯ ЛОГИКА ИМПОРТА ---
  const handleImportFromKrisha = async () => {
    if (!krishaUrl) return;
    setImporting(true);
    setError("");
    try {
      const res = await fetch("/api/import-krisha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: krishaUrl }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка импорта");

      // Наш API теперь возвращает уже очищенные и распарсенные данные
      setFormData((prev: any) => ({
        ...prev,
        title: data.title || prev.title,
        description: data.description || prev.description,
        price: data.price || prev.price,
        city: data.city || prev.city,
        address: data.address || prev.address,
        rooms: data.rooms || prev.rooms,
        area_total: data.area_total || prev.area_total,
        floor: data.floor || prev.floor,
        floors_total: data.floors_total || prev.floors_total,
      }));
      console.log("Images received in form:", data.images);

      if (data.images) setPreviews(data.images);
      
      if (data.address) {
        setTimeout(() => handleFindOnMap(data.address, data.city || formData.city), 500);
      }
    } catch (err: any) {
      setError("Ошибка импорта: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleFindOnMap = async (addr?: string, cty?: string) => {
    const targetAddress = addr || formData.address;
    const targetCity = cty || formData.city;
    if (!targetAddress) return;
    
    try {
      const fullAddress = `${targetCity}, ${targetAddress}`;
      const res = await fetch(`https://geocode-maps.yandex.ru/1.x/?apikey=${process.env.NEXT_PUBLIC_YANDEX_API_KEY}&format=json&geocode=${encodeURIComponent(fullAddress)}`);
      const data = await res.json();
      const pos = data.response?.GeoObjectCollection?.featureMember[0]?.GeoObject?.Point?.pos;
      
      if (pos) {
        const [lng, lat] = pos.split(" ").map(Number);
        setFormData(prev => ({ ...prev, lat, lng }));
      }
    } catch (err) {
      console.error("Geocoding error", err);
    }
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages(prev => [...prev, ...files]);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const uploadImages = async () => {
    const urls = [];
    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const fileName = `${Date.now()}-${sanitizeFileName(file.name)}`;
      const filePath = `${user.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("listings").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("listings").getPublicUrl(filePath);
      urls.push(data.publicUrl);
      setProgress(Math.round(((i + 1) / images.length) * 100));
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lat || !formData.lng) {
      setError("Пожалуйста, нажмите 'Найти' на карте");
      return;
    }
    setLoading(true);

    try {
      const imageUrls = images.length > 0 ? await uploadImages() : previews;
      const toNum = (val: any) => (val === "" || val === null) ? null : Number(val);

      const submissionData = {
        ...formData,
        user_id: user.id,
        price: toNum(formData.price) || 0,
        rooms: toNum(formData.rooms),
        area_total: toNum(formData.area_total),
        floor: toNum(formData.floor),
        floors_total: toNum(formData.floors_total), // Сохраняем общую этажность
        image_urls: imageUrls,
        coordinates: `POINT(${formData.lng} ${formData.lat})`,
        status: "active"
      };

      const { error: insertError } = await supabase.from("listings").insert([submissionData]);
      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => router.push("/listings"), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) return null;
  if (user === null) return <div className="p-20 text-center font-black dark:text-white uppercase italic text-4xl">Войдите в систему</div>;

  return (
    <div className="min-h-screen bg-white dark:bg-[#020617] pb-20">
      <div className="max-w-4xl mx-auto px-6 pt-12">
        
        <header className="mb-12">
          <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">
            <ChevronRight size={12} /> Korshi.kz / Создание
          </div>
          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter dark:text-white leading-none">
            Новое <br /> <span className="text-indigo-600">Объявление</span>
          </h1>
        </header>

        <form onSubmit={handleSubmit} className="space-y-12">
          
          {/* ИМПОРТ */}
          <section className="bg-indigo-50 dark:bg-indigo-950/20 p-8 rounded-[3rem] border-2 border-indigo-100 dark:border-indigo-900/30">
            <h2 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-6">
              <LinkIcon size={14} /> Быстрый импорт данных
            </h2>
            <div className="flex flex-col md:flex-row gap-4">
              <input 
                value={krishaUrl} onChange={(e) => setKrishaUrl(e.target.value)}
                placeholder="Вставьте ссылку на Krisha.kz..."
                className="flex-1 bg-white dark:bg-slate-900 border-none rounded-2xl px-6 py-5 text-sm font-bold outline-none ring-2 ring-indigo-100 dark:ring-indigo-900/20 focus:ring-indigo-500 transition-all dark:text-white"
              />
              <button 
                type="button" onClick={handleImportFromKrisha} disabled={importing}
                className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                {importing ? <Loader2 className="animate-spin" /> : "Импортировать"}
              </button>
            </div>
          </section>

          {/* МЕСТОПОЛОЖЕНИЕ */}
          <section className="space-y-6">
            <h3 className="text-2xl font-black italic uppercase dark:text-white flex items-center gap-3">
              <MapPin className="text-indigo-500" /> 1. Местоположение
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input 
                name="city" value={formData.city} onChange={handleChange} placeholder="Город"
                className="bg-slate-100 dark:bg-slate-800/50 p-5 rounded-3xl font-bold outline-none dark:text-white"
              />
              <div className="md:col-span-2 flex gap-2">
                <input 
                  name="address" value={formData.address} onChange={handleChange} placeholder="Улица, дом"
                  className="flex-1 bg-slate-100 dark:bg-slate-800/50 p-5 rounded-3xl font-bold outline-none dark:text-white"
                />
                <button 
                  type="button" onClick={() => handleFindOnMap()}
                  className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 rounded-3xl font-black text-xs uppercase hover:scale-105 transition-all flex items-center gap-2"
                >
                  <Search size={16} /> Найти
                </button>
              </div>
            </div>

            <div className="h-80 rounded-[3rem] overflow-hidden border-4 border-slate-100 dark:border-slate-800 relative">
              <ListingMap 
                listings={formData.lat ? [{ ...formData, id: 'temp' }] : []} 
                key={formData.lat ? `map-${formData.lat}-${formData.lng}` : 'empty'}
              />
              {!formData.lat && (
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center text-white text-center">
                  <MapPin size={40} className="mb-2 text-indigo-400 animate-bounce" />
                  <p className="font-black uppercase tracking-widest text-[10px]">Подтвердите адрес кнопкой «Найти»</p>
                </div>
              )}
            </div>
          </section>

          {/* ДЕТАЛИ ОБЪЕКТА */}
          <section className="space-y-8">
            <h3 className="text-2xl font-black italic uppercase dark:text-white flex items-center gap-3">
              <Info className="text-indigo-500" /> 2. Детали объекта
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Заголовок</label>
                <input name="title" value={formData.title} onChange={handleChange} required placeholder="Напр: Светлая 2-комнатная квартира" className="w-full bg-slate-100 dark:bg-slate-800/50 p-5 rounded-3xl outline-none font-bold dark:text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Цена (₸)</label>
                <input name="price" type="number" value={formData.price} onChange={handleChange} required className="w-full bg-slate-100 dark:bg-slate-800/50 p-5 rounded-3xl outline-none font-bold dark:text-white" />
              </div>
            </div>

            {/* СЕТКА ХАРАКТЕРИСТИК (Здесь теперь и этажность) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Комнат</label>
                <input name="rooms" type="number" value={formData.rooms} onChange={handleChange} className="w-full bg-slate-100 dark:bg-slate-800/50 p-5 rounded-3xl font-bold outline-none dark:text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Площадь м²</label>
                <input name="area_total" type="number" value={formData.area_total} onChange={handleChange} className="w-full bg-slate-100 dark:bg-slate-800/50 p-5 rounded-3xl font-bold outline-none dark:text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Этаж</label>
                <input name="floor" type="number" value={formData.floor} onChange={handleChange} className="w-full bg-slate-100 dark:bg-slate-800/50 p-5 rounded-3xl font-bold outline-none dark:text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Из (всего)</label>
                <input name="floors_total" type="number" value={formData.floors_total} onChange={handleChange} className="w-full bg-slate-100 dark:bg-slate-800/50 p-5 rounded-3xl font-bold outline-none dark:text-white" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Тип недвижимости</label>
                <select name="property_type" value={formData.property_type} onChange={handleChange} className="w-full bg-slate-100 dark:bg-slate-800/50 p-5 rounded-3xl font-bold outline-none dark:text-white appearance-none">
                  <option value="apartment">Квартира</option>
                  <option value="house">Дом</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Срок аренды</label>
                <select name="rent_type" value={formData.rent_type} onChange={handleChange} className="w-full bg-slate-100 dark:bg-slate-800/50 p-5 rounded-3xl font-bold outline-none dark:text-white appearance-none">
                  <option value="long">На долгий срок</option>
                  <option value="daily">Посуточно</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Описание</label>
              <textarea name="description" value={formData.description} onChange={handleChange} rows={5} className="w-full bg-slate-100 dark:bg-slate-800/50 p-8 rounded-[2.5rem] outline-none font-medium dark:text-white resize-none" placeholder="Расскажите об объекте..." />
            </div>
          </section>

          {/* ГАЛЕРЕЯ */}
          <section className="space-y-8">
             <h3 className="text-2xl font-black italic uppercase dark:text-white flex items-center gap-3">
               <Upload className="text-indigo-500" /> 3. Галерея
             </h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <label className="aspect-[4/5] border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                 <Upload className="text-slate-300 group-hover:text-indigo-500 transition-colors" size={32} />
                 <span className="text-[10px] font-black uppercase text-slate-400 mt-2 tracking-widest">Добавить</span>
                 <input type="file" multiple accept="image/*" onChange={handleImagesChange} className="hidden" />
               </label>
               {previews.map((src, i) => (
                 <div key={i} className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden group">
                   <img src={src} className="w-full h-full object-cover" alt="Preview" />
                   <button 
                    type="button" 
                    onClick={() => {
                      setPreviews(p => p.filter((_, idx) => idx !== i));
                      setImages(img => img.filter((_, idx) => idx !== i));
                    }} 
                    className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-xl backdrop-blur-md opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all"
                   >
                     <X size={16} />
                   </button>
                 </div>
               ))}
             </div>
          </section>

          {/* КНОПКА ОТПРАВКИ */}
          <div className="pt-10 flex flex-col items-center gap-6 border-t border-slate-100 dark:border-slate-800">
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 dark:bg-red-900/20 text-red-500 p-6 rounded-3xl flex items-center gap-3 font-bold text-sm">
                  <AlertCircle size={20} /> {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit" disabled={loading}
              className="w-full py-10 bg-indigo-600 text-white rounded-[3rem] font-black italic uppercase text-3xl tracking-tighter shadow-2xl shadow-indigo-500/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-4">
                  <Loader2 className="animate-spin" /> ЗАГРУЗКА {progress}%
                </div>
              ) : "ОПУБЛИКОВАТЬ"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}