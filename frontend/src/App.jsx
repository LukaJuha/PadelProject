import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import Home from "./pages/home.jsx";
import Register from "./pages/register.jsx";
import Login from "./pages/login.jsx";
import Profile from "./pages/profile.jsx";
import { UserProvider } from "./user-context.jsx";
import { useContext } from "react";
import UserContext from "./user-context.jsx";
import { useNavigate } from "react-router-dom";
import ProtectedRoute from "./components/protectedRoute.jsx";

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
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </Router>
    </UserProvider>
  );
}

function AppContent() {  
  const [user, setUser] = useContext(UserContext);
  const location = useLocation();
  const navigate = useNavigate();

  const hideNavbarButtons = location.pathname === "/register" || location.pathname === "/login";

  const logout = async () => {
    try {
      const userData = {
        refresh: user.refreshToken,
      };

      const backendURL = (import.meta.env.MODE === 'development') ?  import.meta.env.VITE_API_BASE_URL_LOCAL : import.meta.env.VITE_API_BASE_URL_DEPLOYMENT;
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
        navigate("/");
      } else {
        let data = {};
        try {
          data = await res.json();
        } catch {}
        alert(data.error || "Greška prilikom odjave");
      }
    } catch (error) {
      console.error(error);
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
            <Link to="/profile" style={styles.navButton}>Profil</Link>
            <button style={{ ...styles.navButton, backgroundColor: "#dc3545", color: "white" }} 
            onClick={logout}>
              Odjava
            </button>
          </div> 
          )}
          </>
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
};

export default App;
