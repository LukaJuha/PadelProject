import { Field } from './Field';

export class SearchFilter {
  // Search type options
  static SEARCH_TYPES = {
    BOTH: 'BOTH',
    CLUB: 'CLUB',
    FIELD: 'FIELD'
  };

  static SEARCH_TYPES_HR = {
    BOTH: 'Oboje',
    CLUB: 'Klub',
    FIELD: 'Teren'
  };

  // Yes/No/Both options
  static OPTION_TYPES = {
    BOTH: 'BOTH',
    YES: 'YES',
    NO: 'NO'
  };

  static OPTION_TYPES_HR = {
    BOTH: 'Oboje',
    YES: 'Da',
    NO: 'Ne'
  };

  // BOTH, CLUB, FIELD
  searchType = "BOTH";
  // BOTH, INSIDE, OUTSIDE
  fieldLocation = "BOTH";
  // BOTH, SINGLE, DOUBLE
  fieldSize = "BOTH";
  // Array of floor types from Field model
  fieldType = Object.values(Field.FLOOR_TYPES);
  // BOTH, YES, NO
  fieldLighting = "BOTH";
}
