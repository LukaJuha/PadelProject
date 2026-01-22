import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserContext from "../user-context.jsx";
import { Review } from "../models/Review";


function Reviews() {
  const { clubId } = useParams();
  const [user] = useContext(UserContext);
  const navigate = useNavigate();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const backendURL = (import.meta.env.MODE === 'development') ?  import.meta.env.VITE_API_BASE_URL_LOCAL : import.meta.env.VITE_API_BASE_URL_DEPLOYMENT;

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  const fetchReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${backendURL}/reviews/club/${clubId}/`);
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

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user?.authenticated) {
      // redirect to login
      navigate('/login');
      return;
    }
    if (!comment.trim()) return;

    setSubmitting(true);
    try {
      const payload = {
        club_id: parseInt(clubId, 10),
        comment: comment.trim(),
        rating: parseFloat(rating)
      };

      const headers = { 'Content-Type': 'application/json' };
      if (user?.accessToken) headers['Authorization'] = `Bearer ${user.accessToken}`;

      const res = await fetch(`${backendURL}/reviews/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server ${res.status}`);

      // refresh list and clear form
      setComment("");
      setRating(5);
      fetchReviews();
    } catch (err) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
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
      <h2>Recenzije kluba</h2>
      {loading && <p>Učitavanje recenzija...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div>
        {reviews.length === 0 ? (
          <p>Nema recenzija za ovaj klub.</p>
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
                  <strong>{r.username || 'Anonymous'}</strong>
                </div>
                <div style={{ color: '#555', marginBottom: '4px' }}>{r.comment}</div>
                <div style={{ fontSize: '0.85em', color: '#999' }}>{formatDateTime(r.uploadedAt)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <hr />

      <h3>Dodaj recenziju</h3>
      {!user?.authenticated && (
        <p>Morate se prijaviti kako biste ostavili recenziju. <a href="/login">Prijava</a></p>
      )}

      {user?.authenticated && user?.role?.toUpperCase() !== 'PLAYER' && (
        <p style={{ color: '#dc3545' }}>Samo igrači mogu ostaviti recenzije.</p>
      )}

      {user?.authenticated && user?.role?.toUpperCase() === 'PLAYER' && (
        <form onSubmit={submitReview}>
          <label>Ocjena:</label>
          <select value={rating} onChange={(e) => setRating(e.target.value)} style={{ marginLeft: 8 }}>
            <option value={5}>5</option>
            <option value={4}>4</option>
            <option value={3}>3</option>
            <option value={2}>2</option>
            <option value={1}>1</option>
          </select>

          <div style={{ marginTop: 8 }}>
            <textarea
              placeholder="Napišite svoju recenziju..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              style={{ width: '100%', padding: 8 }}
            />
          </div>

          <div style={{ marginTop: 8 }}>
            <button type="submit" disabled={submitting} style={{ padding: '8px 12px' }}>
              {submitting ? 'Slanje...' : 'Pošalji recenziju'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default Reviews;
