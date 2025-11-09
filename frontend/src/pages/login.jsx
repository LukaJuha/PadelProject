function Login() {
  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>Prijava</h2>
      <form style={{ display: "inline-block", textAlign: "left" }}>
        <label>Email:</label>
        <input type="email" required style={inputStyle} />
        <label>Šifra:</label>
        <input type="password" required style={inputStyle} />
        <button style={buttonStyle}>Uloguj se</button>
      </form>
    </div>
  );
}

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

export default Login;
