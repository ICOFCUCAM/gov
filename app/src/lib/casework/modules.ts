// Domain modules that register effects and reference procedures with the
// workflow engine (design §6.2). Imported by the routes that need every
// effect known (approving a procedure, acting on a case). Each module adds
// itself here.
import '@/lib/civil/procedures';
import '@/lib/organisations/procedures';
import './referral';
import { installReferenceProcedures as installCivil } from '@/lib/civil/procedures';
import { installOrganisationProcedures } from '@/lib/organisations/procedures';
export { REFERENCE_PROCEDURES } from '@/lib/civil/procedures';
export { ORGANISATION_PROCEDURES } from '@/lib/organisations/procedures';

/** Draft every reference procedure (civil registration, organisations) the installation does not have yet. */
export function installReferenceProcedures(by: string): { drafted: string[]; present: string[] } {
  const a = installCivil(by), b = installOrganisationProcedures(by);
  return { drafted: [...a.drafted, ...b.drafted], present: [...a.present, ...b.present] };
}
