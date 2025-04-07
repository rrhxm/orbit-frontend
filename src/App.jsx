import React from "react";
import ReactDOM from "react-dom/client"; // ✅ Import ReactDOM correctly
import { useState, useEffect } from "react";
import { auth } from "./firebase";
import Auth from "./Auth.jsx";
import Canvas from "./Canvas.jsx";
import "./assets/styles.css";
import { AuthProvider } from "./AuthContext";



export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setLoading(true);
        setTimeout(() => setLoading(false), 3000);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className={`loading-screen ${!loading ? "hidden" : ""}`}>
        <img src="/loading.png" alt="Orbit" className="loading-logo" />
      </div>
    );
  }

  return <>{user ? <Canvas /> : <Auth />}</>;
}
