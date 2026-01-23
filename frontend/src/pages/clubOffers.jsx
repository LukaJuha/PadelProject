import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserContext from "../user-context";
import { Offer } from "../models";
import { PayPalButtons } from "@paypal/react-paypal-js";
import { getBackendURL } from '../utils/api';

function ClubOffers() {
  const [user] = useContext(UserContext);
  const navigate = useNavigate();

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const [newOffer, setNewOffer] = useState({
    name: "",
    description: "",
    monthly_price: "",
    offer_type: "SUBSCRIPTION",
    discount_percentage: "",
    tutor_name: ""
  });

  useEffect(() => {
    if (!user?.authenticated) {
      navigate("/login");
      return;
    }

    if (user.role !== 'CLUB') {
      alert("Samo klubovi mogu upravljati ponudama");
      navigate("/");
      return;
    }

    setLoading(false);
    fetchOffers();
  }, [user, navigate]);

  const fetchOffers = async () => {
    try {
      const backendURL = getBackendURL();
      const res = await fetch(`${backendURL}/clubs/${user.userId}/offers/`, {
        headers: {
          "Authorization": `Bearer ${user.accessToken}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setOffers((data.offers || []).map(o => Offer.fromAPI(o)));
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
    }
  };

  const handleCreateOffer = async (e) => {
    e.preventDefault();

    if (newOffer.offer_type === 'SUBSCRIPTION' && (!newOffer.discount_percentage || newOffer.discount_percentage < 0 || newOffer.discount_percentage > 100)) {
      alert("Popust mora biti između 0 i 100%");
      return;
    }

    if (newOffer.offer_type === 'TUTORING' && !newOffer.tutor_name) {
      alert("Molimo unesite ime trenera");
      return;
    }

    try {
      const backendURL = getBackendURL();
      const res = await fetch(`${backendURL}/offers/create/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${user.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(newOffer)
      });

      if (res.ok) {
        alert("Ponuda uspješno kreirana!");
        setShowCreateForm(false);
        setNewOffer({
          name: "",
          description: "",
          monthly_price: "",
          offer_type: "SUBSCRIPTION",
          discount_percentage: "",
          tutor_name: ""
        });
        fetchOffers();
      } else {
        const data = await res.json();
        alert(data.error || "Greška pri kreiranju ponude");
      }
    } catch (error) {
      console.error("Error creating offer:", error);
      alert("Greška pri kreiranju ponude");
    }
  };

  const handleDeleteOffer = async (offerId) => {
    if (!confirm("Jeste li sigurni da želite obrisati ovu ponudu?")) {
      return;
    }

    try {
      const backendURL = getBackendURL();
      const res = await fetch(`${backendURL}/offers/${offerId}/`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${user.accessToken}`
        }
      });

      if (res.ok) {
        alert("Ponuda uspješno obrisana");
        fetchOffers();
      } else {
        const data = await res.json();
        alert(data.error || "Greška pri brisanju ponude");
      }
    } catch (error) {
      console.error("Error deleting offer:", error);
      alert("Greška pri brisanju ponude");
    }
  };

  if (loading) {
    return <p style={styles.container}>Učitavanje...</p>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Upravljanje Ponudama</h1>
        <button 
          style={styles.addButton}
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? "Otkaži" : "+ Dodaj Ponudu"}
        </button>
      </div>

      {showCreateForm && (
        <form style={styles.form} onSubmit={handleCreateOffer}>
          <h2>Nova Ponuda</h2>
          
          <div style={styles.formGroup}>
            <label>Naziv:</label>
            <input
              type="text"
              required
              style={styles.input}
              value={newOffer.name}
              onChange={(e) => setNewOffer({...newOffer, name: e.target.value})}
            />
          </div>

          <div style={styles.formGroup}>
            <label>Opis:</label>
            <textarea
              style={styles.textarea}
              value={newOffer.description}
              onChange={(e) => setNewOffer({...newOffer, description: e.target.value})}
              rows="3"
            />
          </div>

          <div style={styles.formGroup}>
            <label>Mjesečna Cijena (EUR):</label>
            <input
              type="number"
              step="0.01"
              required
              style={styles.input}
              value={newOffer.monthly_price}
              onChange={(e) => setNewOffer({...newOffer, monthly_price: e.target.value})}
            />
          </div>

          <div style={styles.formGroup}>
            <label>Tip Ponude:</label>
            <select
              style={styles.select}
              value={newOffer.offer_type}
              onChange={(e) => setNewOffer({...newOffer, offer_type: e.target.value})}
            >
              <option value="SUBSCRIPTION">Pretplata</option>
              <option value="TUTORING">Trening</option>
            </select>
          </div>

          {newOffer.offer_type === 'SUBSCRIPTION' && (
            <div style={styles.formGroup}>
              <label>Popust (%):</label>
              <input
                type="number"
                min="0"
                max="100"
                required
                style={styles.input}
                value={newOffer.discount_percentage}
                onChange={(e) => setNewOffer({...newOffer, discount_percentage: e.target.value})}
              />
            </div>
          )}

          {newOffer.offer_type === 'TUTORING' && (
            <div style={styles.formGroup}>
              <label>Ime Trenera:</label>
              <input
                type="text"
                required
                style={styles.input}
                value={newOffer.tutor_name}
                onChange={(e) => setNewOffer({...newOffer, tutor_name: e.target.value})}
              />
            </div>
          )}

          <button type="submit" style={styles.submitButton}>
            Kreiraj Ponudu
          </button>
        </form>
      )}

      <div style={styles.section}>
        <h2>Aktivne Ponude ({offers.length})</h2>
        {offers.length === 0 ? (
          <p>Nemate kreiranih ponuda</p>
        ) : (
          <div style={styles.offersGrid}>
            {offers.map(offer => (
              <div key={offer.id} style={styles.offerCard}>
                <div style={styles.offerHeader}>
                  <h3>{offer.name}</h3>
                  <span style={styles.offerType}>
                    {Offer.OFFER_TYPES_HR[offer.offerType]}
                  </span>
                </div>
                
                <p style={styles.offerDescription}>{offer.description}</p>
                
                <div style={styles.offerDetails}>
                  <p><strong>Cijena:</strong> {offer.monthlyPrice} EUR/mjesec</p>
                  
                  {offer.offerType === 'SUBSCRIPTION' && (
                    <p><strong>Popust:</strong> {offer.discountPercentage}%</p>
                  )}
                  
                  {offer.offerType === 'TUTORING' && (
                    <p><strong>Trener:</strong> {offer.tutorName}</p>
                  )}
                </div>
                
                <button
                  style={styles.deleteButton}
                  onClick={() => handleDeleteOffer(offer.id)}
                >
                  Obriši
                </button>
              </div>
            ))}
          </div>
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
    alignItems: "center",
    marginBottom: "30px",
    borderBottom: "2px solid #dee2e6",
    paddingBottom: "20px",
  },
  addButton: {
    padding: "10px 20px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "16px",
  },
  form: {
    backgroundColor: "#f8f9fa",
    padding: "20px",
    borderRadius: "8px",
    marginBottom: "30px",
  },
  formGroup: {
    marginBottom: "15px",
  },
  input: {
    width: "100%",
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    fontSize: "14px",
  },
  textarea: {
    width: "100%",
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    fontSize: "14px",
    resize: "vertical",
  },
  select: {
    width: "100%",
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    fontSize: "14px",
  },
  submitButton: {
    padding: "10px 20px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "16px",
    marginTop: "10px",
  },
  section: {
    marginTop: "30px",
  },
  offersGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "20px",
    marginTop: "20px",
  },
  offerCard: {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "20px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  offerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "10px",
  },
  offerType: {
    padding: "4px 8px",
    backgroundColor: "#007bff",
    color: "white",
    borderRadius: "4px",
    fontSize: "12px",
  },
  offerDescription: {
    color: "#666",
    fontSize: "14px",
    marginBottom: "15px",
  },
  offerDetails: {
    marginBottom: "15px",
  },
  bookingList: {
    marginTop: "5px",
    marginLeft: "20px",
    fontSize: "14px",
  },
  deleteButton: {
    width: "100%",
    padding: "8px",
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
  },
  bookingsList: {
    maxHeight: "200px",
    overflowY: "auto",
    border: "1px solid #ccc",
    borderRadius: "4px",
    padding: "10px",
    backgroundColor: "white",
  },
  checkboxLabel: {
    display: "block",
    marginBottom: "8px",
    cursor: "pointer",
  },
};

export default ClubOffers;
