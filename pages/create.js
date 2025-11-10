import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabaseClient";
import { sanitizeFileName } from "../lib/sanitizeFileName";

export default function CreateListing({ city }) {
  // --- Hooks ---
  const [user, setUser] = useState(undefined);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    totalSpots: "",
    filledSpots: 0,
    city: city || "",
    address: "",   // добавлено
    lat: null,     // добавлено
    lng: null,     // добавлено
  });
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // --- Импорт Krisha.kz ---
  const [krishaUrl, setKrishaUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");

  // --- Получаем пользователя ---
  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) console.error(error);
      setUser(data?.user || null);
    };
    fetchUser();
  }, []);

  if (user === undefined)
    return <div className="p-6 text-center">Загрузка...</div>;
  if (!user)
    return (
      <div className="p-6 text-center">⚠ Войдите, чтобы создать объявление.</div>
    );

  // --- Handlers ---
  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // геокодер — получает lat/lng по адресу через /api/geocode
  const handleGeocode = async () => {
    if (!formData.address) {
      alert("Введите адрес для поиска на карте");
      return;
    }
    setImporting?.(true);
    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: formData.address }),
      });
      const data = await res.json();
      if (res.ok && data.lat && data.lng) {
        setFormData((prev) => ({ ...prev, lat: data.lat, lng: data.lng }));
      } else {
        alert(data.error || "Не удалось определить координаты");
      }
    } catch (err) {
      console.error("Geocode error:", err);
      alert("Ошибка при попытке получить координаты");
    } finally {
      setImporting?.(false);
    }
  };

  const handleImagesChange = (e) => {
    const files = Array.from(e.target.files || []);
    setImages(files);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const handleImportFromKrisha = async (e) => {
    e?.preventDefault?.();
    if (!krishaUrl) {
      setImportError("Пожалуйста, вставьте ссылку Krisha.kz");
      return;
    }
    setImporting(true);
    setImportError("");
    setPreviews([]); // 🧹 очищаем старые превью перед импортом

    try {
      const res = await fetch("/api/import-krisha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: krishaUrl }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || data.message || "Ошибка импорта");

      setFormData((prev) => ({
        ...prev,
        title: data.title || prev.title,
        description: data.description || prev.description,
        price: data.price || prev.price,
        city: data.city || prev.city,
      }));

      if (Array.isArray(data.images) && data.images.length) {
        setPreviews([...new Set(data.images.filter(Boolean))]);
      }
    } catch (err) {
      setImportError(err?.message || String(err));
    } finally {
      setImporting(false);
    }
  };

  const uploadImages = async () => {
    if (!images.length) return [];

    const urls = [];
    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const safeName = `${Date.now()}-${sanitizeFileName(file.name)}`;
      const { error } = await supabase.storage
        .from("listings")
        .upload(safeName, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;

      const { data: urlData } = await supabase.storage
        .from("listings")
        .getPublicUrl(safeName);
      urls.push(urlData?.publicUrl);
      setProgress(Math.round(((i + 1) / images.length) * 100));
    }
    return urls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!formData.title || !formData.price || !formData.city) {
      setError("Пожалуйста, заполните обязательные поля.");
      return;
    }

    setLoading(true);
    try {
      const imageUrls = await uploadImages();

      const { error } = await supabase.from("listings").insert([
        {
          ...formData,
          price: Number(formData.price),
          totalSpots: Number(formData.totalSpots) || 0,
          filledSpots: Number(formData.filledSpots) || 0,
          image_urls: imageUrls.length ? imageUrls : previews,
          user_id: user.id,
        },
      ]);

      if (error) throw error;
      setSuccess(true);
      setFormData({
        title: "",
        description: "",
        price: "",
        totalSpots: "",
        filledSpots: 0,
        city: city || "",
        address: "",   // добавлено
        lat: null,     // добавлено
        lng: null,     // добавлено
      });
      setImages([]);
      setPreviews([]);
      setProgress(0);
    } catch (err) {
      console.error(err);
      setError("Не удалось создать объявление. Попробуйте снова.");
    } finally {
      setLoading(false);
    }
  };

  // --- UI ---
  return (
    <div className="max-w-3xl mx-auto p-6">
      <motion.h1
        className="text-3xl font-bold mb-6 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        🏠 Создать объявление
      </motion.h1>

      {/* === Форма создания === */}
      <motion.form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 space-y-8 border border-gray-100 dark:border-gray-800"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* --- Ошибки и успех --- */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 p-3 rounded-lg">
            ✅ Объявление успешно создано!
          </div>
        )}

        {/* --- 1. Импорт с Krisha.kz --- */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 bg-gray-50 dark:bg-gray-800"
        >
          <h2 className="font-semibold text-lg mb-2">Импортировать с Krisha.kz</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Вставьте ссылку — данные и фото загрузятся автоматически. Затем можно
            их отредактировать.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={krishaUrl}
              onChange={(e) => setKrishaUrl(e.target.value)}
              placeholder="https://krisha.kz/a/show/123456"
              className="flex-1 border dark:border-gray-700 dark:bg-gray-900 rounded-lg px-3 py-2 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleImportFromKrisha}
              disabled={importing}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {importing ? "Импорт..." : "Импортировать"}
            </button>
          </div>
          {importError && (
            <p className="text-red-600 dark:text-red-400 mt-2 text-sm">
              {importError}
            </p>
          )}
        </motion.div>

        {/* --- 2. Предпросмотр фото (если есть импорт) --- */}
        {previews.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">📸 Предпросмотр фотографий</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              {previews.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`preview-${i}`}
                  loading="lazy"
                  className="rounded-xl w-full h-40 object-cover shadow-md bg-gray-200"
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              👀 Проверьте импортированные фото — при желании добавьте свои ниже.
            </p>
          </div>
        )}

        {/* --- 3. Поля объявления --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-1">Заголовок *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Например: Квартира в центре"
              className="input"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Цена (₸) *</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="Например: 60000"
              className="input"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-1">Город *</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Ваш город"
              className="input"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Описание</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Краткое описание..."
              className="input h-24 resize-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-1">Мест всего</label>
            <input
              type="number"
              name="totalSpots"
              value={formData.totalSpots}
              onChange={handleChange}
              placeholder="Например: 3"
              className="input"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Занято мест</label>
            <input
              type="number"
              name="filledSpots"
              value={formData.filledSpots}
              onChange={handleChange}
              placeholder="0"
              className="input"
            />
          </div>
        </div>

        {/* --- 4. Фото пользователя --- */}
        <div>
          <label className="block font-medium mb-1">Добавить свои фотографии *</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImagesChange}
            className="input"
          />
          {progress > 0 && loading && (
            <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <motion.div
                className="bg-blue-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* --- 5. Address + Geocode --- */}
        <div className="mt-2">
          <label className="block font-medium mb-1">Адрес *</label>
          <div className="flex gap-2">
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Например: Ахмет Байтурсынулы 5, Астана"
              className="flex-1 input"
            />
            <button
              type="button"
              onClick={handleGeocode}
              className="bg-gray-800 text-white px-3 py-2 rounded-lg"
            >
              📍 Найти на карте
            </button>
          </div>

          {formData.lat && formData.lng && (
            <iframe
              src={`https://yandex.ru/map-widget/v1/?ll=${formData.lng},${formData.lat}&z=16`}
              width="100%"
              height="220"
              allowFullScreen
              className="rounded-xl mt-3 border border-gray-200"
            />
          )}
        </div>

        {/* --- 6. Кнопка публикации --- */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          disabled={loading}
          type="submit"
          className={`btn w-full ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
        >
          {loading ? `Публикация... ${progress}%` : "📤 Опубликовать объявление"}
        </motion.button>
      </motion.form>
    </div>
  );
}
