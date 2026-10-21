// The rule the public product check must meet (owner's direction of 21
// October 2026, docs/forms-catalogue/DIRECTION-2026-10-21-HEALTH-INTEGRATION.md:
// "a public product-check service should expose only approved, publishable
// product information. It should not expose confidential regulatory
// submissions, protected personal data or unpublished enforcement records").
//
// There is no product register yet (docs/HEALTH_I4_DEPENDENCIES.md, the
// product register; integration register 20.15): this file defines the shape
// of a product record as the regulator will keep it and the one function a
// public check, a list, an export, the twin or the product-status exchange
// service may pass it through, publicProductView(). It never returns:
//
//   - an attribute the nation's public information classification does not
//     list (HLT-MED-006 decision.public_disclosure, shipped empty), or a
//     classification that is not approved;
//   - an attribute not recorded by an approved decision (a draft, an
//     application's claim, an assessment in progress);
//   - an attribute whose data class is anything but public: commercially
//     confidential dossier content, personal data, restricted material, even
//     where the classification lists it;
//   - the kinds that are never public whatever anyone lists (the dossier, the
//     assessment, inspection findings, persons, grounds, reports);
//   - an enforcement record (suspension, withdrawal, recall, safety notice)
//     that is not both approved and published, and of a published one
//     anything but its kind, date and public notice (never its grounds).
//
// A status comes only from the regulator's record (Part 6 §5.2, closing
// rule): the view says so, with the record's version, and nothing is inferred
// from an import, inventory or procurement record. Pure.

/** Data classes of a product record's attributes, strictest last. */
export type ProductDataClass = 'public' | 'administrative' | 'commercial_confidential' | 'personal' | 'restricted';

/** What a product record holds (Part 6 §5.2: identifier and classification, holder, name and presentation, sites, dossier, assessment, status, history, legal basis, public classification). */
export type ProductAttributeKey =
  | 'name' | 'strength' | 'dosageForm' | 'route' | 'therapeuticClass' | 'deviceClass' | 'deviceNomenclature'
  | 'holder' | 'authorisationNumber' | 'status' | 'authorisedOn' | 'validUntil' | 'conditions' | 'legalSupplyCategory'
  | 'activeIngredients' | 'composition' | 'manufacturingSites' | 'packagingAndLabelling'
  | 'dossier' | 'assessmentReport' | 'inspectionFindings' | 'qualifiedPerson' | 'contactPerson' | 'legalBasis';

/** Never public, whatever a classification lists or a record's class says: regulatory submissions and their assessment, findings, and persons. */
export const NEVER_PUBLIC = ['composition', 'dossier', 'assessmentReport', 'inspectionFindings', 'qualifiedPerson', 'contactPerson'] as const satisfies readonly ProductAttributeKey[];

export interface ProductAttribute<T = unknown> {
  value: T;
  class: ProductDataClass;
  /** The approved decision that recorded it (a sealed decision of the regulator); absent for a draft or an applicant's claim. */
  approvedBy?: { decision: string; at: string };
}

/** An enforcement or safety record on a product: a suspension, withdrawal, recall or safety notice. */
export interface ProductEnforcement {
  id: string;
  kind: 'suspension' | 'withdrawal' | 'recall' | 'safety_notice';
  at: string;
  /** Decided by an authorised official (the case engine's sealed decision). */
  approvedBy?: { decision: string; at: string };
  /** Published by the regulator (a notice released for the public), with when. */
  publishedAt?: string;
  /** The wording released to the public. */
  publicNotice?: string;
  /** The grounds, evidence and reporters: restricted, never public. */
  grounds?: string;
  reporters?: { name: string; contact?: string }[];
}

/** A product as the regulator's register will keep it (no register is built yet). */
export interface ProductRecord {
  productId: string;
  kind: 'medicine' | 'device';
  /** The record's version (every change a new version, earlier ones kept). */
  version: number;
  attributes: Partial<Record<ProductAttributeKey, ProductAttribute>>;
  enforcement: ProductEnforcement[];
}

/**
 * The nation's public information classification (Part 6 §5.2 "public
 * information classification and permitted disclosures"; HLT-MED-006
 * `decision.public_disclosure`): which attributes may be published. Ships
 * empty and unapproved; approved by two officials when it exists.
 */
export interface PublicClassification { fields: ProductAttributeKey[]; approved: boolean; version?: number }

export const EMPTY_CLASSIFICATION: PublicClassification = { fields: [], approved: false };

/** What a public product check may answer: nothing else exists in this type. */
export interface PublicProduct {
  productId: string;
  kind: ProductRecord['kind'];
  /** Only attributes both approved and marked publishable, each public. */
  fields: Partial<Record<Exclude<ProductAttributeKey, (typeof NEVER_PUBLIC)[number]>, unknown>>;
  /** Only enforcement records both approved and published: kind, date and the public notice. */
  notices: { kind: ProductEnforcement['kind']; at: string; notice: string }[];
  /** Where the answer comes from: the competent regulator's record, never an import, inventory or procurement record. */
  source: { record: 'regulator'; version: number; classificationVersion?: number };
}

/** The one shape a product record leaves the regulator in (public check, lists, exports, the twin, the product-status exchange service). */
export function publicProductView(r: ProductRecord, classification: PublicClassification = EMPTY_CLASSIFICATION): PublicProduct {
  const fields: PublicProduct['fields'] = {};
  if (classification.approved) {
    for (const key of classification.fields) {
      if ((NEVER_PUBLIC as readonly string[]).includes(key)) continue;
      const a = r.attributes[key];
      if (!a || !a.approvedBy || a.class !== 'public') continue;
      (fields as Record<string, unknown>)[key] = structuredClone(a.value);
    }
  }
  const notices = r.enforcement
    .filter(e => e.approvedBy && e.publishedAt && typeof e.publicNotice === 'string' && e.publicNotice.trim())
    .map(e => ({ kind: e.kind, at: e.publishedAt!, notice: e.publicNotice! }));
  return { productId: r.productId, kind: r.kind, fields, notices, source: { record: 'regulator', version: r.version, ...(classification.approved && classification.version ? { classificationVersion: classification.version } : {}) } };
}
