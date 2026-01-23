import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SearchFilter } from '../models/SearchFilter';
import SearchFilters from "../components/searchFilters";

function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(new SearchFilter());
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    
      const params = new URLSearchParams();
      params.set("q", searchQuery.trim());
      if (filters.searchType) params.set("type", filters.searchType);
      if (filters.fieldLocation) params.set("fieldLocation", filters.fieldLocation);
      if (filters.fieldSize) params.set("fieldSize", filters.fieldSize);
      if (filters.fieldLighting) params.set("lighting", filters.fieldLighting);
      if (Array.isArray(filters.fieldType)) filters.fieldType.forEach((t) => params.append("fieldType", t));
      navigate(`/search?${params.toString()}`);
    
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters); // Toggle filter modal visibility
  };

  return (
    <div>
      <h1>Dobrodošli na ServeIt</h1>
      <p>Pronađite termine i rezervirajte teren jednostavno.</p>

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
};

export default Home;
