/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Doctrine: no third-party analytics, no remote images by default,
  // no telemetry to the vendor. Sovereign cloud portable.
  poweredByHeader: false,
  experimental: {
    // App Router is stable in 14.x.
    // src/instrumentation.ts restores and saves the platform's state (lib/data/persist.ts).
    instrumentationHook: true,
  },
  // Security headers — sensible defaults; tune per sovereign deployment.
  async headers() {
    return [
      {
        // Everything except the embeddable widgets is never framed.
        source: '/((?!embed/).*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      // Recording a site's position (national facility register): this
      // platform's own pages may read the device's location, nobody else; the
      // camera stays off (a photo is chosen through the file picker).
      ...['/gov/sites', '/gov/sites/:path*', '/gov/ministry/:path*', '/ministries/:path*'].map(source => ({
        source,
        headers: [{ key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' }],
      })),
      {
        // /embed/* may be framed only by the ministry's registered website: the
        // route sets Content-Security-Policy frame-ancestors itself.
        source: '/embed/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
