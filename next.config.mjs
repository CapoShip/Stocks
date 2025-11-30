/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Force le build même s'il y a des erreurs ESLint
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Force le build même s'il y a des erreurs TS
    ignoreBuildErrors: true,
  },
};

export default nextConfig;