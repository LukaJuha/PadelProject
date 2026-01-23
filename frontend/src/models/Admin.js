export class Admin {
  constructor(data = {}) {
    this.userId = data.userId;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.canManageUsers = data.canManageUsers;
    this.canManageBookings = data.canManageBookings;
  }

  static fromAPI(apiData) {
    return new Admin({
      userId: apiData.userid || apiData.userId,
      firstName: apiData.first_name || apiData.firstName,
      lastName: apiData.last_name || apiData.lastName,
      canManageUsers: apiData.can_manage_users ?? apiData.canManageUsers ?? true,
      canManageBookings: apiData.can_manage_bookings ?? apiData.canManageBookings ?? true
    });
  }

  toAPI() {
    return {
      first_name: this.firstName,
      last_name: this.lastName,
      can_manage_users: this.canManageUsers,
      can_manage_bookings: this.canManageBookings
    };
  }
}
