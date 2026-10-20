// Domain modules that register effects and reference procedures with the
// workflow engine (design §6.2). Imported by the routes that need every
// effect known (approving a procedure, acting on a case). Each module adds
// itself here.
import '@/lib/civil/procedures';
import '@/lib/organisations/procedures';
import './referral';
import '@/lib/immigration/procedures';
import '@/lib/police/procedures';
import '@/lib/courts/procedures';
import { installReferenceProcedures as installCivil } from '@/lib/civil/procedures';
import { installOrganisationProcedures } from '@/lib/organisations/procedures';
import { installImmigrationProcedures } from '@/lib/immigration/procedures';
import { installPoliceProcedures } from '@/lib/police/procedures';
import { installCourtProcedures } from '@/lib/courts/procedures';
export { REFERENCE_PROCEDURES } from '@/lib/civil/procedures';
export { ORGANISATION_PROCEDURES } from '@/lib/organisations/procedures';
export { IMMIGRATION_PROCEDURES } from '@/lib/immigration/procedures';
export { POLICE_PROCEDURES } from '@/lib/police/procedures';
export { COURT_PROCEDURES } from '@/lib/courts/procedures';

/** Draft every reference procedure (civil registration, organisations, immigration, police intake, courts) the installation does not have yet. */
export function installReferenceProcedures(by: string): { drafted: string[]; present: string[] } {
  const all = [installCivil(by), installOrganisationProcedures(by), installImmigrationProcedures(by), installPoliceProcedures(by), installCourtProcedures(by)];
  return { drafted: all.flatMap(x => x.drafted), present: all.flatMap(x => x.present) };
}
