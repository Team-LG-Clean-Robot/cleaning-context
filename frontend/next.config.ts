import type { NextConfig } from "next";

const config: NextConfig = {
  async rewrites() {
    if (process.env.NEXT_PUBLIC_API_URL) return [];
    return [
      { source: "/api/:path*", destination: "http://localhost:8000/api/:path*" },
    ];
  },
};

export default config;
