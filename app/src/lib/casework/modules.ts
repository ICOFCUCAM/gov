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
// Territory and infrastructure (plan I7): the land registry's dealings and disputes.
import '@/lib/land/procedures';
import '@/lib/building/procedures';
import '@/lib/housing/procedures';
// Local and regional government (plan I7): each local government's own procedures, adopted from templates on request.
import '@/lib/localgov/procedures';
import '@/lib/transport/procedures';
// Internal administration (plan I2): each institution's own procedures, drafted from templates on request.
import '@/lib/administration/procedures';
// The economic group (plan I5): budget and treasury, the Cabinet office, and procurement (each institution's own
// templates, drafted on request, and the review body's complaint procedure).
import '@/lib/finance/procedures';
import '@/lib/cabinet/procedures';
import '@/lib/procurement/procedures';
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
import { installLandProcedures } from '@/lib/land/procedures';
import { installBuildingProcedures } from '@/lib/building/procedures';
import { installHousingProcedures } from '@/lib/housing/procedures';
import { installTransportProcedures } from '@/lib/transport/procedures';
import { installFinanceProcedures } from '@/lib/finance/procedures';
import { installCabinetProcedures } from '@/lib/cabinet/procedures';
import { installProcurementReviewProcedures } from '@/lib/procurement/procedures';
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
export { LAND_PROCEDURES } from '@/lib/land/procedures';
export { BUILDING_PROCEDURES } from '@/lib/building/procedures';
export { HOUSING_PROCEDURES } from '@/lib/housing/procedures';
export { TRANSPORT_PROCEDURES } from '@/lib/transport/procedures';
export { FINANCE_PROCEDURES } from '@/lib/finance/procedures';
export { CABINET_PROCEDURES } from '@/lib/cabinet/procedures';
export { PROCUREMENT_PROCEDURES, REFERENCE_PROCUREMENT_COMPLAINT } from '@/lib/procurement/procedures';

/** Draft every reference procedure (civil registration, organisations, immigration, police intake, courts, tax, education, professions, health, customs, medicines and devices, public-health programmes, health complaints, independent oversight, land, building, housing and transport, budget and treasury, the Cabinet office, procurement review) the installation does not have yet. */
export function installReferenceProcedures(by: string): { drafted: string[]; present: string[] } {
  const all = [installCivil(by), installOrganisationProcedures(by), installImmigrationProcedures(by), installPoliceProcedures(by), installCourtProcedures(by), installTaxProcedures(by), installEducationProcedures(by), installProfessionProcedures(by), installHealthProcedures(by), installCustomsProcedures(by), installProductProcedures(by), installProgrammeProcedures(by), installComplaintProcedures(by), installOversightProcedures(by),
    // Plan step I7: territory and infrastructure.
    installLandProcedures(by), installBuildingProcedures(by), installHousingProcedures(by), installTransportProcedures(by),
    // Plan step I5: budget and treasury, the Cabinet office, the procurement review body (procurement itself: each institution's own templates).
    installFinanceProcedures(by), installCabinetProcedures(by), installProcurementReviewProcedures(by)];
  return { drafted: all.flatMap(x => x.drafted), present: all.flatMap(x => x.present) };
}
