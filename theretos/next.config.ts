import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Codespaces forwards the public host but rewrites Origin to localhost:3000.
  // Limit this exception to that exact origin while running inside Codespaces.
  ...(process.env.CODESPACES === "true" ? {
    experimental: {
      serverActions: { allowedOrigins: ["localhost:3000"] },
    },
  } : {}),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/v0/b/theretos-c7974.appspot.com/o/**",
      },
    ],
  },
};

export default nextConfig;
