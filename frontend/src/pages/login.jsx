import { useState } from "react";
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import UserContext from "../user-context";
import "./styles/login.css";
import GoogleLoginButton from "../components/googleOAuthButton";

function Login() {
  const [user, setUser] = useContext(UserContext);
  const navigate = useNavigate();

  const handleRoleSelection = async (role) => {
    setUser({ ...user, role });
    try {
      const registerData = {
        credential: user.credentials,
        role: role.toUpperCase(),
      };

      const backendURL = (import.meta.env.MODE === 'development') ?  import.meta.env.VITE_API_BASE_URL_LOCAL : import.meta.env.VITE_API_BASE_URL_DEPLOYMENT;
      const res = await fetch(backendURL + "/auth/google/register/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerData),
      });

      const data = await res.json();

      if (res.ok) {
        setUser({
          ...user, 
          username: user.credentials.name, 
          email: user.credentials.email, 
          accessToken: data.access, 
          refreshToken: data.refresh,
          role: role, 
          authenticated: true
        });
        navigate("/");
      } else {
        alert(data.error || "Greška prilikom registracije");
        setUser(null);
      }
    } catch (error) {
      console.error(error);
      setUser(null);
    }
    navigate('/');
  };

  const login = async (e) => {
    e.preventDefault();

    try {
      const loginData = {
        email: user.email,
        password: user.password,
      };

      const backendURL = (import.meta.env.MODE === 'development') ?  import.meta.env.VITE_API_BASE_URL_LOCAL : import.meta.env.VITE_API_BASE_URL_DEPLOYMENT;
      const res = await fetch(backendURL + "/auth/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      });

      const data = await res.json();

      if (res.ok) {
        setUser({...user, accessToken: data.access, refreshToken: data.refresh, role: data.user.role, authenticated: true});
        
        navigate("/");
      } else {
        alert(data.error || "Greška prilikom prijave");
        setUser(null);
      }
    } catch (error) {
      console.error(error);
      setUser(null);
    }
  }

  return (
    <div className="loginOkvir">
      <h2>Prijava</h2>

      {(!user?.showRoles) && (
      <div>
        <form className="loginForm" onSubmit={login}>

          <label>Email:</label>
          <input type="email" required className="loginInput"
          onChange={(e) => setUser({...user, email: e.target.value})} />

          <label>Šifra:</label>
          <input type="password" required className="loginInput" 
          onChange={(e) => setUser({...user, password: e.target.value})} />

          <button className="loginButton">Ulogiraj se</button>
        </form>
        <GoogleLoginButton user={user} setUser={setUser}/>
        <label>Nemate račun? <a href="/register">Registrirajte se</a></label>
      </div>
      )}

      {(user?.showRoles)  && (
        <div>
          <p>Odaberi tip korisnika:</p>
          <button className="register-selectUserButton" onClick={() => handleRoleSelection("Player")}>
            Igrač
          </button>
          <button className="register-selectUserButton" onClick={() => handleRoleSelection("Club")}>
            Klub
          </button>
        </div>
      )}
      
    </div>
  );
}


export default Login;
