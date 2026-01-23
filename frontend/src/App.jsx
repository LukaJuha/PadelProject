import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import Home from "./pages/home.jsx";
import Register from "./pages/register.jsx";
import Login from "./pages/login.jsx";
import Profile from "./pages/profile.jsx";
import Search from "./pages/search.jsx";
import Management from "./pages/management.jsx";
import FieldDetail from "./pages/fieldDetail.jsx";
import ClubProfile from "./pages/clubProfile.jsx";
import PublicFieldView from "./pages/publicFieldView.jsx";
import Reviews from "./pages/reviews.jsx";
import UserReviews from "./pages/userReviews.jsx";
import Reservations from "./pages/reservations.jsx";
import ReservationHistoryPage from "./pages/reservationHistory.jsx";
import NotificationsPage from "./pages/notifications.jsx";
import Administration from "./pages/administration.jsx";
import ClubOffers from "./pages/clubOffers.jsx";
import PlayerOffers from "./pages/playerOffers.jsx";
import MyActiveOffers from "./pages/myActiveOffers.jsx";
import { UserProvider } from "./user-context.jsx";
import { useContext, useEffect, useState  } from "react";
import UserContext from "./user-context.jsx";
import { useNavigate } from "react-router-dom";
import { getBackendURL } from './utils/api';

function App() {
  return (
    <UserProvider>
      <Router>
        <nav style={styles.navbar}>
          <AppContent />
        </nav>
        <main style={styles.main}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/profile"
              element={<Profile />}
            />
            <Route
              path="/management"
              element={<Management />}
            />
            <Route
              path="/management/field/:fieldId"
              element={<FieldDetail />}
            />
            <Route path="/club/:clubId" element={<ClubProfile />} />
            <Route path="/reviews/:clubId" element={<Reviews />} />
            <Route path="/reviews/user/:userId" element={<UserReviews />} />
            <Route path="/club/:clubId/field/:fieldId" element={<PublicFieldView />} />
            <Route path="/club/:clubId/offers" element={<PlayerOffers />} />
            <Route
              path="/offers"
              element={<ClubOffers />}
            />
            <Route
              path="/reservations"
              element={<Reservations />}
            />
            <Route
              path="/reservation-history"
              element={<ReservationHistoryPage />}
            />
            <Route
              path="/administration"
              element={<Administration />}
            />
            <Route
              path="/notifications"
              element={<NotificationsPage />}
            />
            <Route path="/search" element={<Search />} />
            <Route path="/my-active-offers" element={<MyActiveOffers />} />
          </Routes>
        </main>
      </Router>
    </UserProvider>
  );
}

