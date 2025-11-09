import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

export default function GoogleLoginButton() {
  return (
    <div style={{ marginTop: "20px", display: "flex", justifyContent: "center" }}>
      <GoogleLogin
        onSuccess={(res) => {
          const user = jwtDecode(res.credential);
          console.log("Google user:", user);
        }}
        onError={() => console.log("Login Failed")}
      />
    </div>
  );
}