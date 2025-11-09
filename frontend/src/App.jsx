import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";

function App() {
  return (
    <Router>
      <nav style={styles.navbar}>
        <div style={styles.logo}>
          <Link to="/" style={styles.logoLink}>🎾 PadelZone</Link>
        </div>

        <div style={styles.navRight}>
          <Link to="/login" style={styles.navButton}>Login</Link>
          <Link to="/register" style={{ ...styles.navButton, backgroundColor: "#007bff" }}>
            Sign Up
          </Link>
        </div>
      </nav>

      <main style={styles.main}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
    </Router>
  );
}

const styles = {
  navbar: {
    width: "100%",
    backgroundColor: "white",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    padding: "1rem 2rem",
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
    color: "#007bff",
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
    paddingTop: "100px", // da sadržaj ne ide ispod navbar-a
    textAlign: "center",
  },
};

export default App;
