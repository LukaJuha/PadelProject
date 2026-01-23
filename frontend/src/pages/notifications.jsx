import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import UserContext from '../user-context';
import { Notification } from '../models/Notification';

function NotificationsPage() {
  const [user] = useContext(UserContext);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const backendURL = (import.meta.env.MODE === 'development') ? 
    import.meta.env.VITE_API_BASE_URL_LOCAL : import.meta.env.VITE_API_BASE_URL_DEPLOYMENT;

  useEffect(() => {
    if (!user?.authenticated) {
      navigate("/login");
      return;
    }
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const res = await fetch(`${backendURL}/notifications/`, {
        headers: { 'Authorization': `Bearer ${user?.accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications((data.notifications || []).map(Notification.fromAPI));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const markRead = async (id) => {
    try {
      const res = await fetch(`${backendURL}/notifications/${id}/read/`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${user?.accessToken}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      }
    } catch (e) { console.error(e); }
  };

  if (loading) return <div style={styles.container}>Učitavanje...</div>;

  return (
    <div style={styles.container}>
      <h1>Notifikacije</h1>
      {notifications.length === 0 ? (
        <p style={{ color: '#666' }}>Nemate notifikacija.</p>
      ) : (
        <ul style={styles.list}>
          {notifications.map(n => (
            <li key={n.id} style={styles.item}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: n.isRead ? 'normal' : 'bold' }}>{n.title}</div>
                <div style={{ color: '#666', fontSize: '0.9em' }}>{n.message}</div>
                {!n.isRead && <span style={{ color: '#28a745', fontSize: '0.8em' }}>• nepročitano</span>}
              </div>
              {!n.isRead && (
                <button style={styles.button} onClick={() => markRead(n.id)}>Označi kao pročitano</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '20px', maxWidth: '900px', margin: '0 auto', textAlign: 'left' },
  list: { listStyleType: 'none', padding: 0 },
  item: { display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid #eee', padding: '10px 0' },
  button: { padding: '6px 10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }
};

export default NotificationsPage;
