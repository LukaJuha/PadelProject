export class Offer {
  static OFFER_TYPES = {
    SUBSCRIPTION: 'SUBSCRIPTION',
    TUTORING: 'TUTORING'
  };

  static OFFER_TYPES_HR = {
    SUBSCRIPTION: 'Pretplata',
    TUTORING: 'Trening'
  };

  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.monthlyPrice = data.monthlyPrice;
    this.offerType = data.offerType;
    this.createdAt = data.createdAt;
    this.clubName = data.clubName;
    
    // Subscription-specific
    this.discountPercentage = data.discountPercentage;
    
    // Tutoring-specific
    this.tutorName = data.tutorName;
  }

  static fromAPI(apiData) {
    return new Offer({
      id: apiData.id,
      name: apiData.name,
      description: apiData.description,
      monthlyPrice: apiData.monthly_price,
      offerType: apiData.offer_type,
      createdAt: apiData.created_at,
      clubName: apiData.club_name,
      discountPercentage: apiData.discount_percentage,
      tutorName: apiData.tutor_name
    });
  }

  toAPI() {
    const data = {
      name: this.name,
      description: this.description,
      monthly_price: this.monthlyPrice,
      offer_type: this.offerType
    };

    if (this.offerType === 'SUBSCRIPTION') {
      data.discount_percentage = this.discountPercentage;
    } else if (this.offerType === 'TUTORING') {
      data.tutor_name = this.tutorName;
    }

    return data;
  }
}

export class PlayerOffer {
  constructor(data = {}) {
    this.id = data.id;
    this.offerId = data.offerId;
    this.offerName = data.offerName;
    this.offerType = data.offerType;
    this.clubName = data.clubName;
    this.monthlyPrice = data.monthlyPrice;
    this.purchasedAt = data.purchasedAt;
    this.expiresAt = data.expiresAt;
    this.paymentStatus = data.paymentStatus;
    
    // Type-specific
    this.discountPercentage = data.discountPercentage;
    this.tutorName = data.tutorName;
  }

  static fromAPI(apiData) {
    return new PlayerOffer({
      id: apiData.id,
      offerId: apiData.offer_id,
      offerName: apiData.offer_name,
      offerType: apiData.offer_type,
      clubName: apiData.club_name,
      monthlyPrice: apiData.monthly_price,
      purchasedAt: apiData.purchased_at,
      expiresAt: apiData.expires_at,
      paymentStatus: apiData.payment_status,
      discountPercentage: apiData.discount_percentage,
      tutorName: apiData.tutor_name
    });
  }
}
