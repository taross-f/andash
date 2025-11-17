/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: process.env.SKIP_ENV_VALIDATION === "true",
  },
  typescript: {
    ignoreBuildErrors: process.env.SKIP_ENV_VALIDATION === "true",
  },
  experimental: {
    serverComponentsExternalPackages: ["cheerio", "axios"],
  },
};

export default nextConfig;
