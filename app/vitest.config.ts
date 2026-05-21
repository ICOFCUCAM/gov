import { defineConfig } from 'vitest/config';
import * as path from 'path';
import * as fs from 'fs';

// Load .env.local so substrate integration tests can authenticate against
// the CivicOS Supabase project. Tiny in-line parser — no extra dep needed.
function loadEnvFile(file: string): Record<string, string> {
  try {
    const txt = fs.readFileSync(file, 'utf8');
    const out: Record<string, string> = {};
    for (const raw of txt.split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      const k = line.slice(0, eq).trim();
      let v = line.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[k] = v;
    }
    return out;
  } catch { return {}; }
}

const localEnv = loadEnvFile(path.resolve(__dirname, '.env.local'));

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    env: { ...localEnv },
  },
});
