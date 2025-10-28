import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Layout from "./components/Layout";
import MainApp from "./pages/Transcribe";
import ExportedFiles from "./pages/ExportedFiles";
import Login from "./pages/Login";


export default function AppRouter() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    return token && username ? { username, token } : null;
  });

  const handleLogin = (data) => {
    setUser({ username: data.username, token: data.access_token });
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("username", data.username);
  };
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("username");
  };

  return (
    <Router>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<MainApp user={user} />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route
            path="/exported"
            element={
              user ? <ExportedFiles user={user} /> : <Navigate to="/login" />
            }
          />
        </Routes>
      </Layout>
    </Router>
  );
}
