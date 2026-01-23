export class ReservationHistory {
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

  constructor(data = {}) {
    this.id = data.id;
    this.bookingId = data.bookingId;
    this.bookingTitle = data.bookingTitle;
    this.fieldId = data.fieldId;
    this.fieldName = data.fieldName;
    this.clubId = data.clubId;
    this.clubName = data.clubName;
    this.dayOfWeek = data.dayOfWeek;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.bookingDate = data.bookingDate;
    this.paymentMethod = data.paymentMethod;
    this.paymentStatus = data.paymentStatus;
    this.createdAt = data.createdAt;
    this.completedAt = data.completedAt;
  }

  static fromAPI(apiData) {
    return new ReservationHistory({
      id: apiData.id,
      bookingId: apiData.booking_id || apiData.bookingId,
      bookingTitle: apiData.booking_title || apiData.bookingTitle,
      fieldId: apiData.field_id || apiData.fieldId,
      fieldName: apiData.field_name || apiData.fieldName,
      clubId: apiData.club_id || apiData.clubId,
      clubName: apiData.club_name || apiData.clubName,
      dayOfWeek: apiData.day_of_week ?? apiData.dayOfWeek,
      startTime: apiData.start_time || apiData.startTime,
      endTime: apiData.end_time || apiData.endTime,
      bookingDate: apiData.booking_date || apiData.bookingDate,
      paymentMethod: apiData.payment_method || apiData.paymentMethod,
      paymentStatus: apiData.payment_status || apiData.paymentStatus,
      createdAt: apiData.created_at || apiData.createdAt,
      completedAt: apiData.completed_at || apiData.completedAt
    });
  }
}
