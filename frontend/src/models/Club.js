export class Club {
  constructor(data = {}) {
    this.id = data.id;
    this.userId = data.userId;
    this.name = data.name;
    this.email = data.email;
    this.address = data.address;
    this.description = data.description;
    this.workingHours = data.workingHours;
    this.contactNumber = data.contactNumber;
    this.ratingAvg = data.ratingAvg;
    this.fields = data.fields || [];
  }

  static fromAPI(apiData) {
    return new Club({
      id: apiData.id,
      userId: apiData.userid || apiData.userId,
      name: apiData.name,
      email: apiData.email,
      address: apiData.address,
      description: apiData.description,
      workingHours: apiData.working_hours || apiData.workingHours,
      contactNumber: apiData.contact_number || apiData.contactNumber,
      ratingAvg: apiData.rating_avg || apiData.ratingAvg,
      fields: apiData.fields || []
    });
  }

  toAPI() {
    return {
      name: this.name,
      address: this.address,
      description: this.description,
      working_hours: this.workingHours,
      contact_number: this.contactNumber
    };
  }
}
