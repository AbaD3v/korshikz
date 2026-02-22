import { supabase } from "../lib/supabaseClient";

export async function markChatRead(chatId: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return;

  const { error } = await supabase
    .from("korshi_chat_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("chat_id", chatId)
    .eq("user_id", userId);

  if (error) {
    console.log("[markChatRead] error:", error.message);
  }
}