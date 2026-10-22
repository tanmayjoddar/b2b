import { describe, it, expect } from 'vitest';
import { MoneyPaiseSchema, formatPaiseToINR, rupeesToPaise } from './common.schema.js';
import { HealthResponseSchema } from './health.schema.js';

describe('MoneyPaiseSchema and helpers', () => {
  it('accepts integer paise', () => {
    expect(MoneyPaiseSchema.safeParse(1000).success).toBe(true);
    expect(MoneyPaiseSchema.safeParse(0).success).toBe(true);
  });

  it('rejects floating point amounts', () => {
    const result = MoneyPaiseSchema.safeParse(10.5);
    expect(result.success).toBe(false);
  });

  it('rejects negative amounts', () => {
    const result = MoneyPaiseSchema.safeParse(-500);
    expect(result.success).toBe(false);
  });

  it('converts rupees to paise accurately', () => {
    expect(rupeesToPaise(100)).toBe(10000);
    expect(rupeesToPaise(12.5)).toBe(1250);
  });

  it('formats paise to INR currency string properly', () => {
    const formatted = formatPaiseToINR(150000); // ₹1,500.00
    expect(formatted).toContain('1,500');
  });
});

describe('HealthResponseSchema', () => {
  it('validates a valid health response', () => {
    const valid = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'factorymatch-api',
      version: '0.1.0',
      uptimeSeconds: 120,
    };
    expect(HealthResponseSchema.safeParse(valid).success).toBe(true);
  });

  it('fails if timestamp is not an ISO datetime', () => {
    const invalid = {
      status: 'ok',
      timestamp: 'invalid-date',
      service: 'factorymatch-api',
      version: '0.1.0',
      uptimeSeconds: 120,
    };
    expect(HealthResponseSchema.safeParse(invalid).success).toBe(false);
  });
});
