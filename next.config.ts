import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Only allow Cloudflare R2 public domain + our own
        protocol: "https",
        hostname: "pub-60b4679aa7b4477b838c988b7a0b3d45.r2.dev",
      },
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
    ],
    formats: ["image/avif", "image/webp"],
    qualities: [100, 75],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 3600,
  },

  // Allow large uploads (videos up to 100MB) through Next.js routes/proxy
  experimental: {
    proxyClientMaxBodySize: "100mb",
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },

  // Disable powered-by header
  poweredByHeader: false,

  async headers() {
    return [
      {
        // Apply to ALL routes
        source: "/:path*",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Prevent MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Enable XSS filter
          { key: "X-XSS-Protection", value: "0" },
          // Don't send referrer outside origin
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          // DNS prefetch
          { key: "X-DNS-Prefetch-Control", value: "on" },
          // Strict transport security (HSTS) — force HTTPS
          {
            key: "Strict-Transport-Security",
            value: process.env.NODE_ENV === "production" ? "max-age=63072000; includeSubDomains; preload" : "max-age=0",
          },
          // Permissions policy — disable unnecessary browser features
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()",
          },
          // Content Security Policy
          // NOTE: 'unsafe-inline' is required by Next.js and React hydration.
          // 'unsafe-eval' is required by framer-motion and Next.js dev mode.
          // In production, consider nonce-based CSP for tighter security.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://pub-60b4679aa7b4477b838c988b7a0b3d45.r2.dev https://*.r2.dev",
              "media-src 'self' blob: https: http:",
              "frame-src 'self' https://www.instagram.com https://instagram.com https://*.instagram.com https://www.tiktok.com https://*.tiktok.com https://www.youtube.com https://youtube.com https://*.youtube.com",
              "connect-src 'self' https://api.cloudflare.com https://pub-60b4679aa7b4477b838c988b7a0b3d45.r2.dev https://*.r2.dev https://*.r2.cloudflarestorage.com https://api.telegram.org",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              // Upgrade HTTP to HTTPS in production
              ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
            ].join("; "),
          },
        ],
      },
      {
        // API routes — extra no-cache, no-store
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
      {
        // Admin routes — deny framing + no cache
        source: "/gharnata-portal-x92/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, private" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },

  async rewrites() {
    return [];
  },
};

export default nextConfig;