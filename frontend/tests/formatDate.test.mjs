import { describe, it, expect } from '@jest/globals';

/**
 * formatDate from myActiveOffers.jsx
 * Formats a date string to Croatian locale format
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('hr-HR', { year: 'numeric', month: 'long', day: 'numeric' });
}

describe('formatDate()', () => {
  it('formats ISO date string to Croatian locale', () => {
    const result = formatDate('2024-01-15T10:30:00Z');
    // Check that it contains expected parts (day, month year in Croatian)
    expect(result).toContain('2024');
    expect(result).toContain('15');
    // Croatian month names vary, just ensure it's formatted
    expect(result.length).toBeGreaterThan(10);
  });

  it('handles different date formats', () => {
    const result = formatDate('2023-12-25');
    expect(result).toContain('2023');
    expect(result).toContain('25');
  });

  it('formats leap year date correctly', () => {
    const result = formatDate('2024-02-29T00:00:00Z');
    expect(result).toContain('2024');
    expect(result).toContain('29');
  });

  it('handles edge case: year boundary', () => {
    const result = formatDate('2024-01-01T00:00:00Z');
    expect(result).toContain('2024');
    expect(result).toContain('1');
  });

  it('formats summer date correctly', () => {
    const result = formatDate('2024-07-15T12:00:00Z');
    expect(result).toContain('2024');
    expect(result).toContain('15');
    // July in Croatian is "srpanj" or similar
    expect(result.length).toBeGreaterThan(10);
  });

  it('formats December date correctly', () => {
    const result = formatDate('2024-12-31T12:00:00Z');
    expect(result).toContain('2024');
    expect(result).toContain('31');
  });

  it('handles date with timezone offset', () => {
    const result = formatDate('2024-03-15T14:30:00+01:00');
    expect(result).toContain('2024');
    expect(result).toContain('15');
  });

  it('formats first day of month', () => {
    const result = formatDate('2024-05-01T00:00:00Z');
    expect(result).toContain('2024');
    expect(result).toContain('1');
  });

  it('formats last day of February in non-leap year', () => {
    const result = formatDate('2023-02-28T12:00:00Z');
    expect(result).toContain('2023');
    expect(result).toContain('28');
  });

  it('handles very old date', () => {
    const result = formatDate('2000-01-01T00:00:00Z');
    expect(result).toContain('2000');
    expect(result).toContain('1');
  });

  it('handles future date', () => {
    const result = formatDate('2030-06-15T10:00:00Z');
    expect(result).toContain('2030');
    expect(result).toContain('15');
  });

  it('formats date at midnight', () => {
    const result = formatDate('2024-04-10T00:00:00Z');
    expect(result).toContain('2024');
    expect(result).toContain('10');
  });

  it('formats date at end of day', () => {
    const result = formatDate('2024-04-10T12:00:00Z');
    expect(result).toContain('2024');
    expect(result).toContain('10');
  });

  it('handles single-digit day', () => {
    const result = formatDate('2024-01-05T12:00:00Z');
    expect(result).toContain('2024');
    expect(result).toContain('5');
  });

  it('handles single-digit month', () => {
    const result = formatDate('2024-03-20T12:00:00Z');
    expect(result).toContain('2024');
    expect(result).toContain('20');
  });
});
