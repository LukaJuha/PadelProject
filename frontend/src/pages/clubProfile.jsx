import { useState, useContext, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserContext from "../user-context";
import { Club, Field } from "../models";
import { getBackendURL } from '../utils/api';


function ClubProfile() {
  const [user] = useContext(UserContext);
  const { clubId } = useParams();
  const navigate = useNavigate();

  const [club, setClub] = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClubData();
  }, [clubId]);

  const fetchClubData = async () => {
    try {
      const backendURL = getBackendURL();
      const headers = {};
      if (user?.accessToken) {
        headers["Authorization"] = `Bearer ${user.accessToken}`;
      }

      const res = await fetch(`${backendURL}/clubs/${clubId}/`, {
        method: "GET",
        headers: headers,
      });

      if (res.ok) {
        const data = await res.json();
        setClub(Club.fromAPI(data.club));
        setFields((data.fields || []).map(f => Field.fromAPI(f)));
      } else {
        alert("Greška pri učitavanju kluba");
        navigate("/");
      }
    } catch (error) {
      console.error("Error fetching club:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p style={styles.container}>Učitavanje...</p>;
  }

  if (!club) {
    return <p style={styles.container}>Klub nije pronađen</p>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1>{club.name}</h1>
          <p style={styles.subtitle}>
            {club.email || "Email nije dostupan"}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            style={styles.offersButton}
            onClick={() => navigate(`/club/${clubId}/offers`)}
          >
            Ponude Kluba
          </button>
          <button
            style={styles.reviewsButton}
            onClick={() => navigate(`/reviews/${clubId}`)}
          >
            <img src="/star.png" alt="star" style={{ width: '18px', height: '18px', marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} />
            Vidi Recenzije
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <h2>O Klubu</h2>
        <div style={styles.infoCard}>
          <p><strong>Naziv:</strong> {club.name}</p>
          <p><strong>Email:</strong> {club.email}</p>
        </div>
      </div>

      <div style={styles.section}>
        <h2>Tereni Kluba ({fields.length})</h2>
        {fields.length === 0 ? (
          <p>Klub nema dodanih terena.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Naziv</th>
                <th style={styles.th}>Tip podloge</th>
                <th style={styles.th}>Veličina</th>
                <th style={styles.th}>Lokacija</th>
                <th style={styles.th}>Osvjetljenje</th>
                <th style={styles.th}>Akcije</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => (
                <tr key={field.id}>
                  <td style={styles.td}>{field.name}</td>
                  <td style={styles.td}>{Field.FLOOR_TYPES_HR[field.floorType] || field.floorType}</td>
                  <td style={styles.td}>{Field.SIZES_HR[field.size] || field.size}</td>
                  <td style={styles.td}>{Field.LOCATIONS_HR[field.location] || field.location}</td>
                  <td style={styles.td}>{Field.LIGHTING_HR[field.lighting]}</td>
                  <td style={styles.td}>
                    <button
                      style={styles.actionButton}
                      onClick={() => navigate(`/club/${clubId}/field/${field.id}`)}
                    >
                      Detalji
                    </button>
                  </td>
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
  container: {
    padding: "20px",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "30px",
    borderBottom: "2px solid #dee2e6",
    paddingBottom: "20px",
  },
  subtitle: {
    color: "#666",
    margin: "5px 0 0 0",
    fontSize: "14px",
  },
  section: {
    marginBottom: "40px",
  },
  infoCard: {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "20px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: "white",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  th: {
    backgroundColor: "#007bff",
    color: "white",
    padding: "12px",
    textAlign: "left",
    borderBottom: "2px solid #0056b3",
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid #dee2e6",
  },
  actionButton: {
    padding: "5px 10px",
    backgroundColor: "#17a2b8",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
  },
  reviewsButton: {
    padding: "8px 16px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
  },
  offersButton: {
    padding: "8px 16px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
  },
};

export default ClubProfile;
