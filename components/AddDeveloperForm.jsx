import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AddDeveloperForm() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { error: err } = await supabase.from("developers").insert([
        {
          name: name.trim(),
          role: role.trim(),
          bio: bio.trim() || null,
          skills: skills.trim() || null,
        },
      ]);

      if (err) throw err;

      setName("");
      setRole("");
      setBio("");
      setSkills("");
      setSuccess("Разработчик успешно добавлен!");
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      setError("Ошибка: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Имя */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
          Имя разработчика *
        </label>
        <input
          type="text"
          placeholder="Иван Иванов"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
        />
      </div>

      {/* Роль */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
          Роль *
        </label>
        <input
          type="text"
          placeholder="Frontend разработчик"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
          className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
        />
      </div>

      {/* Описание */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
          Описание
        </label>
        <textarea
          placeholder="Краткое описание специалиста..."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows="3"
          className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
        />
      </div>

      {/* Навыки */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
          Навыки (через запятую)
        </label>
        <input
          type="text"
          placeholder="React, TypeScript, Node.js"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
        />
      </div>

      {/* Сообщения об ошибках и успехе */}
      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-200 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-200 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Кнопка отправки */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
      >
        {loading ? "Добавляем..." : "Добавить разработчика"}
      </button>
    </form>
  );
}
