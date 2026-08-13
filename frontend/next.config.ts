import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow other devices on LAN to load dev scripts and HMR
  allowedDevOrigins: [
    '10.0.240.224',
    '10.0.240.224:3000',
    '172.16.0.2',
    '172.16.0.2:3000',
    'localhost',
    'localhost:3000',
  ],
};

export default nextConfig;
