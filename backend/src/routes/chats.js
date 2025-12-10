import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// get chats for user
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const q = await query("SELECT * FROM conversations WHERE (user1 = $1 OR user2 = $1) ORDER BY updated_at DESC", [userId]);
    res.json({ conversations: q.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch chats" });
  }
});

export default router;
