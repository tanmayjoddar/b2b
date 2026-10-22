export const CURRENCY = 'INR' as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const AUTH_ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
export const AUTH_REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
export const OTP_EXPIRY_SECONDS = 5 * 60; // 5 minutes
export const OTP_MAX_ATTEMPTS = 5;

export const LAUNCH_VERTICAL = {
  id: 'vertical-snacks-nutrition',
  slug: 'snacks-nutrition',
  name: 'Snacks & Nutrition',
  description: 'Protein chips, nutritional bars, roasted seeds & granola',
} as const;
