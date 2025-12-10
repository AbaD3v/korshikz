import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// get current user (requires auth)
router.get("/me", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await query("SELECT id, email, full_name, avatar_url FROM profiles WHERE id = $1", [userId]);
    return res.json({ user: result.rows[0] ?? null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// public: get user by id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query("SELECT id, email, full_name, avatar_url FROM profiles WHERE id = $1", [id]);
    res.json({ user: result.rows[0] ?? null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;