function AppContent() {  
  const [user, setUser] = useContext(UserContext);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [lastNotifs, setLastNotifs] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();

  const hideNavbarButtons = location.pathname === "/register" || location.pathname === "/login";

  const logout = async () => {
    try {
      // Set loggingOut flag to prevent ProtectedRoute redirect race condition
      setUser({ ...user, loggingOut: true });

      const userData = {
        refresh: user.refreshToken,
      };

      const backendURL = getBackendURL();
      const res = await fetch(backendURL + "/auth/logout/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (res.status === 205) {
        setUser(null);
        navigate("/");
      } else if (res.ok) {
        const data = await res.json();
        setUser(null);
        localStorage.removeItem("user");
        navigate("/");
      } else {
        let data = {};
        try {
          data = await res.json();
        } catch {}
        alert(data.error || "Greška prilikom odjave");
        setUser({ ...user, loggingOut: false });
      }
    } catch (error) {
      console.error(error);
      setUser({ ...user, loggingOut: false });
    }
  }

  return (
    <>
      <div style={styles.logo}>
        <a href="/"><img style={styles.icon} src="/logo.png" alt="ikona" /></a>
        <Link to="/" style={styles.logoLink}>ServeIt</Link>
      </div>

          {!hideNavbarButtons && (
          <>
          {!user?.authenticated && (
          <div style={styles.navRight}>
            <Link to="/login" style={styles.navButton}>Prijava</Link>
            <Link to="/register" style={{ ...styles.navButton, backgroundColor: "#007bff", color: "white" }}>
              Registracija
            </Link>
          </div>
          )}

          {user?.authenticated && (
          <div style={styles.navRight}>
            <button
              aria-label="Notifikacije"
              onClick={async () => {
                const backendURL = getBackendURL();
                try {
                  const res = await fetch(backendURL + "/notifications/last/?count=5", {
                    headers: { "Authorization": `Bearer ${user?.accessToken}` }
                  });
                  if (res.ok) {
                    const data = await res.json();
                    setLastNotifs(data.notifications || []);
                  }
                } catch (e) { console.error(e); }
                setShowNotifMenu((v) => !v);
              }}
              style={{ ...styles.navButton, padding: 0, backgroundColor: 'transparent' }}
            >
              <img src="/notification.png" alt="notifikacije" style={{ height: '1.6em' }} />
            </button>
            {user?.role?.toUpperCase() === 'CLUB' && (
              <>
                <Link to="/management" style={styles.navButton}>Upravljanje</Link>
                <Link to="/offers" style={styles.navButton}>Ponude</Link>
              </>
            )}
            {user?.role?.toUpperCase() === 'PLAYER' && (
              <Link to="/reservations" style={styles.navButton}>Rezervacije</Link>
            )}
            {user?.role?.toUpperCase() === 'ADMIN' && (
              <Link to="/administration" style={styles.navButton}>Administracija</Link>
            )}
            <Link to="/profile" style={styles.navButton}>Profil</Link>
            <button style={{ ...styles.navButton, backgroundColor: "#dc3545", color: "white" }} 
            onClick={logout}>
              Odjava
            </button>
          </div> 
          )}
          </>
        )}
      {showNotifMenu && (
        <div style={styles.notifMenu}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Notifikacije</strong>
            <button onClick={() => setShowNotifMenu(false)} style={{ ...styles.navButton, padding: '6px 10px' }}>Zatvori</button>
          </div>
          <ul style={{ listStyleType: 'none', padding: 0, marginTop: '10px' }}>
            {lastNotifs.length === 0 && (<li style={{ color: '#666' }}>Nema novih notifikacija</li>)}
            {lastNotifs.map(n => (
              <li key={n.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
                <div style={{ fontWeight: n.is_read ? 'normal' : 'bold' }}>
                  {n.title}
                </div>
                <div style={{ color: '#666', fontSize: '0.9em' }}>{n.message}</div>
                {!n.is_read && <span style={{ color: '#28a745', fontSize: '0.8em' }}>• nepročitano</span>}
              </li>
            ))}
          </ul>
          <button onClick={() => { setShowNotifMenu(false); navigate('/notifications'); }} style={{ ...styles.navButton, width: '100%', marginTop: '10px', backgroundColor: '#007bff', color: 'white' }}>
            Sve notifikacije
          </button>
        </div>
      )}
      </>
  );
}

const styles = {
  navbar: {
    width: "100%",
    backgroundColor: "white",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    padding: "1rem 2rem 1rem 1rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    position: "fixed",
    top: 0,
    left: 0,
    zIndex: 100,
  },
  logo: {
    fontWeight: "bold",
    fontSize: "1.4rem",
  },
  logoLink: {
    textDecoration: "none",
    fontSize: "1.3em",
    color: "#007bff",
    marginLeft: "8px",
  },
  navRight: {
    display: "flex",
    gap: "1rem",
  },
  navButton: {
    padding: "0.6rem 1.2rem",
    borderRadius: "6px",
    backgroundColor: "#f3f4f6",
    color: "#333",
    fontWeight: "500",
    textDecoration: "none",
    transition: "background-color 0.2s",
  },
  main: {
    paddingTop: "100px",
    textAlign: "center",
  },
  icon: {
    marginTop: "15px",
    height: "1em",
  },
  notifMenu: {
    position: 'fixed',
    top: '60px',
    right: '20px',
    backgroundColor: 'white',
    border: '1px solid #eee',
    borderRadius: '8px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
    padding: '12px',
    width: '320px',
    zIndex: 110,
  }
};

export default App;
