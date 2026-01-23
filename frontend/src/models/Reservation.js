export class Reservation {
  static PAYMENT_METHODS = {
    IN_PERSON: 'IN_PERSON',
    PAYPAL: 'PAYPAL'
  };

  static PAYMENT_METHODS_HR = {
    IN_PERSON: 'Plaćanje osobno',
    PAYPAL: 'PayPal'
  };

  static PAYMENT_STATUS = {
    PENDING: 'PENDING',
    PAID: 'PAID',
    CANCELLED: 'CANCELLED'
  };

  static PAYMENT_STATUS_HR = {
    PENDING: 'Na čekanju',
    PAID: 'Plaćeno',
    CANCELLED: 'Otkazano'
  };

  static APPROVAL_STATUS = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED'
  };

  static APPROVAL_STATUS_HR = {
    PENDING: 'Na čekanju',
    APPROVED: 'Odobrena',
    REJECTED: 'Odbijena'
  };

  constructor(data = {}) {
    this.id = data.id;
    this.bookingId = data.bookingId;
    this.bookingTitle = data.bookingTitle;
    this.repeating = data.repeating ?? false;
    this.playerId = data.playerId;
    this.fieldId = data.fieldId;
    this.fieldName = data.fieldName;
    this.clubId = data.clubId;
    this.clubName = data.clubName;
    this.dayOfWeek = data.dayOfWeek;
    this.date = data.date;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.createdAt = data.createdAt;
    this.paymentMethod = data.paymentMethod;
    this.paymentStatus = data.paymentStatus;
    this.approvalStatus = data.approvalStatus;
  }

  static fromAPI(apiData) {
    return new Reservation({
      id: apiData.id,
      bookingId: apiData.booking_id || apiData.bookingId,
      bookingTitle: apiData.booking_title || apiData.bookingTitle,
      repeating: apiData.repeating ?? false,
      playerId: apiData.player || apiData.playerId,
      fieldId: apiData.field_id || apiData.fieldId,
      fieldName: apiData.field_name || apiData.fieldName,
      clubId: apiData.club_id || apiData.clubId,
      clubName: apiData.club_name || apiData.clubName,
      dayOfWeek: apiData.day_of_week ?? apiData.dayOfWeek,
      date: apiData.date,
      startTime: apiData.start_time || apiData.startTime,
      endTime: apiData.end_time || apiData.endTime,
      createdAt: apiData.created_at || apiData.createdAt,
      paymentMethod: apiData.payment_method || apiData.paymentMethod,
      paymentStatus: apiData.payment_status || apiData.paymentStatus,
      approvalStatus: apiData.approval_status || apiData.approvalStatus
    });
  }

  toCalendarEvent() {
    // Repeating reservations use daysOfWeek with startTime/endTime to show on all weeks
    if (this.repeating) {
      return {
        id: this.id,
        title: this.bookingTitle,
        daysOfWeek: [this.dayOfWeek],
        startTime: this.startTime,
        endTime: this.endTime,
        extendedProps: {
          clubId: this.clubId,
          fieldId: this.fieldId,
          clubName: this.clubName,
          fieldName: this.fieldName
        }
      };
    }

    // Non-repeating reservations use specific start/end dates
    return {
      id: this.id,
      title: this.bookingTitle,
      start: `${this.date}T${this.startTime}`,
      end: `${this.date}T${this.endTime}`,
      extendedProps: {
        clubId: this.clubId,
        fieldId: this.fieldId,
        clubName: this.clubName,
        fieldName: this.fieldName
      }
    };
  }
}
