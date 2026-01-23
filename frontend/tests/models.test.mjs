import { describe, it, expect } from '@jest/globals';
import { User } from '../src/models/User.js';
import { Player } from '../src/models/Player.js';
import { Field } from '../src/models/Field.js';
import { Booking } from '../src/models/Booking.js';
import { Reservation } from '../src/models/Reservation.js';
import { Club } from '../src/models/Club.js';
import { Admin } from '../src/models/Admin.js';
import { Offer } from '../src/models/Offer.js';

describe('Model Classes', () => {
  describe('User', () => {
    describe('constructor()', () => {
      it('creates user with all properties', () => {
        const user = new User({
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          role: 'PLAYER',
          lastLogin: '2024-01-01T12:00:00Z',
          isSuperuser: false,
          profile: { firstName: 'John' }
        });

        expect(user.id).toBe(1);
        expect(user.username).toBe('testuser');
        expect(user.email).toBe('test@example.com');
        expect(user.role).toBe('PLAYER');
      });

      it('creates user with empty data object', () => {
        const user = new User();
        
        expect(user.id).toBeUndefined();
        expect(user.username).toBeUndefined();
        expect(user.email).toBeUndefined();
      });

      it('creates user with partial data', () => {
        const user = new User({ username: 'partial' });
        
        expect(user.username).toBe('partial');
        expect(user.email).toBeUndefined();
      });
    });

    describe('fromAPI()', () => {
      it('converts snake_case API data to camelCase', () => {
        const apiData = {
          id: 42,
          username: 'apiuser',
          email: 'api@example.com',
          role: 'CLUB',
          last_login: '2024-01-15T10:30:00Z',
          is_superuser: true,
          profile: null
        };

        const user = User.fromAPI(apiData);

        expect(user.id).toBe(42);
        expect(user.lastLogin).toBe('2024-01-15T10:30:00Z');
        expect(user.isSuperuser).toBe(true);
      });

      it('handles missing optional fields', () => {
        const apiData = {
          id: 1,
          username: 'minimal',
          email: 'min@example.com',
          role: 'PLAYER'
        };

        const user = User.fromAPI(apiData);

        expect(user.username).toBe('minimal');
        expect(user.lastLogin).toBeUndefined();
        expect(user.profile).toBeUndefined();
      });
    });

    describe('toAPI()', () => {
      it('converts camelCase to snake_case for API', () => {
        const user = new User({
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          role: 'ADMIN',
          lastLogin: '2024-01-01',
          isSuperuser: true
        });

        const apiData = user.toAPI();

        expect(apiData.username).toBe('testuser');
        expect(apiData.email).toBe('test@example.com');
        expect(apiData.role).toBe('ADMIN');
        expect(apiData.last_login).toBeUndefined(); // toAPI only includes username, email, role
      });
    });

    describe('static constants', () => {
      it('has all role types', () => {
        expect(User.ROLES.PLAYER).toBe('PLAYER');
        expect(User.ROLES.CLUB).toBe('CLUB');
        expect(User.ROLES.ADMIN).toBe('ADMIN');
      });

      it('has Croatian translations for roles', () => {
        expect(User.ROLES_HR.PLAYER).toBe('Igrač');
        expect(User.ROLES_HR.CLUB).toBe('Klub');
        expect(User.ROLES_HR.ADMIN).toBe('Administrator');
      });
    });
  });

  describe('Player', () => {
    describe('fromAPI()', () => {
      it('converts snake_case to camelCase', () => {
        const apiData = {
          userid: 5,
          first_name: 'John',
          last_name: 'Doe',
          phone_number: '+1234567890',
          skill_level: 'INTERMEDIATE',
          preferred_dow: 3,
          preferred_time: '18:00'
        };

        const player = Player.fromAPI(apiData);

        expect(player.userId).toBe(5);
        expect(player.firstName).toBe('John');
        expect(player.lastName).toBe('Doe');
        expect(player.phoneNumber).toBe('+1234567890');
        expect(player.skillLevel).toBe('INTERMEDIATE');
        expect(player.preferredDow).toBe(3);
        expect(player.preferredTime).toBe('18:00');
      });

      it('handles camelCase input (already converted)', () => {
        const apiData = {
          userId: 10,
          firstName: 'Jane',
          lastName: 'Smith',
          phoneNumber: '555-0100',
          skillLevel: 'ADVANCED'
        };

        const player = Player.fromAPI(apiData);

        expect(player.userId).toBe(10);
        expect(player.firstName).toBe('Jane');
      });
    });

    describe('toAPI()', () => {
      it('converts camelCase to snake_case', () => {
        const player = new Player({
          userId: 1,
          firstName: 'Test',
          lastName: 'Player',
          phoneNumber: '123456',
          skillLevel: 'BEGINNER',
          preferredDow: 5,
          preferredTime: '14:00'
        });

        const apiData = player.toAPI();

        expect(apiData.first_name).toBe('Test');
        expect(apiData.last_name).toBe('Player');
        expect(apiData.phone_number).toBe('123456');
        expect(apiData.skill_level).toBe('BEGINNER');
        expect(apiData.preferred_dow).toBe(5);
        expect(apiData.preferred_time).toBe('14:00');
      });
    });

    describe('skill levels', () => {
      it('has all skill level constants', () => {
        expect(Player.SKILL_LEVELS.BEGINNER).toBe('BEGINNER');
        expect(Player.SKILL_LEVELS.INTERMEDIATE).toBe('INTERMEDIATE');
        expect(Player.SKILL_LEVELS.ADVANCED).toBe('ADVANCED');
        expect(Player.SKILL_LEVELS.PROFESSIONAL).toBe('PROFESSIONAL');
      });

      it('has Croatian translations', () => {
        expect(Player.SKILL_LEVELS_HR.BEGINNER).toBe('Početnik');
        expect(Player.SKILL_LEVELS_HR.INTERMEDIATE).toBe('Srednji');
        expect(Player.SKILL_LEVELS_HR.ADVANCED).toBe('Napredni');
        expect(Player.SKILL_LEVELS_HR.PROFESSIONAL).toBe('Profesionalac');
      });
    });
  });

  describe('Field', () => {
    describe('fromAPI()', () => {
      it('converts snake_case to camelCase', () => {
        const apiData = {
          id: 1,
          clubid: 10,
          clubName: 'Test Club',
          name: 'Court A',
          floor_type: 'HARDWOOD',
          size: 'SINGLE',
          location: 'INSIDE',
          ceiling_height: 300,
          lighting: true,
          reservation_fee: 50.00
        };

        const field = Field.fromAPI(apiData);

        expect(field.id).toBe(1);
        expect(field.clubId).toBe(10);
        expect(field.name).toBe('Court A');
        expect(field.floorType).toBe('HARDWOOD');
        expect(field.ceilingHeight).toBe(300);
        expect(field.reservationFee).toBe(50.00);
      });

      it('handles null ceiling height (uses fallback to undefined)', () => {
        const apiData = {
          id: 1,
          clubid: 10,
          name: 'Outdoor Court',
          floor_type: 'GRASS',
          ceiling_height: null,
          reservation_fee: 30
        };

        const field = Field.fromAPI(apiData);

        // The ?? operator: ceiling_height (null) ?? ceilingHeight (undefined) = undefined
        expect(field.ceilingHeight).toBeUndefined();
      });

      it('defaults reservation fee to 0 if missing', () => {
        const apiData = {
          id: 1,
          clubid: 10,
          name: 'Free Court',
          floor_type: 'HARDWOOD'
        };

        const field = Field.fromAPI(apiData);

        expect(field.reservationFee).toBe(0);
      });
    });

    describe('toAPI()', () => {
      it('converts camelCase to snake_case', () => {
        const field = new Field({
          name: 'Main Court',
          floorType: 'ARTIFICIAL',
          size: 'DOUBLE',
          location: 'OUTSIDE',
          ceilingHeight: null,
          lighting: false,
          reservationFee: 75.50
        });

        const apiData = field.toAPI();

        expect(apiData.name).toBe('Main Court');
        expect(apiData.floor_type).toBe('ARTIFICIAL');
        expect(apiData.size).toBe('DOUBLE');
        expect(apiData.location).toBe('OUTSIDE');
        expect(apiData.ceiling_height).toBeNull();
        expect(apiData.lighting).toBe(false);
        expect(apiData.reservation_fee).toBe(75.50);
      });
    });

    describe('static constants', () => {
      it('has all floor types', () => {
        expect(Field.FLOOR_TYPES.HARDWOOD).toBe('HARDWOOD');
        expect(Field.FLOOR_TYPES.GRASS).toBe('GRASS');
        expect(Field.FLOOR_TYPES.TURF).toBe('TURF');
        expect(Field.FLOOR_TYPES.ARTIFICIAL).toBe('ARTIFICIAL');
      });

      it('has size options', () => {
        expect(Field.SIZES.SINGLE).toBe('SINGLE');
        expect(Field.SIZES.DOUBLE).toBe('DOUBLE');
      });

      it('has location options', () => {
        expect(Field.LOCATIONS.INSIDE).toBe('INSIDE');
        expect(Field.LOCATIONS.OUTSIDE).toBe('OUTSIDE');
      });
    });
  });

  describe('Booking', () => {
    describe('fromAPI()', () => {
      it('converts API data with snake_case', () => {
        const apiData = {
          id: 100,
          field: 5,
          title: 'Training Session',
          day_of_week: 3,
          start_time: '18:00',
          end_time: '20:00',
          price: 100.00,
          has_reservation: true,
          subscription_only: false
        };

        const booking = Booking.fromAPI(apiData);

        expect(booking.id).toBe(100);
        expect(booking.fieldId).toBe(5);
        expect(booking.title).toBe('Training Session');
        expect(booking.dayOfWeek).toBe(3);
        expect(booking.startTime).toBe('18:00');
        expect(booking.endTime).toBe('20:00');
        expect(booking.price).toBe(100.00);
        expect(booking.hasReservation).toBe(true);
        expect(booking.subscriptionOnly).toBe(false);
      });

      it('defaults price to 0 if missing', () => {
        const apiData = {
          id: 1,
          title: 'Free Session'
        };

        const booking = Booking.fromAPI(apiData);

        expect(booking.price).toBe(0);
      });

      it('defaults has_reservation to false if missing', () => {
        const apiData = {
          id: 1,
          title: 'New Booking'
        };

        const booking = Booking.fromAPI(apiData);

        expect(booking.hasReservation).toBe(false);
      });

      it('defaults subscription_only to false if missing', () => {
        const apiData = {
          id: 1,
          title: 'Open Booking'
        };

        const booking = Booking.fromAPI(apiData);

        expect(booking.subscriptionOnly).toBe(false);
      });

      it('handles dayOfWeek of 0 (Sunday)', () => {
        const apiData = {
          id: 1,
          day_of_week: 0
        };

        const booking = Booking.fromAPI(apiData);

        expect(booking.dayOfWeek).toBe(0);
      });
    });

    describe('toAPI()', () => {
      it('converts camelCase to snake_case', () => {
        const booking = new Booking({
          title: 'Match Day',
          dayOfWeek: 6,
          startTime: '10:00',
          endTime: '12:00',
          price: 150,
          subscriptionOnly: true
        });

        const apiData = booking.toAPI();

        expect(apiData.title).toBe('Match Day');
        expect(apiData.day_of_week).toBe(6);
        expect(apiData.start_time).toBe('10:00');
        expect(apiData.end_time).toBe('12:00');
        expect(apiData.price).toBe(150);
        expect(apiData.subscription_only).toBe(true);
      });
    });

    describe('day of week translations', () => {
      it('has Croatian names for all days', () => {
        expect(Booking.DAYS_OF_WEEK_HR[0]).toBe('Nedjelja');
        expect(Booking.DAYS_OF_WEEK_HR[1]).toBe('Ponedjeljak');
        expect(Booking.DAYS_OF_WEEK_HR[2]).toBe('Utorak');
        expect(Booking.DAYS_OF_WEEK_HR[3]).toBe('Srijeda');
        expect(Booking.DAYS_OF_WEEK_HR[4]).toBe('Četvrtak');
        expect(Booking.DAYS_OF_WEEK_HR[5]).toBe('Petak');
        expect(Booking.DAYS_OF_WEEK_HR[6]).toBe('Subota');
      });
    });
  });

  describe('Reservation', () => {
    describe('fromAPI()', () => {
      it('converts complete API data', () => {
        const apiData = {
          id: 50,
          booking_id: 10,
          booking_title: 'Weekend Game',
          repeating: true,
          player: 5,
          field_id: 3,
          field_name: 'Court 1',
          club_id: 1,
          club_name: 'Main Club',
          day_of_week: 6,
          date: '2024-02-10',
          start_time: '14:00',
          end_time: '16:00',
          created_at: '2024-02-01T10:00:00Z',
          payment_method: 'PAYPAL',
          payment_status: 'PAID',
          approval_status: 'APPROVED'
        };

        const reservation = Reservation.fromAPI(apiData);

        expect(reservation.id).toBe(50);
        expect(reservation.bookingId).toBe(10);
        expect(reservation.repeating).toBe(true);
        expect(reservation.playerId).toBe(5);
        expect(reservation.paymentMethod).toBe('PAYPAL');
        expect(reservation.paymentStatus).toBe('PAID');
        expect(reservation.approvalStatus).toBe('APPROVED');
      });

      it('defaults repeating to false if missing', () => {
        const apiData = {
          id: 1,
          booking_title: 'One-time booking'
        };

        const reservation = Reservation.fromAPI(apiData);

        expect(reservation.repeating).toBe(false);
      });
    });

    describe('toCalendarEvent()', () => {
      it('creates recurring event for repeating reservation', () => {
        const reservation = new Reservation({
          id: 1,
          bookingTitle: 'Weekly Training',
          repeating: true,
          dayOfWeek: 2,
          startTime: '18:00',
          endTime: '20:00',
          clubId: 5,
          fieldId: 10,
          clubName: 'Sports Club',
          fieldName: 'Court A'
        });

        const event = reservation.toCalendarEvent();

        expect(event.id).toBe(1);
        expect(event.title).toBe('Weekly Training');
        expect(event.daysOfWeek).toEqual([2]);
        expect(event.startTime).toBe('18:00');
        expect(event.endTime).toBe('20:00');
        expect(event.extendedProps.clubId).toBe(5);
      });

      it('creates single event for non-repeating reservation', () => {
        const reservation = new Reservation({
          id: 2,
          bookingTitle: 'One-time Match',
          repeating: false,
          date: '2024-03-15',
          startTime: '10:00',
          endTime: '12:00',
          clubId: 3,
          fieldId: 7,
          clubName: 'Game Club',
          fieldName: 'Court B'
        });

        const event = reservation.toCalendarEvent();

        expect(event.id).toBe(2);
        expect(event.title).toBe('One-time Match');
        expect(event.start).toBe('2024-03-15T10:00');
        expect(event.end).toBe('2024-03-15T12:00');
        expect(event.daysOfWeek).toBeUndefined();
        expect(event.extendedProps.fieldName).toBe('Court B');
      });
    });

    describe('payment constants', () => {
      it('has payment method options', () => {
        expect(Reservation.PAYMENT_METHODS.IN_PERSON).toBe('IN_PERSON');
        expect(Reservation.PAYMENT_METHODS.PAYPAL).toBe('PAYPAL');
      });

      it('has payment status options', () => {
        expect(Reservation.PAYMENT_STATUS.PENDING).toBe('PENDING');
        expect(Reservation.PAYMENT_STATUS.PAID).toBe('PAID');
        expect(Reservation.PAYMENT_STATUS.CANCELLED).toBe('CANCELLED');
      });

      it('has approval status options', () => {
        expect(Reservation.APPROVAL_STATUS.PENDING).toBe('PENDING');
        expect(Reservation.APPROVAL_STATUS.APPROVED).toBe('APPROVED');
        expect(Reservation.APPROVAL_STATUS.REJECTED).toBe('REJECTED');
      });
    });
  });

  describe('Club', () => {
    describe('toAPI()', () => {
      it('converts camelCase to snake_case', () => {
        const club = new Club({
          name: 'Tennis Club',
          address: '123 Main St',
          description: 'Best tennis club',
          workingHours: '8:00-22:00',
          contactNumber: '+1234567890'
        });

        const apiData = club.toAPI();

        expect(apiData.name).toBe('Tennis Club');
        expect(apiData.address).toBe('123 Main St');
        expect(apiData.description).toBe('Best tennis club');
        expect(apiData.working_hours).toBe('8:00-22:00');
        expect(apiData.contact_number).toBe('+1234567890');
      });
    });
  });

  describe('Admin', () => {
    describe('fromAPI()', () => {
      it('converts snake_case and handles defaults', () => {
        const apiData = {
          userid: 100,
          first_name: 'Admin',
          last_name: 'User',
          can_manage_users: true,
          can_manage_bookings: false
        };

        const admin = Admin.fromAPI(apiData);

        expect(admin.userId).toBe(100);
        expect(admin.firstName).toBe('Admin');
        expect(admin.lastName).toBe('User');
        expect(admin.canManageUsers).toBe(true);
        expect(admin.canManageBookings).toBe(false);
      });

      it('defaults permissions to true if missing', () => {
        const apiData = {
          userid: 1,
          first_name: 'Test'
        };

        const admin = Admin.fromAPI(apiData);

        expect(admin.canManageUsers).toBe(true);
        expect(admin.canManageBookings).toBe(true);
      });
    });
  });

  describe('Offer', () => {
    describe('toAPI()', () => {
      it('includes discount_percentage for SUBSCRIPTION offers', () => {
        const offer = new Offer({
          name: 'Premium Subscription',
          description: 'Monthly subscription',
          monthlyPrice: 100,
          offerType: 'SUBSCRIPTION',
          discountPercentage: 15
        });

        const apiData = offer.toAPI();

        expect(apiData.name).toBe('Premium Subscription');
        expect(apiData.monthly_price).toBe(100);
        expect(apiData.offer_type).toBe('SUBSCRIPTION');
        expect(apiData.discount_percentage).toBe(15);
        expect(apiData.tutor_name).toBeUndefined();
      });

      it('includes tutor_name for TUTORING offers', () => {
        const offer = new Offer({
          name: 'Private Lessons',
          description: 'One-on-one coaching',
          monthlyPrice: 200,
          offerType: 'TUTORING',
          tutorName: 'Coach John'
        });

        const apiData = offer.toAPI();

        expect(apiData.offer_type).toBe('TUTORING');
        expect(apiData.tutor_name).toBe('Coach John');
        expect(apiData.discount_percentage).toBeUndefined();
      });
    });
  });
});
