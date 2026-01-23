import { describe, it, expect, beforeAll } from '@jest/globals';
import { E2E_CONFIG, loginUser } from './config.mjs';

/**
 * E2E Test: Real Search and Filter
 * Tests actual search/filter functionality against Django backend
 */

describe('E2E: Search and Filter', () => {
  let adminToken = null;

  beforeAll(async () => {
    const { email, password } = E2E_CONFIG.TEST_USERS.admin;
    const { accessToken } = await loginUser(email, password);
    adminToken = accessToken;
  }, E2E_CONFIG.TIMEOUT);

  it('should fetch all users without filters', async () => {
    const response = await fetch(
      `${E2E_CONFIG.BACKEND_URL}/api/admin/users/`,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.users).toBeDefined();
    expect(Array.isArray(data.users)).toBe(true);
    expect(data.users.length).toBeGreaterThan(0);
  });

  it('should filter users by role', async () => {
    const response = await fetch(
      `${E2E_CONFIG.BACKEND_URL}/api/admin/users/?role=PLAYER`,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.users).toBeDefined();
    
    // All returned users should have PLAYER role
    data.users.forEach(user => {
      expect(user.role).toBe('PLAYER');
    });
  });

  it('should search users by username', async () => {
    const searchTerm = 'test';
    const response = await fetch(
      `${E2E_CONFIG.BACKEND_URL}/api/admin/users/?search=${searchTerm}`,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.users).toBeDefined();
    
    // Results should contain search term in username or email
    data.users.forEach(user => {
      const matchFound = 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      expect(matchFound).toBe(true);
    });
  });

  it('should combine search and filter', async () => {
    const response = await fetch(
      `${E2E_CONFIG.BACKEND_URL}/api/admin/users/?search=test&role=CLUB`,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.users).toBeDefined();
    
    // Results should match both search term AND role filter
    data.users.forEach(user => {
      expect(user.role).toBe('CLUB');
      const matchFound = 
        user.username.toLowerCase().includes('test') ||
        user.email.toLowerCase().includes('test');
      expect(matchFound).toBe(true);
    });
  });

  it('should return empty array for non-existent search', async () => {
    const response = await fetch(
      `${E2E_CONFIG.BACKEND_URL}/api/admin/users/?search=nonexistentuser12345`,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.users).toBeDefined();
    expect(data.users.length).toBe(0);
  });
});
