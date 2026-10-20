// Domain modules that register effects and reference procedures with the
// workflow engine (design §6.2). Imported by the routes that need every
// effect known (approving a procedure, acting on a case). Each module adds
// itself here.
import '@/lib/civil/procedures';
export { REFERENCE_PROCEDURES, installReferenceProcedures } from '@/lib/civil/procedures';
