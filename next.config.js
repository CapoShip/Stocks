/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignore les erreurs ESLint pendant le build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ignore les erreurs TypeScript (si présentes)
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;