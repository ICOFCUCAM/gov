import { fileURLToPath } from 'node:url';
import { embedHeaders, pageHeaders } from './security-headers.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Doctrine: no third-party analytics, no remote images by default,
  // no telemetry to the vendor. Sovereign cloud portable.
  poweredByHeader: false,
  // No next/image is used; the image optimizer stays off.
  images: { unoptimized: true },
  // Compile in a separate worker that exits before type checking and linting
  // start. Next.js turns the worker off whenever a custom webpack() hook is
  // present (the i18n replacement below), which kept the compiler's ~5 GB
  // alive beside the type checker: 7.9 GB peak, at the edge of Vercel's 8 GB
  // build machine. With the worker the peak is ~5.9 GB; the output is identical.
  experimental: { webpackBuildWorker: true },
  // Read by Node at run time, not bundled: sql.js (GeoPackage boundary
  // files, lib/geo/boundary-files.ts) carries its WebAssembly inline; mqtt (the
  // twin's stream subscribers, lib/twin/mqtt.ts) is a Node client with its own
  // optional transports; aedes and ws (the SensorThings MQTT broker,
  // lib/twin/sta-mqtt.ts, started only with CIVICOS_STA_MQTT=on) run as Node
  // modules beside it; nodemailer (the nation's mail relay, lib/messaging/adapters/smtp.ts)
  // is a Node client with optional transports it loads itself.
  // (src/instrumentation.ts, which restores and saves the platform's state, is
  // loaded by Next.js 15 without a flag.)
  serverExternalPackages: ['sql.js', 'mqtt', 'aedes', 'ws', 'nodemailer'],
  // Browser bundles carry the English dictionary only (go-live review L-7):
  // src/lib/i18n/bundled.ts (every language, for the server) is replaced by
  // bundled.client.ts there. The root layout writes the nation's own
  // languages into the page; lib/i18n loads any other as its own chunk.
  webpack(config, { isServer, nextRuntime, webpack }) {
    // Every route handler finishes its durable writes before its response
    // (scripts/durable-route-loader.cjs, src/lib/data/repo/settle.ts): on a
    // serverless host nothing runs after it, and the middleware cannot wait for it.
    if (isServer && nextRuntime === 'nodejs') {
      config.module.rules.push({
        test: /[\\/]src[\\/]app[\\/](?:.+[\\/])?route\.ts$/,
        enforce: 'pre',
        loader: fileURLToPath(new URL('./scripts/durable-route-loader.cjs', import.meta.url)),
      });
    }
    if (!isServer) {
      config.plugins.push(new webpack.NormalModuleReplacementPlugin(/[\\/]lib[\\/]i18n[\\/]bundled$|^\.\/bundled$/, resource => {
        if (/[\\/]lib[\\/]i18n$/.test(resource.context) || /[\\/]lib[\\/]i18n[\\/]bundled$/.test(resource.request)) {
          resource.request = resource.request.replace(/bundled$/, 'bundled.client');
        }
      }));
    }
    return config;
  },
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
