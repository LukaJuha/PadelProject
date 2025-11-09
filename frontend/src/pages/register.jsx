import { useState } from "react";
import "./styles/register.css"
import GoogleLoginButton from "../components/googleOAuthButton";

function Register() {
  const [userType, setUserType] = useState(null);
  return (
    <div className="registerOkvir">
      <h2>Registracija</h2>

      {!userType && (
        <div>
          <p>Odaberi tip korisnika:</p>
          <button className="register-selectUserButton" onClick={() => setUserType("igrac")}>
            Igrač
          </button>
          <button className="register-selectUserButton" onClick={() => setUserType("klub")}>
            Klub
          </button>
        </div>
      )}

      {userType && (
        <div>
          <h3>{userType === "igrac" ? "Igrač" : "Klub"}</h3>

          <form className="registerForm" action="/auth/google" method="GET">
            {userType === "klub" && (
              <>
                <label>Naziv kluba:</label>
                <input type="text" required className="registerInput"/>
              </>
            )}
            {userType === "igrac" && (
              <>
                <label>Username:</label>
                <input type="text" required className="registerInput"/>
              </>
            )}

            <label>Email:</label>
            <input type="email" required className="registerInput"/>
            <label>Šifra:</label>
            <input type="password" required className="registerInput"/>
            <label>Potvrdi šifru:</label>
            <input type="password" required className="registerInput"/>

            <button className="registerButton">Registriraj se</button>
          </form>
          <GoogleLoginButton/>
          <div style={{ marginTop: "15px" }}>
            <button onClick={() => setUserType(null)} className="backToUserChoiceButton">
              Nazad na izbor tipa
            </button>
          </div>
          
        </div>
        
      )}
      
    </div>
  );
}


export default Register;
