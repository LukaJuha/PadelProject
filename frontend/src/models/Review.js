export class Review {
  constructor(data = {}) {
    this.id = data.id;
    this.userId = data.userId;
    this.username = data.username;
    this.clubId = data.clubId;
    this.clubName = data.clubName;
    this.comment = data.comment;
    this.rating = data.rating;
    this.uploadedAt = data.uploadedAt;
  }

  static fromAPI(apiData) {
    return new Review({
      id: apiData.id,
      userId: apiData.user_id || apiData.userId,
      username: apiData.user_username || apiData.username || 'Unknown',
      clubId: apiData.club_id || apiData.clubId,
      clubName: apiData.club_name || apiData.clubName || 'Unknown',
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
