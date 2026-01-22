import { useState } from "react";
import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserContext from "../user-context";
import "./styles/register.css"
import GoogleLoginButton from "../components/googleOAuthButton";

function Register() {
  const [user, setUser] = useContext(UserContext);
  const [localUser, setLocalUser] = useState(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const register = (e) => {
    e.preventDefault();
    const form = e.target;
    const username = form[0].value;
    const email = form[1].value;
    const password = form[2].value;
    const confirmPassword = form[3].value;

    if (password !== confirmPassword) {
      alert("Šifre se ne podudaraju!");
      return;
    }

    setLocalUser({
      ...localUser,
      username,
      email,
      password,
      showRoles: true,
    });
  };

  const handleRoleSelection = async (role) => {
    if (!localUser.credentials) {
      try {
        const registerData = {
          email: localUser.email,
          password: localUser.password,
          username: localUser.username,
          role: role.toUpperCase(),
        };

        setLoading(true);
        const backendURL = (import.meta.env.MODE === 'development') ?  import.meta.env.VITE_API_BASE_URL_LOCAL : import.meta.env.VITE_API_BASE_URL_DEPLOYMENT;
        const res = await fetch(backendURL + "/auth/register/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(registerData),
        });
        setLoading(false);

        const data = await res.json();

        if (res.ok) {
          try {
            const loginData = {
              email: localUser.email,
              password: localUser.password
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
              setUser({...localUser, role: role, accessToken: data.access, refreshToken: data.refresh, showRoles: false, authenticated: true});
              navigate("/");
            } else {
              alert(data.error || "Greška prilikom registracije");
              setLocalUser(null);
            }
          } catch (error) {
            console.error(error);
            setLocalUser(null);
          }
        } else {
          alert(data.error || "Greška prilikom registracije");
          setLocalUser(null);
        }
      } catch (error) {
        console.error(error);
        setLocalUser(null);
      }
    } else { // if using Google OAuth
      try {
        const registerData = {
          credential: localUser.credentials,
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
          const newUser = {
            ...localUser, 
            username: localUser.credentials?.name, 
            email: localUser.credentials?.email, 
            accessToken: data.access, 
            refreshToken: data.refresh,
            role: role.toUpperCase(), 
            showRoles: false,
            authenticated: true
          };
          
          setUser(newUser);
          navigate("/");
        } else {
          alert(data.error || "Greška prilikom registracije");
          setLocalUser(null);
        }
      } catch (error) {
        console.error(error);
        setLocalUser(null);
      }
    }
  };

  return (
    <div className="registerOkvir">
      <h2>Registracija</h2>

      {(!localUser?.showRoles) && (
        <div>
          <form className="registerForm" onSubmit={register}>
            <label>Korisničko ime:</label>
            <input type="text" required className="registerInput" value={localUser?.username}
            onChange={(e) => setLocalUser({...localUser, username: e.target.value})} />

            <label>Email:</label>
            <input type="email" required className="registerInput" value={localUser?.email}
            onChange={(e) => setLocalUser({...localUser, email: e.target.value})} />
            <label>Šifra:</label>
            <input type="password" required className="registerInput" value={localUser?.password}
            onChange={(e) => setLocalUser({...localUser, password: e.target.value})} />
            <label>Potvrdi šifru:</label>
            <input type="password" required className="registerInput"/>

            <button className="registerButton">Registriraj se</button>
          </form>
          <GoogleLoginButton user={localUser} setUser={setLocalUser} />
          <label>Imate račun? <a href="/login">Prijavite se</a></label>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="loadingOverlay">
          <img src="/spinner_loading.gif" alt="Loading..." id="loading-gif" />
        </div>
      )}

      {(localUser?.showRoles)  && (
        <div>
          <div>
            <p>Odaberi tip korisnika:</p>
            <button className="register-selectUserButton" onClick={() => handleRoleSelection("Player")}>
              Igrač
            </button>
            <button className="register-selectUserButton" onClick={() => handleRoleSelection("Club")}>
              Klub
            </button>
          </div>
          <button onClick={() => {setLocalUser({ ...localUser, showRoles: false })}}>Povratak</button>
        </div>
      )}
    </div>
  );
}


export default Register;
