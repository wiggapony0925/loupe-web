import { describe, expect, it } from 'vitest';
import { formatUsd, fromCents, toCents } from './money';

describe('money', () => {
  it('round-trips cents through decimal strings', () => {
    for (const cents of [0, 1, 99, 100, 123_456, -1, -50, -123_456]) {
      expect(toCents(fromCents(cents))).toBe(cents);
    }
  });

  it('parses formatted amounts', () => {
    expect(toCents('$1,234.56')).toBe(123_456);
    expect(toCents('1234.5')).toBe(123_450);
    expect(toCents('-12.00')).toBe(-1_200);
    expect(toCents(12.34)).toBe(1_234);
    expect(toCents('7')).toBe(700);
  });

  it('rejects garbage', () => {
    expect(() => toCents('twelve dollars')).toThrow();
    expect(() => toCents('')).toThrow();
  });

  it('formats for humans', () => {
    expect(formatUsd(123_456)).toBe('$1,234.56');
    expect(formatUsd(-1_200)).toBe('-$12.00');
  });
});
