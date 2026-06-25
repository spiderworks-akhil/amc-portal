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

  async headers() {
    return [
      {
        // Prevent browser from caching HTML navigation responses;
        // static assets (_next/static/*) are content-hashed and unaffected.
        source: "/((?!_next/static|_next/image|favicon\\.ico).*)",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
