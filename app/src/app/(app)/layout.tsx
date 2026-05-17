// Federated application route group. Independent of the platform command
// shell — each institutional application renders its own sovereign chrome.
// The `.sov` class carries the dark sovereign command palette so the whole
// federated shell (header, nav, posture/advisory bars) is cinematic dark
// edge-to-edge, consistent with the operational subsystems it hosts.
export default function FederatedAppLayout({ children }: { children: React.ReactNode }) {
  return <div className="sov min-h-screen bg-bg">{children}</div>;
}
