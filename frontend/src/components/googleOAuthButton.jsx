import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

export default function GoogleLoginButton({ user, setUser }) {
  const navigate = useNavigate();
  return (
    <div style={{ marginTop: "20px", display: "flex", justifyContent: "center" }}>
      <GoogleLogin
        onSuccess={async (res) => {
          const credential = res.credential;

          const checkRes = await fetch("http://localhost:8000/api/auth/google/check/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential }),
          });

          const data = await checkRes.json();

          if (checkRes.ok) {
            if (data.exists) {
              const registerRes = await fetch("http://localhost:8000/api/auth/google/register/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ credential }),
              });
              const registerData = await registerRes.json();

              if (registerRes.ok) {
                setUser({
                  accessToken: registerData.access,
                  refreshToken: registerData.refresh,
                  email: registerData.user.email,
                  role: registerData.user.role,
                  authenticated: true,
                });
                navigate('/');
              } else {
                alert(registerData.error || "Greška prilikom prijave");
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