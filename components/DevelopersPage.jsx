import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import DevelopersList from "./DevelopersList";
import AddDeveloperForm from "./AddDeveloperForm";

export default function DevelopersPage() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const user = supabase.auth.user();
      if (!user) return;

      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data);
    };
    fetchProfile();
  }, []);

  if (!profile) return <div>Загрузка...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Разработчики</h1>
      {profile.role === "creator" && <AddDeveloperForm />}
      <DevelopersList />
    </div>
  );
}
