//server next.js hoạt động
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  //cho phép các url ảnh hợp lệ, giống csrf
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },

    //rewrites tránh lỗi CORS, Giấu địa chỉ Backend
    async rewrites() {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      return [
        {
          source: '/api/:path*',
          destination: `${API_URL}/api/:path*`,
        },
        {
          source: '/auth/:path*',
          destination: `${API_URL}/auth/:path*`, 
        },
      ];
    },
};

export default nextConfig;