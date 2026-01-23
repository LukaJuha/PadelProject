import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserContext from "../user-context.jsx";
import { ReservationHistory } from "../models/ReservationHistory.js";

function ReservationHistoryPage() {
  const [user] = useContext(UserContext);
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const backendURL =
    import.meta.env.MODE === "development"
      ? import.meta.env.VITE_API_BASE_URL_LOCAL
      : import.meta.env.VITE_API_BASE_URL_DEPLOYMENT;

  useEffect(() => {
    // Wait for user context to hydrate, then guard and fetch
    if (!user?.authenticated || user?.role?.toUpperCase() !== 'PLAYER') {
      return;
    }
    fetchHistory();
  }, [user, navigate]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${backendURL}/reservations/history/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${user?.accessToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        const historyModels = (data.history || []).map((h) =>
          ReservationHistory.fromAPI(h)
        );
        setHistory(historyModels);
      } else {
        alert("Greška pri učitavanju povijest rezervacija");
      }
    } catch (error) {
      console.error("Error fetching reservation history:", error);
      alert("Greška pri učitavanju povijest rezervacija");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p style={styles.container}>Učitavanje...</p>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Povijest Rezervacija</h1>
        <button
          style={{ ...styles.button, backgroundColor: "#6c757d" }}
          onClick={() => navigate("/profile")}
        >
          Nazad na profil
        </button>
      </div>

      {history.length === 0 ? (
        <div style={styles.emptyState}>
          <p>Nema završenih rezervacija.</p>
        </div>
      ) : (
        <div style={styles.section}>
          <div style={styles.historyList}>
            <ul>
              {history.map((item) => {
                const dayNames = [
                  "Nedjelja",
                  "Ponedjeljak",
                  "Utorak",
                  "Srijeda",
                  "Četvrtak",
                  "Petak",
                  "Subota",
                ];
                const dayIndex = item.dayOfWeek;
                const bookingDate = new Date(item.bookingDate);
                const formattedDate = bookingDate.toLocaleDateString("hr-HR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });

                return (
                  <li key={item.id} style={styles.historyItem}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <strong>{item.fieldName} - {item.bookingTitle}</strong>
                        <br />
                        <span style={{ color: "#666", fontSize: "14px" }}>
                          {dayNames[dayIndex]} {item.startTime}-{item.endTime}
                        </span>
                        <br />
                        <span style={{ color: "#888", fontSize: "12px" }}>
                          Datum: {formattedDate}
                        </span>
                        <br />
                        <span style={{ color: "#888", fontSize: "12px" }}>
                          Plaćanje: {ReservationHistory.PAYMENT_METHODS_HR[item.paymentMethod] || "N/A"} |
                          Status: {ReservationHistory.PAYMENT_STATUS_HR[item.paymentStatus] || "N/A"}
                        </span>
                      </div>
                      <button
                        style={{ ...styles.button, padding: "5px 10px", fontSize: "12px" }}
                        onClick={() => navigate(`/club/${item.clubId}`)}
                      >
                        Provjeri Klub
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
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
    alignItems: "center",
    marginBottom: "30px",
    borderBottom: "2px solid #dee2e6",
    paddingBottom: "20px",
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
  },
  section: {
    marginBottom: "40px",
  },
  button: {
    padding: "10px 20px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "16px",
  },
  historyList: {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "20px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  historyItem: {
    padding: "15px",
    borderBottom: "1px solid #dee2e6",
    listStyleType: "none",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
};

export default ReservationHistoryPage;
