import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output is for self-hosting (Windows/VPS only).
  // Vercel and Netlify build their own managed output — standalone must stay off there.
  output:
    process.env.VERCEL || process.env.NETLIFY ? undefined : "standalone",
  // يجبر المنصة ترفع ملفات صور الهيرو والخزانة الافتتاحية مع دوال السيرفر
  outputFileTracingIncludes: {
    "/": ["./assets/imgsearch/**/*"],
    "/api/sample-wardrobe": ["./assets/imgsearch/**/*"],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;