import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserContext from "../user-context.jsx";
import { Review } from "../models/Review";
import { getBackendURL } from '../utils/api';

function UserReviews() {
  const { userId } = useParams();
  const [user] = useContext(UserContext);
  const navigate = useNavigate();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchUserReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const backendURL = getBackendURL();
      const res = await fetch(`${backendURL}/reviews/user/${userId}/`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      const items = (data.reviews || data || []).map(r => Review.fromAPI(r));
      setReviews(items);
    } catch (err) {
      setError(err.message || "Failed to fetch reviews");
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    } catch {
      return dateString;
    }
  };

  const renderStars = (rating) => {
    const starElements = [];
    for (let i = 0; i < 5; i++) {
      starElements.push(
        <img
          key={i}
          src="/star.png"
          alt="star"
          style={{
            width: '20px',
            height: '20px',
            opacity: i < rating ? 1 : 0.3,
            marginRight: '4px',
            display: 'inline-block'
          }}
        />
      );
    }
    return starElements;
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          ← Nazad
        </button>
      </div>

      <h2>Moje Recenzije</h2>
      {loading && <p>Učitavanje recenzija...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div>
        {reviews.length === 0 ? (
          <p>Niste ostavili nijednu recenziju.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {reviews.map((r) => (
              <li key={r.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
                <div style={{ fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '12px' }}>
                    {renderStars(r.rating)}
                  </span>
                </div>
                <div style={{ color: '#333', fontSize: '14px', marginBottom: '4px' }}>
                  <strong>Klub: {r.clubName || 'Unknown'}</strong>
                </div>
                <div style={{ color: '#555', marginBottom: '4px' }}>{r.comment}</div>
                <div style={{ fontSize: '0.85em', color: '#999' }}>{formatDateTime(r.uploadedAt)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default UserReviews;
