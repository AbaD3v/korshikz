/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hhttkidobrwwautenmva.supabase.co",
      },
      {
        protocol: "https",
        hostname: "krisha-photos.kcdn.online",
      },
    ],
  },
};

module.exports = nextConfig;

