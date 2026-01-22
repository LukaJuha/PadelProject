export class Review {
  constructor(data = {}) {
    this.id = data.id;
    this.userId = data.userId;
    this.clubId = data.clubId;
    this.comment = data.comment;
    this.rating = data.rating;
    this.uploadedAt = data.uploadedAt;
  }

  static fromAPI(apiData) {
    return new Review({
      id: apiData.id,
      userId: apiData.userid || apiData.userId,
      clubId: apiData.clubid || apiData.clubId,
      comment: apiData.comment,
      rating: apiData.rating,
      uploadedAt: apiData.uploaded_at || apiData.uploadedAt
    });
  }

  toAPI() {
    return {
      clubid: this.clubId,
      comment: this.comment,
      rating: this.rating
    };
  }
}
