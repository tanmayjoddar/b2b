/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(process.env.BUILD_STANDALONE === 'true' ? { output: 'standalone' } : {}),
  transpilePackages: ['@factorymatch/shared'],
};

export default nextConfig;
