export class Reservation {
  constructor(data = {}) {
    this.id = data.id;
    this.bookingId = data.bookingId;
    this.bookingTitle = data.bookingTitle;
    this.playerId = data.playerId;
    this.fieldId = data.fieldId;
    this.fieldName = data.fieldName;
    this.clubId = data.clubId;
    this.clubName = data.clubName;
    this.dayOfWeek = data.dayOfWeek;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.createdAt = data.createdAt;
  }

  static fromAPI(apiData) {
    return new Reservation({
      id: apiData.id,
      bookingId: apiData.booking_id || apiData.bookingId,
      bookingTitle: apiData.booking_title || apiData.bookingTitle,
      playerId: apiData.player || apiData.playerId,
      fieldId: apiData.field_id || apiData.fieldId,
      fieldName: apiData.field_name || apiData.fieldName,
      clubId: apiData.club_id || apiData.clubId,
      clubName: apiData.club_name || apiData.clubName,
      dayOfWeek: apiData.day_of_week ?? apiData.dayOfWeek,
      startTime: apiData.start_time || apiData.startTime,
      endTime: apiData.end_time || apiData.endTime,
      createdAt: apiData.created_at || apiData.createdAt
    });
  }

  toCalendarEvent() {
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
}
