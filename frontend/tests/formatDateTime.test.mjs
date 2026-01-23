import { describe, it, expect } from '@jest/globals';

/**
 * formatDateTime from reviews.jsx and userReviews.jsx
 * Formats a date string to Croatian datetime format (DD.MM.YYYY HH:MM)
 */
function formatDateTime(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  } catch {
    return dateString;
  }
}

describe('formatDateTime()', () => {
  it('formats ISO datetime to DD.MM.YYYY HH:MM format', () => {
    const result = formatDateTime('2024-01-15T14:30:00Z');
    
    // Note: Result depends on timezone, so we check format structure
    expect(result).toMatch(/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/);
  });

  it('returns empty string for null input', () => {
    const result = formatDateTime(null);
    expect(result).toBe('');
  });

  it('returns empty string for undefined input', () => {
    const result = formatDateTime(undefined);
    expect(result).toBe('');
  });

  it('returns empty string for empty string input', () => {
    const result = formatDateTime('');
    expect(result).toBe('');
  });

  it('pads single-digit day with zero', () => {
    const result = formatDateTime('2024-01-05T10:30:00Z');
    
    expect(result).toMatch(/^05\./); // Day should be padded
  });

  it('pads single-digit month with zero', () => {
    const result = formatDateTime('2024-03-15T10:30:00Z');
    
    expect(result).toMatch(/^\d{2}\.03\./); // Month should be padded
  });

  it('pads hours and minutes with zero', () => {
    const result = formatDateTime('2024-01-15T09:05:00Z');
    
    expect(result).toMatch(/\d{2}:\d{2}$/);
  });

  it('returns "NaN" formatted string for invalid date', () => {
    const invalidDate = 'not-a-date';
    const result = formatDateTime(invalidDate);
    
    // new Date('not-a-date') creates an Invalid Date, which formats to NaN values
    expect(result).toBe('NaN.NaN.NaN NaN:NaN');
  });

  it('formats midnight time correctly', () => {
    const result = formatDateTime('2024-01-15T00:00:00Z');
    
    // Timezone-dependent, just check format structure
    expect(result).toMatch(/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/);
  });

  it('formats noon time correctly', () => {
    const result = formatDateTime('2024-01-15T12:00:00Z');
    
    expect(result).toMatch(/\d{2}:\d{2}$/);
  });

  it('formats end of day time correctly', () => {
    const result = formatDateTime('2024-01-15T23:59:00Z');
    
    expect(result).toMatch(/\d{2}:59$/);
  });

  it('handles leap year date', () => {
    const result = formatDateTime('2024-02-29T15:30:00Z');
    
    expect(result).toMatch(/29\.02\.2024/);
  });

  it('handles last day of year', () => {
    const result = formatDateTime('2024-12-31T12:00:00Z');
    
    expect(result).toMatch(/31\.12\.2024/);
  });

  it('handles first day of year', () => {
    const result = formatDateTime('2024-01-01T00:01:00Z');
    
    expect(result).toMatch(/01\.01\.2024/);
  });

  it('formats with timezone offset', () => {
    const result = formatDateTime('2024-06-15T14:30:00+02:00');
    
    expect(result).toMatch(/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/);
  });

  it('handles 0 for falsy check', () => {
    const result = formatDateTime(0);
    
    // 0 is falsy and the function checks !dateString, so it returns ''
    expect(result).toBe('');
  });

  it('pads single-digit hours', () => {
    const result = formatDateTime('2024-01-15T03:30:00Z');
    
    expect(result).toMatch(/\s0\d:\d{2}$/);
  });

  it('pads single-digit minutes', () => {
    const result = formatDateTime('2024-01-15T14:05:00Z');
    
    expect(result).toMatch(/\d{2}:05$/);
  });

  it('formats double-digit day correctly', () => {
    const result = formatDateTime('2024-01-25T10:30:00Z');
    
    expect(result).toMatch(/^25\./);
  });

  it('formats double-digit month correctly', () => {
    const result = formatDateTime('2024-11-15T10:30:00Z');
    
    expect(result).toMatch(/\.11\./);
  });

  it('handles very old date', () => {
    const result = formatDateTime('1990-05-20T08:15:00Z');
    
    expect(result).toMatch(/\.1990\s/);
  });

  it('handles far future date', () => {
    const result = formatDateTime('2099-12-31T12:00:00Z');
    
    expect(result).toMatch(/2099/);
  });
});
