export class User {
  // Role choices
  static ROLES = {
    PLAYER: 'PLAYER',
    CLUB: 'CLUB',
    ADMIN: 'ADMIN'
  };

  // Croatian translations
  static ROLES_HR = {
    PLAYER: 'Igrač',
    CLUB: 'Klub',
    ADMIN: 'Administrator'
  };

  constructor(data = {}) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.role = data.role;
    this.lastLogin = data.lastLogin;
    this.isSuperuser = data.isSuperuser;
    this.profile = data.profile;
  }

  static fromAPI(apiData) {
    return new User({
      id: apiData.id,
      username: apiData.username,
      email: apiData.email,
      role: apiData.role,
      lastLogin: apiData.last_login,
      isSuperuser: apiData.is_superuser,
      profile: apiData.profile
    });
  }

  toAPI() {
    return {
      username: this.username,
      email: this.email,
      role: this.role
    };
  }
}
