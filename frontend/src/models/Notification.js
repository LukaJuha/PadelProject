export class Notification {
  constructor(data = {}) {
    this.id = data.id;
    this.title = data.title;
    this.message = data.message;
    this.isRead = data.isRead ?? data.is_read;
    this.createdAt = data.createdAt ?? data.created_at;
  }

  static fromAPI(api) {
    return new Notification({
      id: api.id,
      title: api.title,
      message: api.message,
      isRead: api.is_read,
      createdAt: api.created_at,
    });
  }
}
