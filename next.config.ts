import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: [
    'fluent-ffmpeg',
    '@ffmpeg-installer/ffmpeg',
  ],
  experimental: {
    proxyClientMaxBodySize: '210mb', // 200MB file + multipart overhead
  },
}

export default nextConfig
