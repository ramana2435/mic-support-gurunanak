/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@live-translation/shared'],
  env: {
    // Pass through environment variables without fallback
    // Fallback logic is handled in src/lib/config.ts based on NODE_ENV
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
  },
}

module.exports = nextConfig
