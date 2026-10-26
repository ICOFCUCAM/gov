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
import '@/lib/tax/procedures';
import '@/lib/education/procedures';
import '@/lib/professions/procedures';
import '@/lib/health/procedures';
import '@/lib/customs/procedures';
import '@/lib/health/products/procedures';
import '@/lib/health/programmes/procedures';
import '@/lib/health/complaints/procedures';
import '@/lib/oversight/procedures';
// Human services (plan step I6): identity, passports and travel documents, citizenship, labour, social protection.
import '@/lib/identity/procedures';
import '@/lib/passports/procedures';
import '@/lib/citizenship/procedures';
import '@/lib/labour/procedures';
import '@/lib/social/procedures';
// Internal administration (plan I2): each institution's own procedures, drafted from templates on request.
import '@/lib/administration/procedures';
// The decision guard: every decision rests on a named authority (lib/permits/decisions.ts).
import '@/lib/permits/decisions';
// Publication gates: a form takes submissions in production only once its release is approved (lib/forms/publication.ts).
import '@/lib/forms/publication';
// Dual control: the platform's two-official minimum, the country's rules, proposals that lapse.
import './dual-control-policy';
// Transitions (plan phase 6): caretaker restrictions the nation adopted, courts' rulings on cited provisions.
import '@/lib/transitions/guard';
import { installReferenceProcedures as installCivil } from '@/lib/civil/procedures';
import { installOrganisationProcedures } from '@/lib/organisations/procedures';
import { installImmigrationProcedures } from '@/lib/immigration/procedures';
import { installPoliceProcedures } from '@/lib/police/procedures';
import { installCourtProcedures } from '@/lib/courts/procedures';
import { installTaxProcedures } from '@/lib/tax/procedures';
import { installEducationProcedures } from '@/lib/education/procedures';
import { installProfessionProcedures } from '@/lib/professions/procedures';
import { installHealthProcedures } from '@/lib/health/procedures';
import { installCustomsProcedures } from '@/lib/customs/procedures';
import { installProductProcedures } from '@/lib/health/products/procedures';
import { installProgrammeProcedures } from '@/lib/health/programmes/procedures';
import { installComplaintProcedures } from '@/lib/health/complaints/procedures';
import { installOversightProcedures } from '@/lib/oversight/procedures';
import { installIdentityProcedures } from '@/lib/identity/procedures';
import { installPassportProcedures } from '@/lib/passports/procedures';
import { installCitizenshipProcedures } from '@/lib/citizenship/procedures';
import { installLabourProcedures } from '@/lib/labour/procedures';
import { installSocialProcedures } from '@/lib/social/procedures';
export { REFERENCE_PROCEDURES } from '@/lib/civil/procedures';
export { ORGANISATION_PROCEDURES } from '@/lib/organisations/procedures';
export { IMMIGRATION_PROCEDURES } from '@/lib/immigration/procedures';
export { POLICE_PROCEDURES } from '@/lib/police/procedures';
export { COURT_PROCEDURES } from '@/lib/courts/procedures';
export { TAX_PROCEDURES } from '@/lib/tax/procedures';
export { EDUCATION_PROCEDURES } from '@/lib/education/procedures';
export { PROFESSION_PROCEDURES } from '@/lib/professions/procedures';
export { HEALTH_PROCEDURES } from '@/lib/health/procedures';
export { CUSTOMS_PROCEDURES } from '@/lib/customs/procedures';
export { PRODUCT_PROCEDURES } from '@/lib/health/products/procedures';
export { PROGRAMME_PROCEDURES } from '@/lib/health/programmes/procedures';
export { COMPLAINT_PROCEDURES } from '@/lib/health/complaints/procedures';
export { INDEPENDENT_OVERSIGHT_PROCEDURES } from '@/lib/oversight/procedures';
export { IDENTITY_PROCEDURES } from '@/lib/identity/procedures';
export { PASSPORT_PROCEDURES } from '@/lib/passports/procedures';
export { CITIZENSHIP_PROCEDURES } from '@/lib/citizenship/procedures';
export { LABOUR_PROCEDURES } from '@/lib/labour/procedures';
export { SOCIAL_PROCEDURES } from '@/lib/social/procedures';

/** Draft every reference procedure (civil registration, organisations, immigration, police intake, courts, tax, education, professions, health, customs, medicines and devices, public-health programmes, health complaints, independent oversight, and since plan step I6 identity, passports, citizenship, labour and social protection) the installation does not have yet. */
export function installReferenceProcedures(by: string): { drafted: string[]; present: string[] } {
  const all = [installCivil(by), installOrganisationProcedures(by), installImmigrationProcedures(by), installPoliceProcedures(by), installCourtProcedures(by), installTaxProcedures(by), installEducationProcedures(by), installProfessionProcedures(by), installHealthProcedures(by), installCustomsProcedures(by), installProductProcedures(by), installProgrammeProcedures(by), installComplaintProcedures(by), installOversightProcedures(by),
    installIdentityProcedures(by), installPassportProcedures(by), installCitizenshipProcedures(by), installLabourProcedures(by), installSocialProcedures(by)];
  return { drafted: all.flatMap(x => x.drafted), present: all.flatMap(x => x.present) };
}
