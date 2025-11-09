import { useState } from "react";

function Register() {
  const [userType, setUserType] = useState(null);

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>Registracija</h2>

      {!userType && (
        <div>
          <p>Odaberi tip korisnika:</p>
          <button style={selectButton} onClick={() => setUserType("igrac")}>
            🎾 Igrač
          </button>
          <button style={selectButton} onClick={() => setUserType("klub")}>
            🏟️ Klub
          </button>
        </div>
      )}

      {userType && (
        <div style={{ marginTop: "20px" }}>
          <h3>Registracija - {userType === "igrac" ? "Igrač" : "Klub"}</h3>
          <form style={{ display: "inline-block", textAlign: "left" }}>
            {userType === "klub" && (
              <>
                <label>Naziv kluba:</label>
                <input type="text" required style={inputStyle} />
              </>
            )}

            <label>Email:</label>
            <input type="email" required style={inputStyle} />
            <label>Šifra:</label>
            <input type="password" required style={inputStyle} />
            <label>Potvrdi šifru:</label>
            <input type="password" required style={inputStyle} />

            <button style={buttonStyle}>Registruj se</button>
          </form>

          <div style={{ marginTop: "15px" }}>
            <button
              onClick={() => setUserType(null)}
              style={{
                background: "none",
                border: "none",
                color: "#007bff",
                cursor: "pointer",
              }}
            >
              ⬅ Nazad na izbor tipa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const selectButton = {
  margin: "10px",
  padding: "10px 20px",
  fontSize: "1rem",
  borderRadius: "6px",
  border: "1px solid #007bff",
  backgroundColor: "white",
  color: "#007bff",
  cursor: "pointer",
  transition: "0.2s",
};

const inputStyle = {
  display: "block",
  width: "250px",
  padding: "8px",
  marginBottom: "10px",
  borderRadius: "6px",
  border: "1px solid #ccc",
};

const buttonStyle = {
  width: "100%",
  padding: "10px",
  backgroundColor: "#007bff",
  color: "white",
  border: "none",
  borderRadius: "6px",
};

export default Register;
