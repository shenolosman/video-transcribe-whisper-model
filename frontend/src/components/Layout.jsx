import React from "react";
import Header from "./Header";

export default function Layout({ user, onLogout, children }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 dark:text-white text-gray-900">
      <Header user={user} onLogout={onLogout} />
      <main className="flex-1 p-4 max-w-3xl mx-auto w-full">{children}</main>
    </div>
  );
}
