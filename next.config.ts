import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Prisma 7 loads WASM from node_modules/.prisma; keeping these external avoids
  // Turbopack/Windows file-lock races (EBUSY on query_compiler_fast_bg.wasm-base64.js).
  serverExternalPackages: ["@prisma/client", "prisma", "@prisma/adapter-pg", "pg"],
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
