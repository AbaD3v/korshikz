import { supabase } from '../db.js'; // Убедись, что путь к db.js верный

export const requireAuth = async (req, res, next) => {
  try {
    // 1. Извлекаем заголовок Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // 2. Достаем сам токен
    const token = authHeader.split(' ')[1];

    // 3. Проверяем токен через Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // 4. Если всё ок, записываем юзера в запрос и идем дальше
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth Middleware Error:', err);
    res.status(500).json({ error: 'Authentication internal error' });
  }
};