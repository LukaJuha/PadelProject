export class Field {
  // Floor type choices (matches Django model)
  static FLOOR_TYPES = {
    HARDWOOD: 'HARDWOOD',
    GRASS: 'GRASS',
    TURF: 'TURF',
    ARTIFICIAL: 'ARTIFICIAL'
  };

  // Size choices
  static SIZES = {
    SINGLE: 'SINGLE',
    DOUBLE: 'DOUBLE'
  };

  // Location choices
  static LOCATIONS = {
    INSIDE: 'INSIDE',
    OUTSIDE: 'OUTSIDE'
  };

  // Croatian translations
  static FLOOR_TYPES_HR = {
    HARDWOOD: 'Tvrdo drvo',
    GRASS: 'Trava',
    TURF: 'Travnjak',
    ARTIFICIAL: 'Umjetna podloga'
  };

  static SIZES_HR = {
    SINGLE: 'Pojedinačni',
    DOUBLE: 'Dvostruki'
  };

  static LOCATIONS_HR = {
    INSIDE: 'Unutra',
    OUTSIDE: 'Vani'
  };

  static LIGHTING_HR = {
    true: 'Da',
    false: 'Ne'
  };

  constructor(data = {}) {
    this.id = data.id;
    this.clubId = data.clubId;
    this.clubName = data.clubName;
    this.name = data.name;
    this.floorType = data.floorType;
    this.size = data.size;
    this.location = data.location;
    this.ceilingHeight = data.ceilingHeight;
    this.lighting = data.lighting;
    this.reservationFee = data.reservationFee;
  }

  static fromAPI(apiData) {
    return new Field({
      id: apiData.id,
      clubId: apiData.clubid || apiData.clubId,
      clubName: apiData.clubName,
      name: apiData.name,
      floorType: apiData.floor_type || apiData.floorType,
      size: apiData.size,
      location: apiData.location,
      ceilingHeight: apiData.ceiling_height ?? apiData.ceilingHeight,
      lighting: apiData.lighting,
      reservationFee: apiData.reservation_fee ?? apiData.reservationFee ?? 0
    });
  }

  toAPI() {
    return {
      name: this.name,
      floor_type: this.floorType,
      size: this.size,
      location: this.location,
      ceiling_height: this.ceilingHeight,
      lighting: this.lighting,
      reservation_fee: this.reservationFee
    };
  }
}
