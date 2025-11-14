import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import { useContext, useEffect } from "react";
import UserContext from "../user-context";

export default function GoogleLoginButton({ user, setUser }) {
  const [globalUser, setGlobalUser] = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser && storedUser.authenticated) {
      setGlobalUser(storedUser);
    }
  }, []);

  return (
    <div style={{ marginTop: "20px", display: "flex", justifyContent: "center" }}>
      <GoogleLogin
        onSuccess={async (res) => {
          const credential = res.credential;

          const backendURL = (import.meta.env.MODE === 'development') ?  import.meta.env.VITE_API_BASE_URL_LOCAL : import.meta.env.VITE_API_BASE_URL_DEPLOYMENT;
          const checkRes = await fetch(backendURL + "/auth/google/check/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential }),
          });

          const data = await checkRes.json();

          if (checkRes.ok) {
            if (data.exists) {
              const backendURL = (import.meta.env.MODE === 'development') ?  import.meta.env.VITE_API_BASE_URL_LOCAL : import.meta.env.VITE_API_BASE_URL_DEPLOYMENT;
              const loginRes = await fetch(backendURL + "/auth/google/login/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ credential }),
              });
              const loginData = await loginRes.json();

              if (loginRes.ok) {
                setGlobalUser({
                  accessToken: loginData.access,
                  refreshToken: loginData.refresh,
                  email: loginData.user.email,
                  role: loginData.user.role,
                  authenticated: true,
                });
                navigate('/');
              } else {
                alert(loginData.error || "Greška prilikom prijave");
                setUser(null);
              }
            } else {
              setUser({
                ...user,
                credentials: credential,
                email: data.email,
                username: data.name,
                showRoles: true,
              });
            }
          } else {
            alert(data.error || "Greška prilikom Google prijave");
            setUser(null);
          }
        }}
        onError={() => console.log("Login Failed")}
      />
    </div>
  );
}