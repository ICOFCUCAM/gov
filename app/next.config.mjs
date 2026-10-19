import { embedHeaders, pageHeaders } from './security-headers.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Doctrine: no third-party analytics, no remote images by default,
  // no telemetry to the vendor. Sovereign cloud portable.
  poweredByHeader: false,
  // No next/image is used; the image optimizer stays off.
  images: { unoptimized: true },
  // Read by Node at run time, not bundled: sql.js (GeoPackage boundary
  // files, lib/geo/boundary-files.ts) carries its WebAssembly inline; mqtt (the
  // twin's stream subscribers, lib/twin/mqtt.ts) is a Node client with its own
  // optional transports.
  // (src/instrumentation.ts, which restores and saves the platform's state, is
  // loaded by Next.js 15 without a flag.)
  serverExternalPackages: ['sql.js', 'mqtt'],
  // Security headers (security-headers.mjs, mirrored in vercel.json). The
  // Content-Security-Policy carries a nonce per request and is set by the
  // middleware (src/middleware.ts).
  async headers() {
    return [
      {
        // Everything except the embeddable widgets is never framed.
        source: '/((?!embed/).*)',
        headers: pageHeaders(),
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
        headers: embedHeaders(),
      },
    ];
  },
};

export default nextConfig;
