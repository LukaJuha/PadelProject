import { SearchFilter } from "../models/SearchFilter";
import { Field } from '../models';

export default function SearchFilters({ filters, setFilters, onClose }) {
  const updateFilter = (key, value) => {
    const newFilters = Object.assign(new SearchFilter(), filters);
    newFilters[key] = value;
    setFilters(newFilters);
  };

  const toggleFieldType = (type) => {
    const newFilters = Object.assign(new SearchFilter(), filters);
    const idx = newFilters.fieldType.indexOf(type);
    if (idx === -1) newFilters.fieldType.push(type);
    else newFilters.fieldType.splice(idx, 1);
    newFilters.fieldType = Array.from(new Set(newFilters.fieldType));
    setFilters(newFilters);
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <h3>Odaberite filtre</h3>
        <div>
          <p>Vrsta pretrage</p>
          <input type="radio" id="filterBoth" name="filterSearchType" value="BOTH" style={styles.filterRadioBtn} onChange={(e)=> updateFilter('searchType', e.target.value)} checked={filters.searchType === 'BOTH'} />
          <label htmlFor="filterBoth">Oboje</label><br/>
          <input type="radio" id="filterClub" name="filterSearchType" value="CLUB" style={styles.filterRadioBtn} onChange={(e)=> updateFilter('searchType', e.target.value)} checked={filters.searchType === 'CLUB'} />
          <label htmlFor="filterClub">Klub</label><br/>
          <input type="radio" id="filterField" name="filterSearchType" value="FIELD" style={styles.filterRadioBtn} onChange={(e)=> updateFilter('searchType', e.target.value)} checked={filters.searchType === 'FIELD'} />
          <label htmlFor="filterField">Teren</label>
        </div>
        <div>
          <p>Teren</p>
          <div>
            <p>Lokacija</p>
            <input type="radio" id="filterFieldLocationBoth" name="filterFieldLocation" value="BOTH" style={styles.filterRadioBtn} onChange={(e)=> updateFilter('fieldLocation', e.target.value)} checked={filters.fieldLocation === 'BOTH'} />
            <label htmlFor="filterFieldLocationBoth">Oboje</label><br/>
            <input type="radio" id="filterFieldInside" name="filterFieldLocation" value="INSIDE" style={styles.filterRadioBtn} onChange={(e)=> updateFilter('fieldLocation', e.target.value)} checked={filters.fieldLocation === 'INSIDE'} />
            <label htmlFor="filterFieldInside">Unutra</label><br/>
            <input type="radio" id="filterFieldOutside" name="filterFieldLocation" value="OUTSIDE" style={styles.filterRadioBtn} onChange={(e)=> updateFilter('fieldLocation', e.target.value)} checked={filters.fieldLocation === 'OUTSIDE'} />
            <label htmlFor="filterFieldOutside">Vani</label>
          </div>
          <div>
            <p>Veličina</p>
            <input type="radio" id="filterFieldSizeBoth" name="filterFieldSize" value="BOTH" style={styles.filterRadioBtn} onChange={(e)=> updateFilter('fieldSize', e.target.value)} checked={filters.fieldSize === 'BOTH'} />
            <label htmlFor="filterFieldSizeBoth">Oboje</label><br/>
            <input type="radio" id="filterFieldSingle" name="filterFieldSize" value="SINGLE" style={styles.filterRadioBtn} onChange={(e)=> updateFilter('fieldSize', e.target.value)} checked={filters.fieldSize === 'SINGLE'} />
            <label htmlFor="filterFieldSingle">Single</label><br/>
            <input type="radio" id="filterFieldDouble" name="filterFieldSize" value="DOUBLE" style={styles.filterRadioBtn} onChange={(e)=> updateFilter('fieldSize', e.target.value)} checked={filters.fieldSize === 'DOUBLE'} />
            <label htmlFor="filterFieldDouble">Double</label>
          </div>
          <div>
            <p>Tip podloge</p>
            {Object.entries(Field.FLOOR_TYPES).map(([key, value]) => (
              <div key={value}>
                <input 
                  type="checkbox" 
                  id={`filterFieldType${key}`} 
                  name="filterFieldType" 
                  value={value} 
                  style={styles.filterRadioBtn} 
                  onChange={() => toggleFieldType(value)} 
                  checked={filters.fieldType.includes(value)} 
                />
                <label htmlFor={`filterFieldType${key}`}>{Field.FLOOR_TYPES_HR[value]}</label>
              </div>
            ))}
          </div>
          <div>
            <p>Osvjetljenje</p>
            <input type="radio" id="filterFieldLightingBoth" name="filterFieldLighting" value="BOTH" style={styles.filterRadioBtn} onChange={(e)=> updateFilter('fieldLighting', e.target.value)} checked={filters.fieldLighting === 'BOTH'} />
            <label htmlFor="filterFieldLightingBoth">Oboje</label><br/>
            <input type="radio" id="filterFieldLightingYes" name="filterFieldLighting" value="YES" style={styles.filterRadioBtn} onChange={(e)=> updateFilter('fieldLighting', e.target.value)} checked={filters.fieldLighting === 'YES'} />
            <label htmlFor="filterFieldLightingYes">Da</label><br/>
            <input type="radio" id="filterFieldLightingNo" name="filterFieldLighting" value="NO" style={styles.filterRadioBtn} onChange={(e)=> updateFilter('fieldLighting', e.target.value)} checked={filters.fieldLighting === 'NO'} />
            <label htmlFor="filterFieldLightingNo">Ne</label>
          </div>
        </div>
        <button onClick={onClose} style={styles.closeButton}>
          Zatvori
        </button>
      </div>
    </div>
  );
}

const styles = {
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "10px",
    width: "300px",
    textAlign: "center",
  },
  closeButton: {
    marginTop: "10px",
    padding: "10px 15px",
    borderRadius: "5px",
    border: "none",
    backgroundColor: "#dc3545",
    color: "#fff",
    cursor: "pointer",
  },
  filterRadioBtn: {
    width: "10%",
  }
};
