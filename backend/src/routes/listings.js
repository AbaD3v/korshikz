import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// list public listings
router.get("/", async (req, res) => {
  try {
    const q = await query("SELECT * FROM listings ORDER BY created_at DESC LIMIT 200");
    res.json({ listings: q.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

// create listing (auth)
router.post("/", requireAuth, async (req, res) => {
  try {
    const { title, description, price, location } = req.body;
    const owner = req.user.id;
    const insert = await query(
      `INSERT INTO listings (title, description, price, location, owner_id, created_at)
       VALUES ($1,$2,$3,$4,$5, now()) RETURNING *`,
      [title, description, price, location, owner]
    );
    res.json({ listing: insert.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create listing" });
  }
});

export default router;
