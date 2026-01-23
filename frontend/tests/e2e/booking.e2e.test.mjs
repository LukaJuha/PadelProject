import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { E2E_CONFIG, loginUser, createTestField } from './config.mjs';

/**
 * E2E Test: Real Booking Flow
 * Tests actual booking/reservation flow against Django backend
 */

describe('E2E: Booking Flow', () => {

  let clubToken = null;
  let playerToken = null;
  let testFieldId = null;
  let testBookingId = null;
  let testReservationId = null;

  beforeAll(async () => {
    // Login as club
    const clubCreds = E2E_CONFIG.TEST_USERS.club;
    const clubResult = await loginUser(clubCreds.email, clubCreds.password);
    clubToken = clubResult.accessToken;

    // Login as player
    const playerCreds = E2E_CONFIG.TEST_USERS.player;
    const playerResult = await loginUser(playerCreds.email, playerCreds.password);
    playerToken = playerResult.accessToken;

    // Create a test field for bookings
    const fieldData = {
      name: 'Booking Test Field',
      floor_type: 'HARDWOOD',
      size: 'DOUBLE',
      location: 'INSIDE',
      ceiling_height: 300,
      lighting: true
    };
    const fieldResult = await createTestField(clubToken, fieldData);
    testFieldId = fieldResult.field.id;
  }, E2E_CONFIG.TIMEOUT);

  afterAll(async () => {
    // Cleanup: delete reservation, booking, and field
    if (playerToken && testReservationId) {
      try {
        await fetch(
          `${E2E_CONFIG.BACKEND_URL}/api/reservations/${testReservationId}/`,
          {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${playerToken}` }
          }
        );
      } catch (e) { /* ignore */ }
    }

    if (clubToken && testBookingId) {
      try {
        await fetch(
          `${E2E_CONFIG.BACKEND_URL}/api/fields/${testFieldId}/bookings/${testBookingId}/delete/`,
          {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${clubToken}` }
          }
        );
      } catch (e) { /* ignore */ }
    }

    if (clubToken && testFieldId) {
      try {
        await fetch(
          `${E2E_CONFIG.BACKEND_URL}/api/fields/${testFieldId}/delete/`,
          {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${clubToken}` }
          }
        );
      } catch (e) { /* ignore */ }
    }
  });

  it('should create a booking for the field', async () => {
    const bookingData = {
      field: testFieldId,
      title: 'E2E Test Booking',
      day_of_week: 3, // Wednesday
      start_time: '18:00:00',
      end_time: '20:00:00',
      price: 50.00,
      has_reservation: false
    };

    const response = await fetch(
      `${E2E_CONFIG.BACKEND_URL}/api/fields/${testFieldId}/bookings/create/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clubToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      }
    );

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.booking).toBeDefined();
    expect(data.booking.id).toBeTruthy();
    
    testBookingId = data.booking.id;
  });

  it('should fetch available bookings for a field', async () => {
    const response = await fetch(
      `${E2E_CONFIG.BACKEND_URL}/api/fields/${testFieldId}/bookings/public/`,
      {
        headers: {
          'Authorization': `Bearer ${playerToken}`
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Fetch bookings failed: ${response.status} - ${errorText}`);
    }

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(Array.isArray(data.bookings)).toBe(true);
    
    // Should include our test booking
    const ourBooking = data.bookings.find(b => b.id === testBookingId);
    expect(ourBooking).toBeDefined();
    expect(ourBooking.title).toBe('E2E Test Booking');
  });

  it('should create a reservation for the booking', async () => {
    // Calculate next Wednesday
    const now = new Date();
    const daysUntilWednesday = (3 - now.getDay() + 7) % 7 || 7;
    const nextWednesday = new Date(now);
    nextWednesday.setDate(now.getDate() + daysUntilWednesday);
    const bookingDate = nextWednesday.toISOString().split('T')[0];

    const reservationData = {
      booking_id: testBookingId,
      date: bookingDate,
      payment_method: 'IN_PERSON'
    };

    console.log('Creating reservation with data:', reservationData);

    const response = await fetch(
      `${E2E_CONFIG.BACKEND_URL}/api/fields/${testFieldId}/reserve/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${playerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reservationData)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Create reservation failed: ${response.status} - ${errorText}`);
    }

    expect(response.ok).toBe(true);
    const data = await response.json();
    console.log('Reservation created:', data);
    expect(data.reservation).toBeDefined();
    expect(data.reservation.id).toBeTruthy();
    expect(data.reservation.payment_status).toBeDefined();
    
    testReservationId = data.reservation.id;
  }, 10000);

  it('should fetch player reservations', async () => {
    const response = await fetch(
      `${E2E_CONFIG.BACKEND_URL}/api/reservations/`,
      {
        headers: {
          'Authorization': `Bearer ${playerToken}`
        }
      }
    );

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(Array.isArray(data.reservations)).toBe(true);
    
    // Should include our test reservation
    const ourReservation = data.reservations.find(r => r.id === testReservationId);
    expect(ourReservation).toBeDefined();
  });
});
