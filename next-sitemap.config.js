/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://korshikz.space', // Твой основной адрес
  generateRobotsTxt: true, // Автоматически создаст и robots.txt
  sitemapSize: 7000,
  exclude: ['/auth/*', '/onboarding'], // Исключаем служебные страницы, которые не нужны в поиске
}