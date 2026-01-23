import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import UserContext from '../user-context';
import { getBackendURL } from '../utils/api';

function MyActiveOffers() {
  const [user] = useContext(UserContext);
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.authenticated || user?.role?.toUpperCase() !== 'PLAYER') {
      navigate("/login");
      return;
    }
    fetchActiveOffers();
  }, [user, navigate]);

  const fetchActiveOffers = async () => {
    try {
      const backendURL = getBackendURL();
      const res = await fetch(`${backendURL}/player/offers/`, {
        headers: { 'Authorization': `Bearer ${user?.accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOffers(data.offers || []);
      } else {
        console.error("Failed to fetch active offers");
      }
    } catch (e) { 
      console.error("Error fetching active offers:", e);
    }
    finally { 
      setLoading(false); 
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('hr-HR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getDaysRemaining = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const daysRemaining = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return daysRemaining;
  };

  if (loading) {
    return <div style={styles.container}>Učitavanje...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Moje Pretplate i Tutorstva</h1>
        <button 
          style={styles.backButton}
          onClick={() => navigate('/profile')}
        >
          ← Povratak na profil
        </button>
      </div>

      {offers.length === 0 ? (
        <div style={styles.emptyState}>
          <p>Nemate aktivnih pretplata ili tutorstva.</p>
          <button 
            style={styles.searchButton}
            onClick={() => navigate('/search')}
          >
            Potražite ponude
          </button>
        </div>
      ) : (
        <div style={styles.offersGrid}>
          {offers.map(offer => {
            const daysRemaining = getDaysRemaining(offer.expires_at);
            const isExpiringSoon = daysRemaining <= 7;
            
            return (
              <div key={offer.id} style={styles.offerCard}>
                <div style={styles.offerHeader}>
                  <div>
                    <h3 style={styles.offerTitle}>{offer.offer_name}</h3>
                    <p style={styles.clubName}>{offer.club_name}</p>
                  </div>
                  <div style={{
                    ...styles.offerType,
                    backgroundColor: offer.offer_type === 'SUBSCRIPTION' ? '#007bff' : '#6f42c1'
                  }}>
                    {offer.offer_type === 'SUBSCRIPTION' ? 'Pretplata' : 'Tutorstvo'}
                  </div>
                </div>

                <div style={styles.offerDetails}>
                  {offer.offer_type === 'SUBSCRIPTION' && (
                    <div style={styles.detailRow}>
                      <span>Popust:</span>
                      <strong>{offer.discount_percentage}%</strong>
                    </div>
                  )}
                  {offer.offer_type === 'TUTORING' && (
                    <div style={styles.detailRow}>
                      <span>Tutor:</span>
                      <strong>{offer.tutor_name}</strong>
                    </div>
                  )}
                  <div style={styles.detailRow}>
                    <span>Kupljena:</span>
                    <strong>{formatDate(offer.purchased_at)}</strong>
                  </div>
                  <div style={{
                    ...styles.detailRow,
                    color: isExpiringSoon ? '#dc3545' : '#666'
                  }}>
                    <span>Ističe:</span>
                    <strong>{formatDate(offer.expires_at)}</strong>
                  </div>
                  <div style={styles.detailRow}>
                    <span>Preostalo:</span>
                    <strong style={{ color: isExpiringSoon ? '#dc3545' : '#28a745' }}>
                      {daysRemaining > 0 ? `${daysRemaining} dana` : 'Isteklo'}
                    </strong>
                  </div>
                </div>

                <div style={styles.statusBadge}>
                  {offer.payment_status === 'PAID' && (
                    <span style={{ color: '#28a745' }}>✓ Plaćeno</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    borderBottom: '2px solid #dee2e6',
    paddingBottom: '20px',
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  searchButton: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    marginTop: '20px',
  },
  offersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
  },
  offerCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #dee2e6',
    display: 'flex',
    flexDirection: 'column',
  },
  offerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px',
  },
  offerTitle: {
    margin: '0 0 5px 0',
    fontSize: '18px',
    color: '#333',
  },
  clubName: {
    margin: '0',
    fontSize: '14px',
    color: '#666',
  },
  offerType: {
    padding: '4px 8px',
    color: 'white',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  offerDetails: {
    flex: 1,
    marginBottom: '15px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
    color: '#333',
  },
  statusBadge: {
    padding: '8px',
    backgroundColor: '#e7f3ff',
    borderRadius: '4px',
    textAlign: 'center',
    fontSize: '13px',
  },
};

export default MyActiveOffers;
