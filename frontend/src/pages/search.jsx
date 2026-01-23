import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SearchFilter } from "../models/SearchFilter";
import SearchFilters from "../components/searchFilters";
import { Club, Field } from "../models";
import { getBackendURL } from '../utils/api';


function Search() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(new SearchFilter());
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [results, setResults] = useState({ clubs: [], fields: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Auto-search on mount if URL parameters exist
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      // Populate filters from URL params
      const newFilters = new SearchFilter();
      newFilters.searchType = searchParams.get("type") || "BOTH";
      newFilters.fieldLocation = searchParams.get("fieldLocation") || "BOTH";
      newFilters.fieldSize = searchParams.get("fieldSize") || "BOTH";
      newFilters.fieldLighting = searchParams.get("lighting") || "BOTH";
      newFilters.includeAllClubs = (searchParams.get("includeAllClubs") || "false") === "true";
      const fieldTypes = searchParams.getAll("fieldType");
      if (fieldTypes.length > 0) {
        newFilters.fieldType = fieldTypes;
      }
      
      setSearchQuery(q);
      setFilters(newFilters);
      
      // Perform search with these parameters
      performSearch(q, newFilters);
    }
  }, [searchParams]);

  const performSearch = async (query, filterObj) => {
    const params = new URLSearchParams();
    params.set("q", query.trim());
    if (filterObj.searchType) params.set("type", filterObj.searchType);
    if (filterObj.fieldLocation) params.set("fieldLocation", filterObj.fieldLocation);
    if (filterObj.fieldSize) params.set("fieldSize", filterObj.fieldSize);
    if (filterObj.fieldLighting) params.set("lighting", filterObj.fieldLighting);
    if (filterObj.includeAllClubs) params.set("includeAllClubs", "true");
    if (Array.isArray(filterObj.fieldType)) {
      filterObj.fieldType.forEach((t) => params.append("fieldType", t));
    }

    setLoading(true);
    setError(null);
    try {
      const backendURL = getBackendURL();
      const res = await fetch(`${backendURL}/search/?${params.toString()}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      // Convert API data to model instances
      const clubs = (data.clubs || []).map(c => Club.fromAPI(c));
      const fields = (data.fields || []).map(f => Field.fromAPI(f));
      setResults({ clubs, fields });
    } catch (err) {
      setError(err.message || "Failed to fetch results");
      setResults({ clubs: [], fields: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    await performSearch(searchQuery, filters);
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters); // Toggle filter modal visibility
  };

  return (
    <div>
      {/* Search Bar */}
      <form onSubmit={handleSearch} style={styles.searchBarContainer}>
        <div style={styles.searchInputWrapper}>
          <input
            type="text"
            placeholder="Pretražite klubove i terene"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          <button
            type="submit"
            style={styles.searchButton}
          >
            <img src="/magnifier.png" alt="Search" style={styles.searchButtonIcon} />
          </button>
        </div>
        <button
          type="button"
          style={styles.filterButton}
          onClick={toggleFilters}
        >
          <img src="/settings.png" alt="Filtri" style={styles.filterIcon} />
        </button>
      </form>

      {/* Filter Modal */}
      {showFilters && (
        <SearchFilters filters={filters} setFilters={setFilters} onClose={toggleFilters} />
      )}

      {/* Search Results */}
      <div>
        {loading && <p>Učitavanje...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        <h3>Klubovi</h3>
        {results.clubs.length === 0 ? (
          <p>Nema odgovarajućih klubova.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>

                <th style={cellStyle}>Naziv</th>
                <th style={cellStyle}>Adresa</th>
                <th style={cellStyle}>Ocjena</th>
                <th style={cellStyle}>Broj terena</th>
                <th style={cellStyle}>Recenzije</th>

                <th style={cellStyle}>Ime</th>
                <th style={cellStyle}>Adresa</th>
                <th style={cellStyle}>Ocjena</th>
                <th style={cellStyle}>Broj odgovarajućih terena</th>

              </tr>
            </thead>
            <tbody>
              {results.clubs.map((club) => (
                <tr key={club.id}>
                  <td style={cellStyle}>
                    <a 
                      href={`/club/${club.id}`} 
                      style={{ color: '#007bff', textDecoration: 'none', cursor: 'pointer' }}
                      onClick={(e) => { e.preventDefault(); navigate(`/club/${club.id}`); }}
                    >
                      {club.name}
                    </a>
                  </td>
                  <td style={cellStyle}>{club.address}</td>
                  <td style={cellStyle}>{club.ratingAvg ?? '-'}</td>
                  <td style={cellStyle}>{club.fields.length || 0}</td>
                  <td style={cellStyle}>
                    <button
                      onClick={() => navigate(`/reviews/${club.id}`)}
                      style={{ padding: '6px 10px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <img src="/star.png" alt="star" style={{ width: '16px', height: '16px' }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h3>Tereni</h3>
        {results.fields.length === 0 ? (
          <p>Nema odgovarajućih terena.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>

                <th style={cellStyle}>Naziv</th>
                <th style={cellStyle}>Klub</th>
                <th style={cellStyle}>Podloga</th>
                <th style={cellStyle}>Veličina</th>

                <th style={cellStyle}>Ime</th>
                <th style={cellStyle}>Klub</th>
                <th style={cellStyle}>Vrsta podloge</th>
                <th style={cellStyle}>Velićina</th>

                <th style={cellStyle}>Lokacija</th>
                <th style={cellStyle}>Osvjetljenje</th>
              </tr>
            </thead>
            <tbody>
              {results.fields.map((field) => (
                <tr key={field.id}>
                  <td style={cellStyle}>
                    <a 
                      href={`/club/${field.clubId}/field/${field.id}`} 
                      style={{ color: '#007bff', textDecoration: 'none', cursor: 'pointer' }}
                      onClick={(e) => { e.preventDefault(); navigate(`/club/${field.clubId}/field/${field.id}`); }}
                    >
                      {field.name}
                    </a>
                  </td>
                  <td style={cellStyle}>
                    <a 
                      href={`/club/${field.clubId}`} 
                      style={{ color: '#007bff', textDecoration: 'none', cursor: 'pointer' }}
                      onClick={(e) => { e.preventDefault(); navigate(`/club/${field.clubId}`); }}
                    >
                      {field.clubName}
                    </a>
                    <div style={{ marginTop: 6 }}>
                      <button onClick={() => navigate(`/reviews/${field.clubId}`)} style={{ padding: '4px 8px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <img src="/star.png" alt="star" style={{ width: '14px', height: '14px' }} />
                      </button>
                    </div>
                  </td>

                  <td style={cellStyle}>{Field.FLOOR_TYPES_HR[field.floorType] || field.floorType}</td>
                  <td style={cellStyle}>{Field.SIZES_HR[field.size] || field.size}</td>
                  <td style={cellStyle}>{Field.LOCATIONS_HR[field.location] || field.location}</td>
                  <td style={cellStyle}>{Field.LIGHTING_HR[field.lighting]}</td>

                  <td style={cellStyle}>{
                        (f.floorType== "HARDWOOD" || f.floor_type == "HARDWOOD") ? 'Parket' :
                        (f.floorType== "GRASS" || f.floor_type == "GRASS") ? 'Trava' :
                        (f.floorType== "ARTIFICIAL" || f.floor_type == "ARTIFICIAL") ? 'Umjetna trava' : ''
                        } </td>
                  <td style={cellStyle}>{
                      f.size== "SINGLE" ? 'Single' :
                      f.size== "DOUBLE"  ? 'Double' : ''
                      }</td>
                  <td style={cellStyle}>{
                      f.location== "OUTSIDE" ? 'Vani' :
                      f.location== "INSIDE"  ? 'Unutra' : ''
                      }</td>
                  <td style={cellStyle}>{f.lighting ? 'Da' : 'Ne'}</td>

                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles = {
  searchBarContainer: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    marginTop: "20px",
    width: "100%",
    maxWidth: "700px",
    gap: "8px",
  },
  searchInputWrapper: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    border: "1px solid #ccc",
    borderRadius: "20px",
    paddingRight: "8px",
    backgroundColor: "#fff",
  },
  searchInput: {
    flex: 1,
    margin: 0,
    padding: "10px 15px",
    border: "none",
    outline: "none",
    fontSize: "16px",
    borderRadius: "20px",
    backgroundColor: "transparent",
  },
  searchButton: {
    flex: 0,
    width: "30px",
    height: "30px",
    border: "none",
    backgroundColor: "transparent",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
    padding: 0,
  },
  searchButtonIcon: {
    width: "20px",
    height: "20px",
  },
  filterButton: {
    flex: 0,
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    border: "1px solid #ccc",
    backgroundColor: "#007bff60",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
    padding: 0,
  },
  filterIcon: {
    width: "20px",
    height: "20px",
  },
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

const cellStyle = {
  border: '1px solid #ddd',
  padding: '8px',
  textAlign: 'left'
};

export default Search;
