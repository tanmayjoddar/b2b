import { z } from 'zod';
import {
  CertificateType,
  FactoryStatus,
  VerificationTier,
  VerificationMethod,
  VerificationResult,
} from '../enums/index.js';

export const CreateFactoryProfileSchema = z
  .object({
    legalName: z.string().min(2, 'Legal name is required').max(150).trim(),
    city: z.string().min(2, 'City is required').max(100).trim(),
    state: z.string().min(2, 'State is required').max(100).trim(),
    pincode: z.string().regex(/^[1-9][0-9]{5}$/, 'Invalid 6-digit Indian PIN code'),
    capacityNotes: z.string().max(1000).optional(),
    leadTimeDaysMin: z.number().int().positive().optional(),
    leadTimeDaysMax: z.number().int().positive().optional(),
    verticalId: z.string().optional(),
  })
  .strict();

export type CreateFactoryProfileDto = z.infer<typeof CreateFactoryProfileSchema>;

export const AddCapabilitySchema = z
  .object({
    verticalId: z.string(),
    productType: z.string().min(2).max(100).trim(),
    moqUnits: z.number().int().positive('MOQ must be greater than zero'),
    capacityUnitsPerMonth: z.number().int().positive('Capacity must be positive'),
    packagingOptions: z.array(z.string().min(1)).min(1, 'At least one packaging option required'),
    attributesJson: z.record(z.unknown()).default({}),
  })
  .strict();

export type AddCapabilityDto = z.infer<typeof AddCapabilitySchema>;

export const SubmitCertificateSchema = z
  .object({
    type: z.nativeEnum(CertificateType),
    number: z.string().min(2).max(100).trim(),
    issuer: z.string().min(2).max(100).trim(),
    validFrom: z.string().datetime(),
    validTo: z.string().datetime(),
    fileId: z.string().optional(),
  })
  .strict();

export type SubmitCertificateDto = z.infer<typeof SubmitCertificateSchema>;

export const AdminVerifyFactorySchema = z
  .object({
    tier: z.nativeEnum(VerificationTier),
    method: z.nativeEnum(VerificationMethod),
    result: z.nativeEnum(VerificationResult),
    evidenceFileId: z.string().optional(),
    notes: z.string().max(1000).optional(),
    expiresAt: z.string().datetime().optional(),
    newStatus: z.nativeEnum(FactoryStatus).default(FactoryStatus.ACTIVE),
  })
  .strict();

export type AdminVerifyFactoryDto = z.infer<typeof AdminVerifyFactorySchema>;

export const FactoryPublicProfileSchema = z.object({
  id: z.string(),
  legalName: z.string(),
  city: z.string(),
  state: z.string(),
  tier: z.nativeEnum(VerificationTier),
  status: z.nativeEnum(FactoryStatus),
  leadTimeDaysMin: z.number().nullable(),
  leadTimeDaysMax: z.number().nullable(),
  capabilities: z.array(
    z.object({
      productType: z.string(),
      moqUnits: z.number(),
      capacityUnitsPerMonth: z.number(),
      packagingOptions: z.array(z.string()),
    }),
  ),
  verifiedCertificates: z.array(
    z.object({
      type: z.nativeEnum(CertificateType),
      issuer: z.string(),
      validTo: z.date().or(z.string()),
    }),
  ),
});

export type FactoryPublicProfile = z.infer<typeof FactoryPublicProfileSchema>;
