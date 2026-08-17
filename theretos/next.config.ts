import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
