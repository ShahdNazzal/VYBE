
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output is for self-hosting (Windows/VPS). Vercel builds its own
  // optimized output — enabling standalone there only bloats the deployment.
  output: process.env.VERCEL ? undefined : "standalone",
  // يجبر فيرصل يرفع ملفات صور الهيرو والخزانة الافتتاحية مع دوال السيرفر
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



// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   // Standalone output is for self-hosting (Windows/VPS). Vercel builds its own
//   // optimized output — enabling standalone there only bloats the deployment.
//   output: process.env.VERCEL ? undefined : "standalone",
//   /* config options here */
//   typescript: {
//     ignoreBuildErrors: true,
//   },
//   reactStrictMode: false,
// };

// export default nextConfig;


