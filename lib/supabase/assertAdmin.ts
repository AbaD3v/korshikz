import { supabaseAdmin } from "./admin";

export async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error) throw new Error("Failed to load profile");
  if (data?.role !== "admin") {
    const e: any = new Error("Forbidden");
    e.statusCode = 403;
    throw e;
  }
}