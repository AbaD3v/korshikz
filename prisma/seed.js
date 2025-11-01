const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Очистка базы данных...');

  // Удаляем в правильном порядке, чтобы не было ошибок по FK
  await prisma.application.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.user.deleteMany();

  console.log('🌱 Добавляем тестовые данные...');

  // Хеш пароля для всех тестовых пользователей
  const passwordHash = await bcrypt.hash('password123', 10);

  // Создаём пользователей
  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      name: 'Alice',
      password: passwordHash,
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      name: 'Bob',
      password: passwordHash,
    },
  });

  const carol = await prisma.user.create({
    data: {
      email: 'carol@example.com',
      name: 'Carol',
      password: passwordHash,
    },
  });

  // Создаём объявления (ownerId ссылается на созданных пользователей)
  const listing1 = await prisma.listing.create({
    data: {
      title: 'Комната рядом с КТУ — 50 тыс ₸/месяц',
      description: 'Уютная комната, 4 места, можно делить. Идеально для студентов.',
      city: 'Алматы',
      price: 200000,
      totalSpots: 4,
      filledSpots: 0,
      moveInDate: new Date('2025-11-01'),
      ownerId: alice.id,
    },
  });

  const listing2 = await prisma.listing.create({
    data: {
      title: 'Квартира в центре — делим на 3',
      description: '2 комнаты + гостиная, ищем соседов на долгий срок.',
      city: 'Актобе',
      price: 150000,
      totalSpots: 3,
      filledSpots: 1,
      moveInDate: new Date('2025-11-05'),
      ownerId: bob.id,
    },
  });

  const listing3 = await prisma.listing.create({
    data: {
      title: 'Апартаменты возле Nazarbayev Uni',
      description: 'Современная квартира, ищем ответственных соседей.',
      city: 'Астана',
      price: 240000,
      totalSpots: 4,
      filledSpots: 2,
      moveInDate: new Date('2025-12-01'),
      ownerId: alice.id,
    },
  });

  const listing4 = await prisma.listing.create({
    data: {
      title: 'Комната у моря (Актау)',
      description: 'Небольшая комната рядом с кампусом, отличный вид.',
      city: 'Актау',
      price: 180000,
      totalSpots: 3,
      filledSpots: 2,
      moveInDate: new Date('2025-11-10'),
      ownerId: carol.id,
    },
  });

  // Пара заявок (applications)
  await prisma.application.create({
    data: {
      listingId: listing1.id,
      userId: bob.id,
      message: 'Привет! Я ищу соседей, можно присоединиться?',
    },
  });

  await prisma.application.create({
    data: {
      listingId: listing3.id,
      userId: carol.id,
      message: 'Здравствуйте, заинтересовало объявление — могу посмотреть?',
    },
  });

  console.log('✅ Seed успешно добавлен!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('✨ Готово.');
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('❌ Ошибка при сидировании:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
