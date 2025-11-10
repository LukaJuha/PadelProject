import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

export default function GoogleLoginButton({role}) {
  return (
    <div style={{ marginTop: "20px", display: "flex", justifyContent: "center" }}>
      <GoogleLogin
        onSuccess={(res) => {
          const user = jwtDecode(res.credential);
          console.log("Google user:", user);
          console.log("Role: ", role);
          /*
          const response = await fetch("http://localhost:8000/api/auth/google/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            res.credential,
            role,
          }),
        });

        const data = await response.json();
          */
        }}
        onError={() => console.log("Login Failed")}
      />
    </div>
  );
}