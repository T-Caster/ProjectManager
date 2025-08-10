import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { initSocket, disconnectSocket, socket } from "../services/socketService";
import { getCurrentUser } from "../services/authService";

export const AuthUserContext = createContext(null);

export const useAuthUser = () => useContext(AuthUserContext);

export const AuthUserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncUser = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const { data: user } = await getCurrentUser();
        setUser(user);
        initSocket();
      } else {
        setUser(null);
        disconnectSocket();
      }
    } catch (error) {
      console.error("Failed to sync user:", error);
      setUser(null);
      localStorage.removeItem("token");
      disconnectSocket();
    } finally {
      setLoading(false);
    }
  }, []);

  const syncUserWithoutLoading = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const { data: user } = await getCurrentUser();
        setUser(user);
      } else {
        setUser(null);
        disconnectSocket();
      }
    } catch (error) {
      console.error("Failed to sync user:", error);
      setUser(null);
      localStorage.removeItem("token");
      disconnectSocket();
    }
  }, []);

  useEffect(() => {
    syncUser();
  }, [syncUser]);

  useEffect(() => {
    if (!socket) return;

    const handleProposalDecision = () => {
      console.log('proposal decision received, syncing user');
      syncUserWithoutLoading();
    };

    socket.on('my_proposal_approved', handleProposalDecision);
    socket.on('my_proposal_rejected', handleProposalDecision);

    return () => {
      if (socket) {
        socket.off('my_proposal_approved', handleProposalDecision);
        socket.off('my_proposal_rejected', handleProposalDecision);
      }
    };
  }, [socket, syncUserWithoutLoading]);

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    disconnectSocket();
  };

  return (
    <AuthUserContext.Provider value={{ user, loading, setUser, setLoading, logout, syncUser }}>
      {children}
    </AuthUserContext.Provider>
  );
};