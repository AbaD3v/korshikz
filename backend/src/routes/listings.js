import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/**
 * ГЛАВНЫЙ ПОИСК (Умный мэтчинг)
 */
router.get("/", async (req, res) => {
  try {
    const { 
      university, status, budget, 
      myUniversity, myStatus 
    } = req.query;

    let sql = `
      SELECT 
        p.id, p.full_name, p.avatar_url, p.university, p.status, p.budget, p.about_me,
        l.id as listing_id, l.address, l.lat, l.lng, l.price as listing_price, l.title as listing_title
      FROM profiles p
      LEFT JOIN listings l ON p.id = l.user_id
      WHERE p.status IS NOT NULL
    `;
    
    const params = [];

    // --- ФИЛЬТРЫ ---
    if (university) { 
      params.push(university); 
      sql += ` AND p.university = $${params.length}`; 
    }
    if (status) { 
      params.push(status); 
      sql += ` AND p.status = $${params.length}`; 
    }
    if (budget) { 
      params.push(Number(budget)); 
      sql += ` AND p.budget <= $${params.length}`; 
    }

    // --- УМНАЯ СОРТИРОВКА ---
    sql += ` ORDER BY `;

    // 1. Приоритет своего ВУЗа
    if (myUniversity) {
      params.push(myUniversity);
      sql += `(p.university = $${params.length}) DESC, `;
    }

    // 2. Зеркальный мэтчинг (используем текстовые ENUM)
    if (myStatus) {
      // Если я ищу (searching), приоритет тем, у кого есть (have_flat / free_spot)
      let target;
      if (myStatus === 'searching') {
        target = "'have_flat', 'free_spot'";
      } else {
        target = "'searching'";
      }
      sql += `(p.status IN (${target})) DESC, `;
    }

    sql += ` p.created_at DESC LIMIT 100`;

    const result = await query(sql, params);
    res.json({ data: result.rows });
  } catch (err) {
    console.error("Search Error:", err);
    res.status(500).json({ error: "Server error during search" });
  }
});

/**
 * АВТО-СИНХРОНИЗАЦИЯ (После онбординга или смены статуса)
 */
router.post("/sync", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    // ПРОВЕРЬ: совпадают ли эти имена с тем, что летит с фронта
    const { status, title, address, lat, lng, price } = req.body;

    console.log("Получено на бэкенде:", { userId, status, title, lat, lng });

    if (status === 'not_looking') {
      await query("DELETE FROM listings WHERE user_id = $1", [userId]);
      return res.json({ message: "Removed" });
    }

    const upsertSql = `
      INSERT INTO listings (user_id, title, address, lat, lng, price, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, now(), now())
      ON CONFLICT (user_id)
      DO UPDATE SET
        title = EXCLUDED.title,
        address = EXCLUDED.address,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        price = EXCLUDED.price,
        updated_at = now()
      RETURNING *;
    `;

    const values = [
      userId, 
      title || "Без заголовка", 
      address || "Алматы", 
      lat, 
      lng, 
      price || 0
    ];

    const result = await query(upsertSql, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Full Sync Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;