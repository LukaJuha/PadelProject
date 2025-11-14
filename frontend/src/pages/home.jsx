import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
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
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>Odaberite filtre</h3>
            {/* Add filter options here */}
            <button onClick={toggleFilters} style={styles.closeButton}>
              Zatvori
            </button>
          </div>
        </div>
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
};

export default Home;
