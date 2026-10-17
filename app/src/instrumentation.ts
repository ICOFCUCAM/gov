// Runs once when the server starts, before it handles any request: restores
// the platform's saved state and starts saving it (lib/data/persist.ts).
// The check is written this way so Next.js leaves the Node-only module out of
// its edge build.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startFromEnv } = await import('./lib/data/persist');
    const status = await startFromEnv();
    if (status.adapter !== 'memory' || status.error) {
      console.log(`[civicos] state: ${status.adapter}, restored ${status.restored.length} stores${status.error ? ` — ${status.error}` : ''}`);
    }
  }
}
