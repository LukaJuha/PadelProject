import { describe, it, expect } from '@jest/globals';

/**
 * getDaysRemaining from myActiveOffers.jsx
 * Calculates days remaining until expiration
 */
function getDaysRemaining(expiresAt) {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const daysRemaining = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  return daysRemaining;
}

describe('getDaysRemaining()', () => {
  it('calculates positive days remaining for future date', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    
    const result = getDaysRemaining(futureDate.toISOString());
    
    expect(result).toBeGreaterThanOrEqual(9);
    expect(result).toBeLessThanOrEqual(11); // Allow for timing differences
  });

  it('calculates negative days for past date', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    
    const result = getDaysRemaining(pastDate.toISOString());
    
    expect(result).toBeLessThanOrEqual(-4);
    expect(result).toBeGreaterThanOrEqual(-6);
  });

  it('returns approximately 0 for today', () => {
    const today = new Date();
    
    const result = getDaysRemaining(today.toISOString());
    
    expect(result).toBeGreaterThanOrEqual(-1);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('uses Math.ceil for fractional days', () => {
    const future = new Date();
    // Add 1.5 days
    future.setTime(future.getTime() + (1.5 * 24 * 60 * 60 * 1000));
    
    const result = getDaysRemaining(future.toISOString());
    
    // Math.ceil(1.5) = 2
    expect(result).toBe(2);
  });

  it('handles far future dates', () => {
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 1);
    
    const result = getDaysRemaining(farFuture.toISOString());
    
    expect(result).toBeGreaterThan(360);
    expect(result).toBeLessThan(370);
  });

  it('calculates 1 day remaining correctly', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const result = getDaysRemaining(tomorrow.toISOString());
    
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(2);
  });

  it('calculates exactly 7 days remaining', () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const result = getDaysRemaining(nextWeek.toISOString());
    
    expect(result).toBeGreaterThanOrEqual(6);
    expect(result).toBeLessThanOrEqual(8);
  });

  it('calculates 30 days remaining', () => {
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    
    const result = getDaysRemaining(nextMonth.toISOString());
    
    expect(result).toBeGreaterThanOrEqual(29);
    expect(result).toBeLessThanOrEqual(31);
  });

  it('handles date just passed (hours ago)', () => {
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - 5);
    
    const result = getDaysRemaining(hoursAgo.toISOString());
    
    // Should be 0 or -1 depending on timing
    expect(result).toBeGreaterThanOrEqual(-1);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('handles date just upcoming (hours ahead)', () => {
    const hoursAhead = new Date();
    hoursAhead.setHours(hoursAhead.getHours() + 5);
    
    const result = getDaysRemaining(hoursAhead.toISOString());
    
    // Should be 1 due to Math.ceil
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(2);
  });

  it('ceils 0.1 days to 1', () => {
    const future = new Date();
    // Add 0.1 days (2.4 hours)
    future.setTime(future.getTime() + (0.1 * 24 * 60 * 60 * 1000));
    
    const result = getDaysRemaining(future.toISOString());
    
    expect(result).toBe(1);
  });

  it('ceils 0.9 days to 1', () => {
    const future = new Date();
    // Add 0.9 days
    future.setTime(future.getTime() + (0.9 * 24 * 60 * 60 * 1000));
    
    const result = getDaysRemaining(future.toISOString());
    
    expect(result).toBe(1);
  });

  it('handles 2 years in future', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 2);
    
    const result = getDaysRemaining(future.toISOString());
    
    expect(result).toBeGreaterThan(720);
    expect(result).toBeLessThan(740);
  });

  it('handles very far past date', () => {
    const farPast = new Date();
    farPast.setFullYear(farPast.getFullYear() - 1);
    
    const result = getDaysRemaining(farPast.toISOString());
    
    expect(result).toBeLessThan(-360);
    expect(result).toBeGreaterThan(-370);
  });

  it('handles date with timezone offset', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const isoString = future.toISOString().replace('Z', '+02:00');
    
    const result = getDaysRemaining(isoString);
    
    expect(result).toBeGreaterThanOrEqual(4);
    expect(result).toBeLessThanOrEqual(6);
  });
});
