
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    // 1. Пытаемся создать ссылку ТОЛЬКО для регистрации (signup)
    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email,
      options: { redirectTo: 'https://korshikz.space/auth/confirm' }
    });

    // 2. Если пользователь уже существует, выдаем ошибку
    if (linkError) {
      if (linkError.code === 'email_exists' || linkError.status === 422) {
        return res.status(400).json({ error: 'Данный email уже зарегистрирован' });
      }
      throw linkError;
    }

    const confirmationUrl = data.properties.action_link;

    // 3. Отправляем письмо через верифицированный домен Resend
    const { error: mailError } = await resend.emails.send({
      from: 'Korshi <welcome@korshikz.space>',
      to: email,
      subject: 'Подтверждение регистрации Korshi',
            html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    .container {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
      background-color: #ffffff;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #000;
      text-decoration: none;
      margin-bottom: 30px;
      display: block;
    }
    .card {
      background-color: #f9f9f9;
      border-radius: 16px;
      padding: 32px;
      text-align: center;
      border: 1px solid #f0f0f0;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 16px;
    }
    p {
      font-size: 16px;
      line-height: 1.5;
      color: #4a4a4a;
      margin-bottom: 24px;
    }
    .button {
      display: inline-block;
      background-color: #000000;
      color: #ffffff !important;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      transition: background-color 0.2s;
    }
    .footer {
      margin-top: 30px;
      font-size: 13px;
      color: #999;
      text-align: center;
    }
    .link-alt {
      color: #0070f3;
      word-break: break-all;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <a href="https://korshikz.space" class="logo">Korshi</a>
    
    <div class="card">
      <h1>Подтвердите ваш email</h1>
      <p>Рады видеть вас в Korshi! Чтобы активировать ваш аккаунт и начать пользоваться сервисом, нажмите на кнопку ниже.</p>
      
      <a href="${confirmationUrl}" class="button">Подтвердить аккаунт</a>
      
      <p style="margin-top: 25px; font-size: 14px; color: #888;">
        Ссылка действительна в течение 24 часов.
      </p>
    </div>

    <div class="footer">
      <p>Если кнопка не работает, скопируйте эту ссылку в браузер:</p>
      <p class="link-alt">${confirmationUrl}</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p>&copy; 2026 Korshi.kz. Все права защищены.</p>
    </div>
  </div>
</body>
</html>
`
      ,
    });

    if (mailError) throw mailError;

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Auth Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}