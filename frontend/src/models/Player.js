export class Player {
  // Skill level choices
  static SKILL_LEVELS = {
    BEGINNER: 'BEGINNER',
    INTERMEDIATE: 'INTERMEDIATE',
    ADVANCED: 'ADVANCED',
    PROFESSIONAL: 'PROFESSIONAL'
  };

  // Croatian translations
  static SKILL_LEVELS_HR = {
    BEGINNER: 'Početnik',
    INTERMEDIATE: 'Srednji',
    ADVANCED: 'Napredni',
    PROFESSIONAL: 'Profesionalac'
  };

  constructor(data = {}) {
    this.userId = data.userId;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.phoneNumber = data.phoneNumber;
    this.skillLevel = data.skillLevel;
    this.preferredDow = data.preferredDow;
    this.preferredTime = data.preferredTime;
  }

  static fromAPI(apiData) {
    return new Player({
      userId: apiData.userid || apiData.userId,
      firstName: apiData.first_name || apiData.firstName,
      lastName: apiData.last_name || apiData.lastName,
      phoneNumber: apiData.phone_number || apiData.phoneNumber,
      skillLevel: apiData.skill_level || apiData.skillLevel,
      preferredDow: apiData.preferred_dow || apiData.preferredDow,
      preferredTime: apiData.preferred_time || apiData.preferredTime
    });
  }

  toAPI() {
    return {
      first_name: this.firstName,
      last_name: this.lastName,
      phone_number: this.phoneNumber,
      skill_level: this.skillLevel,
      preferred_dow: this.preferredDow,
      preferred_time: this.preferredTime
    };
  }
}
