export class Booking {
  // Day of week names (0=Sunday, 1=Monday, ..., 6=Saturday)
  static DAYS_OF_WEEK_HR = {
    0: 'Nedjelja',
    1: 'Ponedjeljak',
    2: 'Utorak',
    3: 'Srijeda',
    4: 'Četvrtak',
    5: 'Petak',
    6: 'Subota'
  };

  constructor(data = {}) {
    this.id = data.id;
    this.fieldId = data.fieldId;
    this.title = data.title;
    this.dayOfWeek = data.dayOfWeek;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.hasReservation = data.hasReservation;
  }

  static fromAPI(apiData) {
    return new Booking({
      id: apiData.id,
      fieldId: apiData.field || apiData.fieldId,
      title: apiData.title,
      dayOfWeek: apiData.day_of_week ?? apiData.dayOfWeek,
      startTime: apiData.start_time || apiData.startTime,
      endTime: apiData.end_time || apiData.endTime,
      hasReservation: apiData.has_reservation ?? apiData.hasReservation ?? false
    });
  }

  toAPI() {
    return {
      title: this.title,
      day_of_week: this.dayOfWeek,
      start_time: this.startTime,
      end_time: this.endTime
    };
  }
}
