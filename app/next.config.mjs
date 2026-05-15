/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Doctrine: no third-party analytics, no remote images by default,
  // no telemetry to the vendor. Sovereign cloud portable.
  poweredByHeader: false,
  experimental: {
    // App Router is stable in 14.x.
  },
  // Security headers — sensible defaults; tune per sovereign deployment.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
