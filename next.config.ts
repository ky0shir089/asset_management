import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.22.16", "immense-crab-lively.ngrok-free.app"],
  experimental: {
    serverActions: {
      bodySizeLimit: "101mb",
    },
  },
}

export default nextConfig
