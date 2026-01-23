import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import UserContext from '../user-context';
import { Notification } from '../models/Notification';
import { getBackendURL } from '../utils/api';

function NotificationsPage() {
  const [user] = useContext(UserContext);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.authenticated) {
      navigate("/login");
      return;
    }
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const backendURL = getBackendURL();
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
      const backendURL = getBackendURL();
      const res = await fetch(`${backendURL}/notifications/${id}/read/`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${user?.accessToken}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      }
    } catch (e) { console.error(e); }
  };

  const approveReservation = async (reservationId, notificationId) => {
    try {
      const backendURL = getBackendURL();
      const res = await fetch(`${backendURL}/reservations/${reservationId}/approve/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ approved: true })
      });
      if (res.ok) {
        alert('Rezervacija je odobrena!');
        markRead(notificationId);
        fetchAll();
      } else {
        alert('Greška pri odobravanju rezervacije');
      }
    } catch (e) { 
      console.error(e);
      alert('Greška pri odobravanju rezervacije');
    }
  };

  const rejectReservation = async (reservationId, notificationId) => {
    try {
      const backendURL = getBackendURL();
      const res = await fetch(`${backendURL}/reservations/${reservationId}/approve/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ approved: false })
      });
      if (res.ok) {
        alert('Rezervacija je odbijena!');
        markRead(notificationId);
        fetchAll();
      } else {
        alert('Greška pri odbijanju rezervacije');
      }
    } catch (e) { 
      console.error(e);
      alert('Greška pri odbijanju rezervacije');
    }
  };

  if (loading) return <div style={styles.container}>Učitavanje...</div>;

  return (
    <div style={styles.container}>
      <h1>Notifikacije</h1>
      {notifications.length === 0 ? (
        <p style={{ color: '#666' }}>Nemate notifikacija.</p>
      ) : (
        <ul style={styles.list}>
          {notifications.map(n => {
            // Check if this is a reservation approval notification
            const isReservationNotification = n.title && (n.title.includes('Rezervacija za') || n.title.includes('novog'));
            const reservationId = n.reservationId || null;
            
            return (
              <li key={n.id} style={{ ...styles.item, backgroundColor: n.isRead ? '#fff' : '#f0f8ff' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: n.isRead ? 'normal' : 'bold' }}>{n.title}</div>
                  <div style={{ color: '#666', fontSize: '0.9em' }}>{n.message}</div>
                  {!n.isRead && <span style={{ color: '#28a745', fontSize: '0.8em' }}>• nepročitano</span>}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {isReservationNotification && reservationId && user?.role === 'CLUB' && !n.isRead && (
                    <>
                      <button 
                        style={{ ...styles.button, backgroundColor: '#28a745' }}
                        onClick={() => approveReservation(reservationId, n.id)}
                      >
                        Odobri
                      </button>
                      <button 
                        style={{ ...styles.button, backgroundColor: '#dc3545' }}
                        onClick={() => rejectReservation(reservationId, n.id)}
                      >
                        Odbij
                      </button>
                    </>
                  )}
                  {!isReservationNotification && !n.isRead && (
                    <button style={styles.button} onClick={() => markRead(n.id)}>
                      Označi kao pročitano
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '20px', maxWidth: '900px', margin: '0 auto', textAlign: 'left' },
  list: { listStyleType: 'none', padding: 0 },
  item: { display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid #eee', padding: '12px 0' },
  button: { padding: '6px 10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }
};

export default NotificationsPage;
