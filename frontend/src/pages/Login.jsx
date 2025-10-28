import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login as apiLogin } from '../api';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const data = await apiLogin(username, password);
      onLogin({ ...data, username });
      navigate("/");
    } catch (err) {
      setError("Login failed");
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Login</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          className="border p-2 rounded"
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          className="border p-2 rounded"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div className="text-red-500">{error}</div>}
        <button className="bg-blue-600 text-white py-2 rounded" type="submit">
          Login
        </button>
      </form>
    </div>
  );
}
