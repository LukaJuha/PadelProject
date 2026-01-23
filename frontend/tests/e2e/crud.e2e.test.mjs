import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { E2E_CONFIG, loginUser, createTestField, deleteTestField } from './config.mjs';

/**
 * E2E Test: Real CRUD Operations
 * Tests actual CRUD operations against Django backend
 */

describe('E2E: CRUD Operations', () => {
  let clubToken = null;
  let createdFieldId = null;

  beforeAll(async () => {
    // Login as club to create fields
    const { email, password } = E2E_CONFIG.TEST_USERS.club;
    const { accessToken } = await loginUser(email, password);
    clubToken = accessToken;
  }, E2E_CONFIG.TIMEOUT);

  afterAll(async () => {
    // Cleanup: delete created field
    if (clubToken && createdFieldId) {
      await deleteTestField(clubToken, createdFieldId);
    }
  });

  it('should CREATE a new field', async () => {
    const fieldData = {
      name: 'E2E Test Field',
      floor_type: 'HARDWOOD',
      size: 'DOUBLE',
      location: 'INSIDE',
      ceiling_height: 300,
      lighting: true
    };

    const result = await createTestField(clubToken, fieldData);

    expect(result.field).toBeDefined();
    expect(result.field.id).toBeTruthy();
    expect(result.field.name).toBe('E2E Test Field');
    expect(result.field.floor_type).toBe('HARDWOOD');

    // Save for other tests
    createdFieldId = result.field.id;
  });

  it('should READ the created field', async () => {
    expect(createdFieldId).toBeTruthy();

    const response = await fetch(
      `${E2E_CONFIG.BACKEND_URL}/api/fields/${createdFieldId}/`,
      {
        headers: {
          'Authorization': `Bearer ${clubToken}`
        }
      }
    );

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.field.id).toBe(createdFieldId);
    expect(data.field.name).toBe('E2E Test Field');
  });

  it('should UPDATE the created field', async () => {
    expect(createdFieldId).toBeTruthy();

    const updateData = {
      name: 'Updated E2E Field',
      floor_type: 'GRASS',
      size: 'SINGLE',
      location: 'OUTSIDE',
      ceiling_height: null,
      lighting: false
    };

    const response = await fetch(
      `${E2E_CONFIG.BACKEND_URL}/api/fields/${createdFieldId}/update/`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${clubToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      }
    );

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.field.name).toBe('Updated E2E Field');
    expect(data.field.floor_type).toBe('GRASS');
    expect(data.field.size).toBe('SINGLE');
  });

  it('should DELETE the created field', async () => {
    expect(createdFieldId).toBeTruthy();

    const response = await fetch(
      `${E2E_CONFIG.BACKEND_URL}/api/fields/${createdFieldId}/delete/`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${clubToken}`
        }
      }
    );

    expect(response.ok).toBe(true);

    // Verify deletion - should return 404
    const verifyResponse = await fetch(
      `${E2E_CONFIG.BACKEND_URL}/api/fields/${createdFieldId}/`,
      {
        headers: {
          'Authorization': `Bearer ${clubToken}`
        }
      }
    );

    expect(verifyResponse.ok).toBe(false);
    expect(verifyResponse.status).toBe(404);

    // Clear ID so afterAll doesn't try to delete again
    createdFieldId = null;
  });
});
