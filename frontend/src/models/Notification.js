export class Notification {
  constructor(data = {}) {
    this.id = data.id;
    this.title = data.title;
    this.message = data.message;
    this.isRead = data.isRead ?? data.is_read;
    this.reservationId = data.reservationId ?? data.reservation_id;
    this.createdAt = data.createdAt ?? data.created_at;
  }

  static fromAPI(api) {
    return new Notification({
      id: api.id,
      title: api.title,
      message: api.message,
      isRead: api.is_read,
      reservationId: api.reservation_id,
      createdAt: api.created_at,
    });
  }
}
