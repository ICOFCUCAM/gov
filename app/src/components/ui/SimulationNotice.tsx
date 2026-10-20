// Agency applications run on simulation engines until their real records
// exist (docs/GOVERNMENT_OPERATING_DIRECTIONS.md 10.1): in a production
// installation each one says so above everything it shows, so no simulated
// figure, list or case is read as the nation's. Training and demonstration
// installations carry the installation banner instead (InstallationBanner).

export function SimulationNotice({ what = 'This application' }: { what?: string }) {
  return (
    <aside aria-label="Simulation" data-simulation-notice=""
      className="border-b-2 border-dashed border-warn bg-surface px-4 py-2 text-[13px] text-ink">
      <strong>Simulation.</strong>{' '}
      {what} shows figures, lists and cases from a simulation engine, not this nation&apos;s records. It switches to real records when the institution&apos;s records are kept in the platform.
    </aside>
  );
}
