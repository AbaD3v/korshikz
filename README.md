# korshi.kz — MVP

Проект MVP платформы поиска соседей (korshi.kz).

## Как запустить локально

1. Скопировать репозиторий
2. `npm install`
3. Скопировать `.env.example` в `.env` и при необходимости изменить переменные
4. Инициализировать базу и миграции (для sqlite использовать локальную `dev.db`):
   - `npx prisma migrate dev --name init`
   - `npx prisma generate`
5. Прогнать сиды: `npm run seed`
6. `npm run dev` — приложение будет доступно http://localhost:3000

## Docker

`docker compose up --build`

## Развёртывание

Рекомендуется Vercel + Postgres (Railway/Render/Supabase). В проде используйте Postgres и обновите `DATABASE_URL`.
