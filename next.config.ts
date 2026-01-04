import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static image optimization on Vercel
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
