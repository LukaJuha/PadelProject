/**
 * E2E Test Configuration
 * Configuration for end-to-end tests that connect to real Django backend
 */

export const E2E_CONFIG = {
  // Django test server URL
  BACKEND_URL: process.env.TEST_BACKEND_URL || 'http://localhost:8001',
  
  // Test timeout (longer for real API calls)
  TIMEOUT: 10000,
  
  // Test user credentials
  TEST_USERS: {
    admin: {
      email: 'admin@test.com',
      password: 'testpass123',
      username: 'testadmin'
    },
    player: {
      email: 'player@test.com',
      password: 'testpass123',
      username: 'testplayer'
    },
    club: {
      email: 'club@test.com',
      password: 'testpass123',
      username: 'testclub'
    }
  },
  
  // Retry configuration for flaky tests
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

/**
 * Helper function to wait for backend to be ready
 */
export async function waitForBackend(maxAttempts = 30, delayMs = 1000) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${E2E_CONFIG.BACKEND_URL}/api/health/`, {
        method: 'GET'
      });
      if (response.ok) {
        console.log('✓ Backend is ready');
        return true;
      }
    } catch (error) {
      // Backend not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  throw new Error('Backend did not become ready in time');
}

/**
 * Login helper for E2E tests
 */
export async function loginUser(email, password) {
  const response = await fetch(`${E2E_CONFIG.BACKEND_URL}/api/auth/login/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Login failed: ${error}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access,
    refreshToken: data.refresh,
    user: data.user
  };
}

/**
 * Cleanup helper - delete test data
 */
export async function cleanupTestData(accessToken) {
  // This would call a special cleanup endpoint on Django backend
  // that removes all test data
  try {
    await fetch(`${E2E_CONFIG.BACKEND_URL}/api/test/cleanup/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.warn('Cleanup failed:', error.message);
  }
}

/**
 * Create test field helper
 */
export async function createTestField(accessToken, fieldData) {
  const response = await fetch(`${E2E_CONFIG.BACKEND_URL}/api/fields/create/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(fieldData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create field: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Delete test field helper
 */
export async function deleteTestField(accessToken, fieldId) {
  const response = await fetch(`${E2E_CONFIG.BACKEND_URL}/api/fields/${fieldId}/delete/`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  return response.ok;
}
