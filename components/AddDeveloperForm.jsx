import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AddDeveloperForm() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("developers").insert([{ name, role }]);
    if (error) alert("Ошибка: " + error.message);
    else { setName(""); setRole(""); alert("Разработчик добавлен!"); }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input type="text" placeholder="Имя" value={name} onChange={(e)=>setName(e.target.value)} required />
      <input type="text" placeholder="Роль" value={role} onChange={(e)=>setRole(e.target.value)} required />
      <button type="submit" disabled={loading} className="bg-emerald-600 text-white px-4 py-2 rounded">
        {loading ? "Сохраняем..." : "Добавить"}
      </button>
    </form>
  );
}
