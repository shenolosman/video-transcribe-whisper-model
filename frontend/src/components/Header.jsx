
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";


export default function Header({ user, onLogout }) {
  const [dark, setDark] = useState(() => {
    // Check localStorage or system preference
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('theme')) {
        return localStorage.getItem('theme') === 'dark';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  return (
  <header className="bg-background text-foreground shadow px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2 sm:gap-4">
        <span className="font-bold text-lg whitespace-nowrap">Whisper Video Edit App</span>
        <nav className="hidden sm:flex gap-2 sm:gap-4">
          <Link to="/" className="hover:underline">Transcribe</Link>
          <Link to="/exported" className="hover:underline">Exported Files</Link>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <button
          aria-label="Toggle dark mode"
          className="rounded p-2 hover:bg-secondary/20 dark:hover:bg-secondary/40"
          onClick={() => setDark((d) => !d)}
        >
          {dark ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.07l-.71.71M21 12h-1M4 12H3m16.66 5.66l-.71-.71M4.05 4.93l-.71-.71M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" /></svg>
          )}
        </button>
        <nav className="flex gap-2 sm:hidden">
          <Link to="/" className="hover:underline">Transcribe</Link>
          <Link to="/exported" className="hover:underline">Exported Files</Link>
        </nav>
        {user ? (
          <>
            <span className="mr-2 hidden sm:inline">{user.username}</span>
            <button onClick={onLogout} className="bg-primary px-3 py-1 rounded text-white">Logout</button>
          </>
        ) : (
          <Link to="/login" className="bg-primary px-3 py-1 rounded text-white">Login</Link>
        )}
      </div>
    </header>
  );
}
