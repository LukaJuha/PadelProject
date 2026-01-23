import { useState, useContext, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import UserContext from "../user-context";
import { Offer, PlayerOffer } from "../models";
import { PayPalButtons } from "@paypal/react-paypal-js";
import { getBackendURL } from '../utils/api';

function PlayerOffers() {
  const [user] = useContext(UserContext);
  const navigate = useNavigate();
  const { clubId } = useParams();

  const [availableOffers, setAvailableOffers] = useState([]);
  const [myOffers, setMyOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (!user?.authenticated) {
      navigate("/login");
      return;
    }

    if (user.role !== 'PLAYER') {
      alert("Samo igrači mogu pregledavati ponude");
      navigate("/");
      return;
    }

    setLoading(false);
    fetchAvailableOffers();
    fetchMyOffers();
  }, [user, navigate, clubId]);

  const fetchAvailableOffers = async () => {
    try {
      const backendURL = getBackendURL();
      const res = await fetch(`${backendURL}/clubs/${clubId}/offers/`, {
        headers: {
          "Authorization": `Bearer ${user.accessToken}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setAvailableOffers((data.offers || []).map(o => Offer.fromAPI(o)));
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
    }
  };

  const fetchMyOffers = async () => {
    try {
      const backendURL = getBackendURL();
      const res = await fetch(`${backendURL}/player/offers/`, {
        headers: {
          "Authorization": `Bearer ${user.accessToken}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setMyOffers((data.offers || []).map(o => PlayerOffer.fromAPI(o)));
      }
    } catch (error) {
      console.error("Error fetching my offers:", error);
    }
  };

  const handlePurchaseOffer = (offer) => {
    setSelectedOffer(offer);
    setShowPurchaseModal(true);
  };

  const createPurchase = async (paypalOrderId) => {
    try {
      const backendURL = getBackendURL();
      setProcessingPayment(true);

      const res = await fetch(`${backendURL}/offers/${selectedOffer.id}/purchase/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${user.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          paypal_order_id: paypalOrderId
        })
      });

      if (res.ok) {
        alert("Ponuda uspješno kupljena!");
        setShowPurchaseModal(false);
        setSelectedOffer(null);
        setProcessingPayment(false);
        fetchMyOffers();
      } else {
        const data = await res.json();
        alert(data.error || "Greška pri kupovini ponude");
        setProcessingPayment(false);
      }
    } catch (error) {
      console.error("Error purchasing offer:", error);
      alert("Greška pri kupovini ponude");
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return <p style={styles.container}>Učitavanje...</p>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Ponude Kluba</h1>
        <button
          style={styles.backButton}
          onClick={() => navigate(`/club/${clubId}`)}
        >
          Nazad na Klub
        </button>
      </div>

      {/* My Active Offers */}
      {myOffers.length > 0 && (
        <div style={styles.section}>
          <h2>Moje Aktivne Ponude</h2>
          <div style={styles.offersGrid}>
            {myOffers.map(offer => (
              <div key={offer.id} style={styles.myOfferCard}>
                <div style={styles.offerHeader}>
                  <h3>{offer.offerName}</h3>
                  <span style={styles.activeLabel}>Aktivno</span>
                </div>
                
                <div style={styles.offerDetails}>
                  <p><strong>Klub:</strong> {offer.clubName}</p>
                  <p><strong>Tip:</strong> {Offer.OFFER_TYPES_HR[offer.offerType]}</p>
                  <p><strong>Cijena:</strong> {offer.monthlyPrice} EUR/mjesec</p>
                  
                  {offer.offerType === 'SUBSCRIPTION' && (
                    <p><strong>Popust:</strong> {offer.discountPercentage}%</p>
                  )}
                  
                  {offer.offerType === 'TUTORING' && (
                    <p><strong>Trener:</strong> {offer.tutorName}</p>
                  )}
                  
                  <p><strong>Ističe:</strong> {new Date(offer.expiresAt).toLocaleDateString('hr-HR')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Offers */}
      <div style={styles.section}>
        <h2>Dostupne Ponude</h2>
        {availableOffers.length === 0 ? (
          <p>Klub trenutno nema dostupnih ponuda</p>
        ) : (
          <div style={styles.offersGrid}>
            {availableOffers.map(offer => {
              const hasActiveOfferOfType = myOffers.some(
                mo => mo.offerType === offer.offerType
              );

              return (
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
                    style={hasActiveOfferOfType ? styles.disabledButton : styles.purchaseButton}
                    onClick={() => !hasActiveOfferOfType && handlePurchaseOffer(offer)}
                    disabled={hasActiveOfferOfType}
                  >
                    {hasActiveOfferOfType 
                      ? `Već imate ${Offer.OFFER_TYPES_HR[offer.offerType].toLowerCase()}`
                      : "Kupi"
                    }
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && selectedOffer && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2>Kupi Ponudu</h2>
            <p><strong>Ponuda:</strong> {selectedOffer.name}</p>
            <p><strong>Cijena:</strong> {selectedOffer.monthlyPrice} EUR/mjesec</p>
            <p><strong>Trajanje:</strong> 30 dana</p>
            
            <div style={styles.paypalContainer}>
              <p>Plaćanje putem PayPal-a:</p>
              <PayPalButtons
                createOrder={(data, actions) => {
                  return actions.order.create({
                    purchase_units: [
                      {
                        amount: {
                          value: selectedOffer.monthlyPrice,
                          currency_code: "EUR"
                        },
                        description: `${selectedOffer.name} - Monthly Subscription`
                      }
                    ]
                  });
                }}
                onApprove={(data, actions) => {
                  return actions.order.capture().then((details) => {
                    createPurchase(details.id);
                  });
                }}
                onError={(err) => {
                  console.error("PayPal error:", err);
                  alert("Greška pri plaćanju");
                  setProcessingPayment(false);
                }}
                disabled={processingPayment}
              />
            </div>
            
            <button
              style={styles.cancelButton}
              onClick={() => {
                setShowPurchaseModal(false);
                setSelectedOffer(null);
              }}
              disabled={processingPayment}
            >
              Otkaži
            </button>
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
  backButton: {
    padding: "10px 20px",
    backgroundColor: "#6c757d",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "16px",
  },
  section: {
    marginBottom: "40px",
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
    border: "2px solid #dee2e6",
  },
  myOfferCard: {
    backgroundColor: "#e7f3ff",
    borderRadius: "8px",
    padding: "20px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    border: "2px solid #007bff",
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
  activeLabel: {
    padding: "4px 8px",
    backgroundColor: "#28a745",
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
  purchaseButton: {
    width: "100%",
    padding: "10px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
  },
  disabledButton: {
    width: "100%",
    padding: "10px",
    backgroundColor: "#6c757d",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "not-allowed",
    fontSize: "14px",
    opacity: 0.6,
  },
  modal: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "30px",
    maxWidth: "500px",
    width: "90%",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  paypalContainer: {
    margin: "20px 0",
  },
  cancelButton: {
    width: "100%",
    padding: "10px",
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "16px",
    marginTop: "10px",
  },
};

export default PlayerOffers;
