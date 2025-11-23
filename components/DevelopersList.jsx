import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import DeveloperCard from "./DeveloperCard";

export default function DevelopersList() {
  const [developers, setDevelopers] = useState([]);

  useEffect(() => {
    const fetchDevelopers = async () => {
      const { data, error } = await supabase.from("developers").select("*");
      if (!error) setDevelopers(data);
    };
    fetchDevelopers();
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {developers.map((dev) => <DeveloperCard key={dev.id} dev={dev} />)}
    </div>
  );
}
