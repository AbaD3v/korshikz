import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabaseClient";
import { sanitizeFileName } from "../lib/sanitizeFileName";

export default function CreateListing({ city }) {
  // --- Hooks всегда вызываются в начале ---
  const [user, setUser] = useState(undefined);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    totalSpots: "",
    filledSpots: 0,
    city: city || "",
  });
  const [images, setImages] = useState([]); // несколько файлов
  const [previews, setPreviews] = useState([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // --- Получаем пользователя ---
  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) console.error(error);
      setUser(data?.user || null);
    };
    fetchUser();
  }, []);

  // --- Проверки после хуков ---
  if (user === undefined) {
    return <div className="p-6 text-center">Загрузка...</div>;
  }

  if (!user) {
    return <div className="p-6 text-center">⚠ Войдите, чтобы создать объявление.</div>;
  }

  // --- Handlers ---
  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleImagesChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  };

  // --- Загрузка изображений ---
  const uploadImages = async () => {
    if (!images.length) return [];

    const urls = [];
    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const safeName = `${Date.now()}-${sanitizeFileName(file.name)}`;
      const { error } = await supabase.storage
        .from("listings")
        .upload(safeName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = await supabase.storage
        .from("listings")
        .getPublicUrl(safeName);

      urls.push(urlData?.publicUrl);
      setProgress(Math.round(((i + 1) / images.length) * 100));
    }
    return urls;
  };

  // --- Отправка формы ---
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
          image_urls: imageUrls, // теперь это массив
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

      <motion.form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 space-y-5 border border-gray-100 dark:border-gray-800"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
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

        <div>
          <label className="block font-medium mb-1">Фотографии *</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImagesChange}
            className="input"
          />
          {previews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              {previews.map((src, i) => (
                <motion.img
                  key={i}
                  src={src}
                  alt="preview"
                  className="rounded-xl w-full h-40 object-cover shadow-md"
                  whileHover={{ scale: 1.05 }}
                />
              ))}
            </div>
          )}
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
          <label className="block font-medium mb-1">Описание</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Краткое описание..."
            className="input h-28 resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
