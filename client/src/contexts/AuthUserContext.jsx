import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { initSocket, disconnectSocket, socket } from "../services/socketService";
import { getCurrentUser } from "../services/authService";

export const AuthUserContext = createContext(null);

export const useAuthUser = () => useContext(AuthUserContext);

export const AuthUserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const syncUser = useCallback(async (showLoading = true) => {
        if (showLoading) {
            setLoading(true);
        }
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
            if (showLoading) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        syncUser();
    }, [syncUser]);

    useEffect(() => {
        if (!socket) return;

        const handleProposalsUpdate = () => {
            syncUser(false);
        };

        socket.on('updateProposals', handleProposalsUpdate);

        return () => {
            if (socket) {
                socket.off('updateProposals', handleProposalsUpdate);
            }
        };
    }, [socket, syncUser]);

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