import { supabase } from "@/lib/supabaseClient";

type NormalizeProfileLocationInput = {
  cityId?: string | null;
  universityId?: string | null;
};

export async function normalizeProfileLocation({
  cityId,
  universityId,
}: NormalizeProfileLocationInput) {
  const normalizedUniversityId = universityId || null;

  if (!normalizedUniversityId) {
    return {
      city_id: cityId || null,
      university_id: null,
    };
  }

  const { data: universityRow, error } = await supabase
    .from("universities")
    .select("id, city_id")
    .eq("id", normalizedUniversityId)
    .single();

  if (error || !universityRow) {
    throw new Error("Не удалось проверить выбранный университет");
  }

  return {
    city_id: universityRow.city_id,
    university_id: universityRow.id,
  };
}
