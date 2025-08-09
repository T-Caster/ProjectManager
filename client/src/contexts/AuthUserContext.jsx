import React, { createContext, useContext, useState, useEffect } from "react";
import { initSocket, disconnectSocket } from "../services/socketService";

export const AuthUserContext = createContext(null);

export const useAuthUser = () => useContext(AuthUserContext);

export const AuthUserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      initSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    disconnectSocket();
  };

  return (
    <AuthUserContext.Provider value={{ user, loading, setUser, setLoading, logout }}>
      {children}
    </AuthUserContext.Provider>
  );
};