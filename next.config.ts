import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.22.17", "immense-crab-lively.ngrok-free.app"],
  experimental: {
    serverActions: {
      bodySizeLimit: "11mb",
    },
  },
}

export default nextConfig
