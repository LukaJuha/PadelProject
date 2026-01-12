import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SearchFilter } from "../components/searchFilter";
import SearchFilters from "../components/searchFilters";

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
    if (!query.trim()) return;

    const params = new URLSearchParams();
    params.set("q", query.trim());
    if (filterObj.searchType) params.set("type", filterObj.searchType);
    if (filterObj.fieldLocation) params.set("fieldLocation", filterObj.fieldLocation);
    if (filterObj.fieldSize) params.set("fieldSize", filterObj.fieldSize);
    if (filterObj.fieldLighting) params.set("lighting", filterObj.fieldLighting);
    if (Array.isArray(filterObj.fieldType)) {
      filterObj.fieldType.forEach((t) => params.append("fieldType", t));
    }

    setLoading(true);
    setError(null);
    try {
      const backendURL = (import.meta.env.MODE === 'development') ?  import.meta.env.VITE_API_BASE_URL_LOCAL : import.meta.env.VITE_API_BASE_URL_DEPLOYMENT;
      const res = await fetch(`${backendURL}/search/?${params.toString()}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      // expected shape: { clubs: [...], fields: [...] }
      setResults({ clubs: data.clubs || [], fields: data.fields || [] });
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
        <input
          type="text"
          placeholder="Pretražite klubove i terene"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
        <div style={styles.filterIconContainer} onClick={toggleFilters}>
          <img src="/filter_icon.png" alt="Filtri" style={styles.filterIcon} />
        </div>
      </form>

      {/* Filter Modal */}
      {showFilters && (
        <SearchFilters filters={filters} setFilters={setFilters} onClose={toggleFilters} />
      )}

      {/* Search Results */}
      <div>
        {loading && <p>Loading results...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        <h3>Clubs</h3>
        {results.clubs.length === 0 ? (
          <p>No matching clubs.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={cellStyle}>Name</th>
                <th style={cellStyle}>Address</th>
                <th style={cellStyle}>Rating</th>
                <th style={cellStyle}>Matching Fields</th>
              </tr>
            </thead>
            <tbody>
              {results.clubs.map((c) => (
                <tr key={c.id}>
                  <td style={cellStyle}>
                    <a 
                      href={`/club/${c.id}`} 
                      style={{ color: '#007bff', textDecoration: 'none', cursor: 'pointer' }}
                      onClick={(e) => { e.preventDefault(); navigate(`/club/${c.id}`); }}
                    >
                      {c.name}
                    </a>
                  </td>
                  <td style={cellStyle}>{c.address}</td>
                  <td style={cellStyle}>{c.ratingAvg ?? '-'}</td>
                  <td style={cellStyle}>{(c.fields && c.fields.length) || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h3>Fields</h3>
        {results.fields.length === 0 ? (
          <p>No matching fields.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={cellStyle}>Name</th>
                <th style={cellStyle}>Club</th>
                <th style={cellStyle}>Floor Type</th>
                <th style={cellStyle}>Size</th>
                <th style={cellStyle}>Location</th>
                <th style={cellStyle}>Lighting</th>
              </tr>
            </thead>
            <tbody>
              {results.fields.map((f) => (
                <tr key={f.id}>
                  <td style={cellStyle}>
                    <a 
                      href={`/club/${f.clubId}/field/${f.id}`} 
                      style={{ color: '#007bff', textDecoration: 'none', cursor: 'pointer' }}
                      onClick={(e) => { e.preventDefault(); navigate(`/club/${f.clubId}/field/${f.id}`); }}
                    >
                      {f.name}
                    </a>
                  </td>
                  <td style={cellStyle}>
                    <a 
                      href={`/club/${f.clubId}`} 
                      style={{ color: '#007bff', textDecoration: 'none', cursor: 'pointer' }}
                      onClick={(e) => { e.preventDefault(); navigate(`/club/${f.clubId}`); }}
                    >
                      {f.clubName}
                    </a>
                  </td>
                  <td style={cellStyle}>{f.floorType}</td>
                  <td style={cellStyle}>{f.size}</td>
                  <td style={cellStyle}>{f.location}</td>
                  <td style={cellStyle}>{f.lighting ? 'Yes' : 'No'}</td>
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
  },
  searchInput: {
    flex: 1,
    margin: 0,
    maxWidth: "100%",
    padding: "10px 15px",
    borderRadius: "20px",
    border: "1px solid #ccc",
    outline: "none",
    fontSize: "16px",
  },
  filterIconContainer: {
    flex: 0,
    marginLeft: "10px",
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    border: "1px solid #ccc",
    backgroundColor: "#007bff60",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
  },
  filterIcon: {
    width: "40px",
    height: "40px",
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
