import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "access.spiderworks.org",
      },
    ],
  },

  async rewrites() {
    return [
      {
        source: "/api/:path((?!auth/).*)",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
