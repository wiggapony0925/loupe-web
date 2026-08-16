import { describe, expect, it } from 'vitest';
import { merchantSimilarity, plaidAmountToCents } from './transactionMatcher';

describe('merchantSimilarity', () => {
  it('is 1 for identical normalized merchants', () => {
    expect(merchantSimilarity('STARBUCKS #0921', 'Starbucks')).toBe(1);
  });

  it('handles processor prefixes vs clean Plaid names', () => {
    expect(merchantSimilarity('SQ *BLUE BOTTLE', 'Blue Bottle Coffee')).toBeGreaterThanOrEqual(0.5);
  });

  it('scores unrelated merchants low', () => {
    expect(merchantSimilarity('DELTA AIR LINES', 'WHOLE FOODS')).toBeLessThan(0.35);
  });

  it('scores containment high', () => {
    expect(merchantSimilarity('DOORDASH*SUBWAY', 'DoorDash')).toBeGreaterThanOrEqual(0.5);
  });
});

describe('plaidAmountToCents', () => {
  it('survives float representation', () => {
    expect(plaidAmountToCents(19.99)).toBe(1_999);
    expect(plaidAmountToCents(0.1 + 0.2)).toBe(30);
    expect(plaidAmountToCents(-45)).toBe(-4_500);
  });
});
