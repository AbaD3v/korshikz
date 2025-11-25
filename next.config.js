/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['krisha-photos.kcdn.online'], // разрешаем внешний хост для next/image
  },
};

module.exports = nextConfig;
