import {
  CertificateStatus,
  CertificateType,
  FactoryPublicProfile,
  FactoryStatus,
  Role,
} from '@factorymatch/shared';

export interface PolicyUser {
  id: string;
  role: Role;
}

export interface PolicyFactory {
  id?: string;
  ownerUserId: string;
  status: FactoryStatus | string;
}

/**
 * Authorization policy: can user view factory profile?
 * - Brands: can view public active factories only.
 * - Factory: can view own factory only.
 * - Admin: can view all factories in any status.
 */
export function canViewFactory(
  user: PolicyUser | null | undefined,
  factory: PolicyFactory | null | undefined,
): boolean {
  if (!user || !factory) {
    return false;
  }

  if (user.role === Role.ADMIN) {
    return true;
  }

  if (user.role === Role.FACTORY) {
    return factory.ownerUserId === user.id;
  }

  if (user.role === Role.BRAND) {
    return factory.status === FactoryStatus.ACTIVE;
  }

  return false;
}

/**
 * Authorization policy: can user edit factory profile/capabilities/certificates?
 * - Owner factory user or Admin only.
 */
export function canEditFactory(
  user: PolicyUser | null | undefined,
  factory: Pick<PolicyFactory, 'ownerUserId'> | null | undefined,
): boolean {
  if (!user || !factory) {
    return false;
  }

  if (user.role === Role.ADMIN) {
    return true;
  }

  if (user.role === Role.FACTORY) {
    return factory.ownerUserId === user.id;
  }

  return false;
}

/**
 * Authorization policy: can user perform factory verification?
 * - Admin only.
 */
export function canVerifyFactory(user: { role: Role } | null | undefined): boolean {
  if (!user) {
    return false;
  }

  return user.role === Role.ADMIN;
}

/**
 * Authorization policy: can user view private documents and sensitive information?
 * - Owner factory user or Admin only. Brands cannot view private docs.
 */
export function canViewPrivateDocs(
  user: PolicyUser | null | undefined,
  factory: Pick<PolicyFactory, 'ownerUserId'> | null | undefined,
): boolean {
  if (!user || !factory) {
    return false;
  }

  if (user.role === Role.ADMIN) {
    return true;
  }

  if (user.role === Role.FACTORY) {
    return factory.ownerUserId === user.id;
  }

  return false;
}

/**
 * Maps a full factory domain model to its public projection.
 * Filters out private fields (internal PIN code, capacity notes, unverified certs, cert numbers, file IDs).
 */
export function toFactoryPublicProfile(factory: any): FactoryPublicProfile {
  return {
    id: factory.id,
    legalName: factory.legalName,
    city: factory.city,
    state: factory.state,
    tier: factory.tier,
    status: factory.status,
    leadTimeDaysMin: factory.leadTimeDaysMin ?? null,
    leadTimeDaysMax: factory.leadTimeDaysMax ?? null,
    capabilities: (factory.capabilities || []).map((cap: any) => ({
      productType: cap.productType,
      moqUnits: cap.moqUnits,
      capacityUnitsPerMonth: cap.capacityUnitsPerMonth,
      packagingOptions: cap.packagingOptions,
    })),
    verifiedCertificates: (factory.certificates || [])
      .filter((cert: any) => cert.status === CertificateStatus.VERIFIED)
      .map((cert: any) => ({
        type: cert.type as CertificateType,
        issuer: cert.issuer,
        validTo: cert.validTo instanceof Date ? cert.validTo.toISOString() : cert.validTo,
      })),
  };
}
