import { describe, it, expect } from 'vitest';
import { LAUNCH_VERTICAL } from '@factorymatch/shared';

describe('Web App Baseline', () => {
  it('correctly loads launch vertical configuration', () => {
    expect(LAUNCH_VERTICAL.slug).toBe('snacks-nutrition');
    expect(LAUNCH_VERTICAL.name).toBe('Snacks & Nutrition');
  });
});
