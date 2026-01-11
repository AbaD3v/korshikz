/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hhttkidobrwwautenmva.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "krisha-photos.kcdn.online",
        port: "",
        pathname: "/**",
      },
      // Рекомендую добавить эти домены, если используешь вход через соцсети
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google аватаки
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com", // GitHub аватарки
      },
    ],
  },
  // Это поможет избежать проблем с деплоем, если есть мелкие ошибки в типах
  typescript: {
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;