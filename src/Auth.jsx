import { useState, useEffect } from "react";
import { auth, signInWithGoogle, registerWithEmail, loginWithEmail, logout } from "./auth";
import { onAuthStateChanged } from "firebase/auth";
import "./assets/styles.css";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe(); // Cleanup listener on unmount
  }, []);

  const handleLogin = async (loginMethod) => {
    setLoading(true); // Show loading screen
    await loginMethod();
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <img src="/loading.png" alt="Orbit" className="loading-logo" />
      </div>
    );
  }

  
  return (
    <div className="login-screen">
      <div className="grained" width="100%" height="100%"></div>

      <img src="./toolbar-logo.svg" alt="Orbit Logo" className="login-logo" />
      <div className="login-tab">
        <h2 className="login-head">Sign In</h2>
        <button className="google-signin" onClick={signInWithGoogle}>
          Sign in with Google
        </button>
        <input className="user-cred"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input className="user-cred"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
          <button className="login" onClick={() => loginWithEmail(email, password)}>
            Login
          </button>
          <button className="register" onClick={() => registerWithEmail(email, password)}>
            Register
          </button>
      </div>
    </div>
      )}
