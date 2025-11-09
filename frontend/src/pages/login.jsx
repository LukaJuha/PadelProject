import "./styles/login.css";
import GoogleLoginButton from "../components/googleOAuthButton";

function Login() {
  return (
    <div className="loginOkvir">
      <h2>Prijava</h2>
      <form className="loginForm">

        <label>Email:</label>
        <input type="email" required className="loginInput"/>

        <label>Šifra:</label>
        <input type="password" required className="loginInput"/>

        <button className="loginButton">Ulogiraj se</button>
        <GoogleLoginButton/>
      </form>
      
    </div>
  );
}


export default Login;
