import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // allow all external domains (change to specific domains for security)
      },
    ],
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  
  },
};


export default nextConfig;
