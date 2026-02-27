// D:\SalesCRM\frontend\src\main.jsx
/* eslint-disable react-refresh/only-export-components */
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import Login from "./Login.jsx";
import Register from "./Register.jsx";
import { supabase } from "./supabaseClient";

function Root() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("login"); // "login" | "register"

  useEffect(() => {
    // Get current session on load
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session || null);
      setLoading(false);
    };
    getSession();

    // Listen to auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setView("login");
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  if (session) {
    return <App session={session} onLogout={handleLogout} />;
  }

  if (view === "register") {
    return (
      <Register onSwitchToLogin={() => setView("login")} />
    );
  }

  return (
    <Login
      onLogin={setSession}
      onSwitchToRegister={() => setView("register")}
    />
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
