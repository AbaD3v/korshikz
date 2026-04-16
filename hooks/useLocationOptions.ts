import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface LocationCity {
  id: string;
  name: string;
}

export interface LocationUniversity {
  id: string;
  name: string;
  city_id: string;
}

export function useLocationOptions() {
  const [cities, setCities] = useState<LocationCity[]>([]);
  const [universities, setUniversities] = useState<LocationUniversity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      setLoading(true);
      setError(null);

      try {
        const [citiesRes, universitiesRes] = await Promise.all([
          supabase.from("cities").select("id, name").order("name"),
          supabase.from("universities").select("id, name, city_id").order("name"),
        ]);

        if (citiesRes.error) throw citiesRes.error;
        if (universitiesRes.error) throw universitiesRes.error;

        if (!active) return;

        setCities((citiesRes.data ?? []) as LocationCity[]);
        setUniversities((universitiesRes.data ?? []) as LocationUniversity[]);
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "Не удалось загрузить список городов и университетов"
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOptions();

    return () => {
      active = false;
    };
  }, []);

  return { cities, universities, loading, error };
}
