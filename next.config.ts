import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpackDevMiddleware: (config: { watchOptions: { poll: number; aggregateTimeout: number } }) => {
    config.watchOptions = {
      poll: 1000, // Mengecek perubahan setiap 1 detik
      aggregateTimeout: 300,
    };
    return config;
  },
};

export default nextConfig;
