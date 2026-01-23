import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { E2E_CONFIG, loginUser, cleanupTestData } from './config.mjs';

/**
 * E2E Test: Real Authentication Flow
 * Tests actual authentication against Django backend
 * 
 * Prerequisites:
 * - Django test server running on port 8001
 * - Test database with test users created
 */

describe('E2E: Authentication Flow', () => {
  let adminToken = null;

  beforeAll(async () => {
    // Give tests more time for real API calls
  }, E2E_CONFIG.TIMEOUT);

  afterAll(async () => {
    // Cleanup test data if we have admin token
    if (adminToken) {
      await cleanupTestData(adminToken);
    }
  });

  it('should login with valid admin credentials', async () => {
    const { email, password } = E2E_CONFIG.TEST_USERS.admin;
    
    const result = await loginUser(email, password);

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user).toBeTruthy();
    expect(result.user.role).toBe('ADMIN');

    // Save token for cleanup
    adminToken = result.accessToken;
  });

  it('should login with valid player credentials', async () => {
    const { email, password } = E2E_CONFIG.TEST_USERS.player;
    
    const result = await loginUser(email, password);

    expect(result.accessToken).toBeTruthy();
    expect(result.user.role).toBe('PLAYER');
  });

  it('should login with valid club credentials', async () => {
    const { email, password } = E2E_CONFIG.TEST_USERS.club;
    
    const result = await loginUser(email, password);

    expect(result.accessToken).toBeTruthy();
    expect(result.user.role).toBe('CLUB');
  });

  it('should reject login with invalid credentials', async () => {
    await expect(
      loginUser('invalid@test.com', 'wrongpassword')
    ).rejects.toThrow();
  });

  it('should access protected resource with valid token', async () => {
    const { email, password } = E2E_CONFIG.TEST_USERS.admin;
    const { accessToken } = await loginUser(email, password);

    const response = await fetch(`${E2E_CONFIG.BACKEND_URL}/api/admin/users/`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.users).toBeDefined();
    expect(Array.isArray(data.users)).toBe(true);
  });

  it('should reject access to protected resource without token', async () => {
    const response = await fetch(`${E2E_CONFIG.BACKEND_URL}/api/admin/users/`);

    expect(response.ok).toBe(false);
    expect(response.status).toBe(401);
  });

  it('should reject access to protected resource with invalid token', async () => {
    const response = await fetch(`${E2E_CONFIG.BACKEND_URL}/api/admin/users/`, {
      headers: {
        'Authorization': 'Bearer invalid-token-12345'
      }
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(401);
  });
});
