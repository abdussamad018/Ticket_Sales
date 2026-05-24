import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["react-qr-scanner"],
  // Prisma 7 loads WASM from node_modules/.prisma; keeping these external avoids
  // Turbopack/Windows file-lock races (EBUSY on query_compiler_fast_bg.wasm-base64.js).
  serverExternalPackages: ["@prisma/client", "prisma", "@prisma/adapter-pg", "pg"],
  // Allow LAN / WSL host access to dev resources (webpack-hmr, fonts, etc.)
  allowedDevOrigins: ["172.17.240.1", "localhost", "127.0.0.1"],
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
