import type { NextApiRequest } from "next";
import { supabaseAdmin } from "./admin";

export async function getUserFromAuthHeader(req: NextApiRequest) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;

  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) return null;

  return data.user ?? null;
}